/*
  # Add UUID id column to profiles table

  ## Summary
  The profiles table currently uses email as its primary key. This migration adds
  a UUID `id` column to serve as a stable, non-PII identifier for use in
  foreign key relationships (e.g., rooms, room_players).

  ## Changes to `profiles`
  - Add `id` (uuid, NOT NULL, unique) with default `gen_random_uuid()`
  - Populate `id` for any existing rows that don't have one yet
  - Add a unique index on `id` for fast lookups and FK support

  ## Notes
  1. The email column remains the primary key — this is a non-breaking addition.
  2. Any new profile rows will automatically get a UUID assigned.
  3. The edge function already returns the full profile row via SELECT, so
     `id` will be included in POST/PATCH responses automatically.
*/

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();

UPDATE profiles SET id = gen_random_uuid() WHERE id IS NULL;

ALTER TABLE profiles ALTER COLUMN id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_id_unique_idx ON profiles(id);
