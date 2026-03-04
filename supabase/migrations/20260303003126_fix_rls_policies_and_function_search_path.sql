/*
  # Fix RLS Policies and Function Search Path

  ## Summary
  Addresses three security advisories reported by the Supabase security linter:

  1. **Function Search Path Mutable** — `get_next_player_id` is a SECURITY DEFINER function
     without a fixed search_path, making it vulnerable to search_path hijacking attacks.
     Fixed by pinning the search_path to `public, pg_temp`.

  2. **RLS Policy Always True (INSERT)** — The "Anyone can insert own profile" policy used
     `WITH CHECK (true)`, allowing any user to insert any row without restriction.
     Dropped in favour of routing all writes through the `profile` edge function which
     uses the service-role key and enforces application-level rules.

  3. **RLS Policy Always True (UPDATE)** — The "Anyone can update own profile" policy used
     `USING (true) WITH CHECK (true)`, allowing any user to update any row.
     Dropped for the same reason as above.

  ## Changes

  ### Modified Functions
  - `public.get_next_player_id()` — search_path pinned to `public, pg_temp`

  ### Removed Policies
  - `Anyone can insert own profile` (INSERT, always true) on `public.profiles`
  - `Anyone can update own profile` (UPDATE, always true) on `public.profiles`

  ## Notes
  1. The SELECT policy ("Anyone can read profiles") is intentionally kept open because
     the lobby needs to read profile names and player codes for all players.
  2. INSERT and UPDATE on `profiles` are now exclusively performed by the `profile`
     edge function using the service-role key, which bypasses RLS entirely and enforces
     application-level access control.
*/

ALTER FUNCTION public.get_next_player_id() SET search_path = public, pg_temp;

DROP POLICY IF EXISTS "Anyone can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can update own profile" ON public.profiles;
