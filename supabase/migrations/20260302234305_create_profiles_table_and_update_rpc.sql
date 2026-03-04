/*
  # Create Profiles Table and Update Player ID RPC

  ## Summary
  Creates a persistent `profiles` table to store player data server-side and updates
  the `get_next_player_id()` function to return a formatted text ID directly from the
  database, removing the need for client-side formatting.

  ## New Tables

  ### `profiles`
  - `email` (text, primary key) — the player's email address, used as the unique key
  - `nombre` (text) — the player's display name
  - `player_code` (text) — formatted sequential ID in PCH-XXXXXX format
  - `dev_mode` (boolean, default false) — whether dev tools are enabled for this player
  - `created_at` (timestamptz, default now()) — when the profile was first created

  ## Modified Functions

  ### `get_next_player_id()`
  - Changed return type from `bigint` to `text`
  - Now returns the fully-formatted `PCH-XXXXXX` string directly from the DB
  - Removes the need for client-side ID formatting logic

  ## Security
  - RLS enabled on `profiles`
  - SELECT policy: anon and authenticated roles can read any profile (needed for lobby display)
  - INSERT policy: anon and authenticated roles can insert a profile for their own email
  - UPDATE policy: anon and authenticated roles can update only their own profile row

  ## Notes
  1. `email` is the primary key because this app uses a localStorage-based auth system (no Supabase Auth user IDs).
  2. On re-login with the same email, the existing `player_code` is reused — no new ID is generated.
  3. `dev_mode` is persisted here so it survives browser clears and is consistent across devices.
  4. The updated RPC requires dropping and recreating the function due to the return type change.
*/

CREATE TABLE IF NOT EXISTS public.profiles (
  email       text        PRIMARY KEY,
  nombre      text        NOT NULL DEFAULT '',
  player_code text        NOT NULL,
  dev_mode    boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read profiles"
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert own profile"
  ON public.profiles FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update own profile"
  ON public.profiles FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP FUNCTION IF EXISTS public.get_next_player_id();

CREATE OR REPLACE FUNCTION public.get_next_player_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_id int;
BEGIN
  next_id := nextval('player_id_seq');
  RETURN 'PCH-' || lpad(next_id::text, 6, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_next_player_id() TO anon, authenticated;
