/*
  # Add anon RLS policies for rooms and room_players

  ## Summary
  The frontend Supabase client uses the anonymous (anon) key without Supabase Auth,
  meaning all requests run as the `anon` role. The existing SELECT policies were
  restricted to the `authenticated` role only, making room detail pages and the
  player list invisible to the frontend client.

  This migration:
  1. Adds SELECT policies for the `anon` role on both `rooms` and `room_players`
     so the frontend can read room state and player lists.
  2. Adds an INSERT policy for the `anon` role on `room_players` so the frontend
     Supabase client can insert a player row directly (used for host redundancy
     after room creation and for auto-joining when navigating to a room URL).

  ## Changes

  ### rooms
  - New SELECT policy for `anon` — allows reading all rooms

  ### room_players
  - New SELECT policy for `anon` — allows reading all room_players rows
  - New INSERT policy for `anon` — allows inserting a row into room_players

  ## Notes
  1. The existing `authenticated` SELECT policies are kept intact; this migration
     only adds the parallel `anon` policies.
  2. The INSERT policy uses `WITH CHECK (true)` since the app does not use
     Supabase Auth (auth.uid() is always NULL), so row-level ownership cannot
     be enforced at the database layer. Application-level guards in the edge
     function remain the authoritative validation for writes.
  3. The `room_players` table has a UNIQUE constraint on (room_id, profile_id),
     so duplicate joins are automatically prevented at the database level
     regardless of the permissive INSERT policy.
*/

CREATE POLICY "Anon users can view all rooms"
  ON rooms FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can view all room_players"
  ON room_players FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon users can insert into room_players"
  ON room_players FOR INSERT
  TO anon
  WITH CHECK (true);
