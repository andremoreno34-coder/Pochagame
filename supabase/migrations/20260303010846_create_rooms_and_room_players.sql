/*
  # Create rooms and room_players tables

  ## Summary
  Adds the core multiplayer lobby infrastructure: a `rooms` table for online game
  sessions and a `room_players` table for tracking which players are in each room.

  ## New Tables

  ### `rooms`
  Represents an online game session/lobby.
  - `id` (uuid, PK) - unique room identifier
  - `created_at` (timestamptz) - creation timestamp
  - `status` (text) - 'waiting' | 'playing' | 'finished'
  - `host_profile_id` (uuid, FK → profiles.id) - player who created the room
  - `max_players` (integer) - capacity limit
  - `name` (text, nullable) - display name
  - `dev_only` (boolean) - true when host has dev_mode enabled
  - `max_cards_per_player` (integer) - game config
  - `round_mode` (text) - 'ascending' | 'descending' | 'combined'
  - `renuncio_mode_enabled` (boolean) - penalty mode toggle

  ### `room_players`
  Tracks which profiles are seated in each room.
  - `id` (uuid, PK)
  - `room_id` (uuid, FK → rooms.id CASCADE) - owning room
  - `profile_id` (uuid, FK → profiles.id) - the player
  - `seat_index` (integer, nullable) - 0-based seat; 0 is the host
  - `is_ready` (boolean) - player ready toggle
  - `joined_at` (timestamptz)

  ## Constraints
  - UNIQUE(room_id, profile_id) - no duplicate joins
  - UNIQUE(room_id, seat_index) - one player per seat

  ## Security
  - RLS enabled on both tables
  - SELECT open to authenticated users (required for Realtime subscriptions)
  - All writes go through the service-role edge function `/functions/v1/room`

  ## Notes
  1. `status` is constrained to ('waiting', 'playing', 'finished').
  2. `round_mode` is constrained to ('ascending', 'descending', 'combined').
  3. Deleting a room cascades to its room_players rows.
*/

CREATE TABLE IF NOT EXISTS rooms (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  status                text NOT NULL DEFAULT 'waiting'
                          CHECK (status IN ('waiting', 'playing', 'finished')),
  host_profile_id       uuid NOT NULL REFERENCES profiles(id),
  max_players           integer NOT NULL DEFAULT 4,
  name                  text,
  dev_only              boolean NOT NULL DEFAULT false,
  max_cards_per_player  integer NOT NULL DEFAULT 10,
  round_mode            text NOT NULL DEFAULT 'ascending'
                          CHECK (round_mode IN ('ascending', 'descending', 'combined')),
  renuncio_mode_enabled boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS room_players (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  profile_id  uuid NOT NULL REFERENCES profiles(id),
  seat_index  integer,
  is_ready    boolean NOT NULL DEFAULT false,
  joined_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, profile_id),
  UNIQUE (room_id, seat_index)
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all rooms"
  ON rooms FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view all room_players"
  ON room_players FOR SELECT
  TO authenticated
  USING (true);
