/*
  # Enable Supabase Realtime on rooms and room_players

  ## Summary
  Without this migration, all Realtime subscriptions to `rooms` and `room_players`
  are silently ignored because the tables are not part of the supabase_realtime
  publication. This fixes:
    - is_ready changes not propagating to other clients (Ready/Not Ready badge sync)
    - rooms.status change to 'playing' not propagating to clients (Start Game navigation)

  ## Changes

  1. `room_players`
     - Added to `supabase_realtime` publication so INSERT/UPDATE/DELETE events broadcast
     - Set REPLICA IDENTITY FULL so that UPDATE events carry the full row, which allows
       Supabase Realtime to match the `room_id=eq.{roomId}` filter on change events

  2. `rooms`
     - Added to `supabase_realtime` publication so status changes (waiting → playing)
       broadcast to all subscribers watching that room row

  ## Notes
  - These operations are idempotent; running them more than once is safe
  - No data is modified; this is a schema/publication-only change
*/

ALTER TABLE public.room_players REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'room_players'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
  END IF;
END $$;
