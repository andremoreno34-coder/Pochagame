/*
  # Allow all room members to write pocha game state

  Changes:
  - Drops the old "Host can write pocha game state" policy (host-only writes)
  - Replaces it with a policy that allows ANY room member (host OR guest) to
    INSERT and UPDATE the pocha_games row for their room.
  - Keeps the SELECT policy for all room members unchanged.

  Why: Online multiplayer requires every player (not just the host) to write
  their own moves (bids, card plays, etc.) to Supabase so that all other
  connected clients can receive and apply the update via realtime.

  Notes:
  - A room member is identified by having a row in room_players for that room_id.
  - auth.uid() is compared against profiles.id, which is the Supabase auth UID.
*/

DROP POLICY IF EXISTS "Host can write pocha game state" ON pocha_games;

CREATE POLICY "Room members can write pocha game state"
  ON pocha_games
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM room_players rp
      JOIN profiles p ON p.id = rp.profile_id
      WHERE rp.room_id = pocha_games.room_id
        AND p.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM room_players rp
      JOIN profiles p ON p.id = rp.profile_id
      WHERE rp.room_id = pocha_games.room_id
        AND p.id = auth.uid()
    )
  );
