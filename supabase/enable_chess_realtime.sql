-- Enable Realtime for Chess Tables
-- This allows real-time subscriptions to work for opponent move updates

-- Enable realtime publication for chess tables
ALTER PUBLICATION supabase_realtime ADD TABLE chess_games;
ALTER PUBLICATION supabase_realtime ADD TABLE chess_moves;
ALTER PUBLICATION supabase_realtime ADD TABLE chess_board_states;

-- Verify realtime is enabled
-- You can check in Supabase Dashboard > Database > Replication
-- Make sure these tables are listed under "Source" for supabase_realtime publication
