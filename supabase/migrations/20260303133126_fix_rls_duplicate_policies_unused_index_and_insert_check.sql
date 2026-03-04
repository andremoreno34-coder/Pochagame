/*
  # Fix RLS duplicate policies, unused index, and unrestricted INSERT check

  ## Summary
  This migration addresses four security/performance advisories:

  1. **Unused index** — Drops `room_players_profile_id_idx` which has never been used
     by any query plan and only wastes write overhead.

  2. **Multiple permissive SELECT policies on `rooms` for `anon`** — The previous
     migration added `"Anon users can view all rooms"` (USING true) which overlaps
     with the pre-existing `"Public rooms visible in lobby"` policy (roles: public,
     which covers both anon and authenticated). Having two permissive policies for
     the same role+action is redundant and triggers the advisory. Dropping
     `"Public rooms visible in lobby"` removes the overlap; the broad `USING (true)`
     policies for anon and authenticated already cover all required access.

  3. **Multiple permissive SELECT policies on `rooms` for `authenticated`** — Same
     root cause as above; fixed by the same drop.

  4. **RLS INSERT policy `WITH CHECK (true)` on `room_players`** — Unrestricted
     insert was flagged as bypassing row-level security. Replaced with a meaningful
     check: the target room must exist and must currently be in `waiting` status.
     This prevents inserts into non-existent rooms or rooms that are already
     playing/finished, without requiring Supabase Auth (which this app does not use).

  ## Changes
  - DROP index `room_players_profile_id_idx`
  - DROP policy `"Public rooms visible in lobby"` on `rooms`
  - DROP then re-CREATE policy `"Anon users can insert into room_players"` with
    a restrictive `WITH CHECK` clause
*/

DROP INDEX IF EXISTS public.room_players_profile_id_idx;

DROP POLICY IF EXISTS "Public rooms visible in lobby" ON public.rooms;

DROP POLICY IF EXISTS "Anon users can insert into room_players" ON public.room_players;

CREATE POLICY "Anon users can insert into room_players"
  ON public.room_players FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE id = room_id AND status = 'waiting'
    )
  );
