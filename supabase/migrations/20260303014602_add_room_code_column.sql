/*
  # Add code column to rooms table

  ## Summary
  Adds a unique, human-readable invite code to each room. This code is used to
  allow players to join private rooms without the room appearing in the public list.

  ## Changes

  ### Modified Tables
  - `rooms`
    - New column `code` (TEXT, NOT NULL, UNIQUE): a 6-character alphanumeric code
      auto-generated for each room. Uses uppercase letters (excluding I, O) and digits
      (excluding 0, 1) to avoid ambiguity.

  ## Notes
  1. Existing rooms receive a randomly generated code on migration.
  2. The column is added as nullable first, populated, then set to NOT NULL.
  3. A unique constraint ensures no two rooms share the same code.
*/

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS code TEXT;

DO $$
DECLARE
  r RECORD;
  new_code TEXT;
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i INT;
BEGIN
  FOR r IN SELECT id FROM rooms WHERE code IS NULL LOOP
    LOOP
      new_code := '';
      FOR i IN 1..6 LOOP
        new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
      END LOOP;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM rooms WHERE code = new_code);
    END LOOP;
    UPDATE rooms SET code = new_code WHERE id = r.id;
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'rooms' AND constraint_name = 'rooms_code_unique'
  ) THEN
    ALTER TABLE rooms ADD CONSTRAINT rooms_code_unique UNIQUE (code);
  END IF;
END $$;

ALTER TABLE rooms ALTER COLUMN code SET NOT NULL;
