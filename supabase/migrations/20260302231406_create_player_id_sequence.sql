/*
  # Create Player ID Sequence

  ## Summary
  Sets up a global sequential counter for player IDs and an RPC function to obtain the next value.

  ## New Objects

  ### Sequences
  - `player_id_seq` — Global sequence starting at 1, incremented by 1 with no min/max limits.
    Each call to `nextval` returns a unique, ever-increasing integer.

  ### Functions
  - `public.get_next_player_id()` — Returns the next value from `player_id_seq` as a bigint.
    Called via `supabase.rpc('get_next_player_id')` from the frontend to generate PCH-XXXXXX IDs.

  ## Notes
  1. The sequence is not tied to any table — it is a standalone global counter.
  2. Sequence values are never reused, even on error or rollback, ensuring no two players ever share the same number.
  3. The function is accessible to all roles including `anon` and `authenticated` so that the frontend can call it during registration without requiring a service-role key.
*/

CREATE SEQUENCE IF NOT EXISTS player_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE OR REPLACE FUNCTION public.get_next_player_id()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT nextval('player_id_seq');
$$;

GRANT EXECUTE ON FUNCTION public.get_next_player_id() TO anon, authenticated;
