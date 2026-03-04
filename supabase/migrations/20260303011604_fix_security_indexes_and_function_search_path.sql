/*
  # Fix security issues: unindexed foreign keys and mutable function search_path

  ## Changes

  ### 1. Index on `room_players.profile_id`
  Adds a covering index for the foreign key `room_players_profile_id_fkey`.
  Prevents sequential scans when looking up all rooms a player has joined.

  ### 2. Index on `rooms.host_profile_id`
  Adds a covering index for the foreign key `rooms_host_profile_id_fkey`.
  Prevents sequential scans when looking up all rooms hosted by a given profile.

  ### 3. Fix `get_next_player_id` search_path
  Recreates the function with `SET search_path = public` to prevent a
  mutable search_path that could be exploited via schema injection.
*/

CREATE INDEX IF NOT EXISTS room_players_profile_id_idx
  ON room_players (profile_id);

CREATE INDEX IF NOT EXISTS rooms_host_profile_id_idx
  ON rooms (host_profile_id);

CREATE OR REPLACE FUNCTION public.get_next_player_id()
  RETURNS text
  LANGUAGE plpgsql
  SET search_path = public
AS $$
DECLARE
  next_val bigint;
BEGIN
  SELECT nextval('player_id_seq') INTO next_val;
  RETURN 'PCH-' || LPAD(next_val::text, 6, '0');
END;
$$;
