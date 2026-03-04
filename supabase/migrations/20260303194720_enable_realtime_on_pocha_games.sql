/*
  # Enable Realtime on pocha_games

  Adds the pocha_games table to the Supabase realtime publication so that
  all connected clients receive live UPDATE events when game state changes.
  This is required for guests to receive the host's moves in real time.
*/
ALTER PUBLICATION supabase_realtime ADD TABLE pocha_games;
