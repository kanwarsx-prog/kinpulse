-- Multi-Group Feature - Add group_id to Content Tables
-- Phase 3: Add group_id column to all content tables for group-based filtering

-- IMPORTANT: Run this AFTER create_groups_schema.sql

-- 1. Add group_id to photos table
ALTER TABLE photos 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id);

CREATE INDEX IF NOT EXISTS idx_photos_group ON photos(group_id);

-- 2. Add group_id to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id);

CREATE INDEX IF NOT EXISTS idx_messages_group ON messages(group_id);

-- 3. Add group_id to poker_tables table
ALTER TABLE poker_tables 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id);

CREATE INDEX IF NOT EXISTS idx_poker_tables_group ON poker_tables(group_id);

-- 4. Add group_id to chess_games table
ALTER TABLE chess_games 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id);

CREATE INDEX IF NOT EXISTS idx_chess_games_group ON chess_games(group_id);

-- 5. Add group_id to pulses table
ALTER TABLE pulses 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id);

CREATE INDEX IF NOT EXISTS idx_pulses_group ON pulses(group_id);

-- 6. Add group_id to calendar_events table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_events') THEN
        ALTER TABLE calendar_events 
        ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id);
        
        CREATE INDEX IF NOT EXISTS idx_calendar_events_group ON calendar_events(group_id);
    END IF;
END $$;

-- 7. Add group_id to reactions table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reactions') THEN
        ALTER TABLE reactions 
        ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id);
        
        CREATE INDEX IF NOT EXISTS idx_reactions_group ON reactions(group_id);
    END IF;
END $$;

-- 8. Add group_id to poker_hands table
ALTER TABLE poker_hands 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id);

CREATE INDEX IF NOT EXISTS idx_poker_hands_group ON poker_hands(group_id);

-- 9. Add group_id to poker_seats table
ALTER TABLE poker_seats 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id);

CREATE INDEX IF NOT EXISTS idx_poker_seats_group ON poker_seats(group_id);

-- 10. Add group_id to poker_actions table
ALTER TABLE poker_actions 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id);

CREATE INDEX IF NOT EXISTS idx_poker_actions_group ON poker_actions(group_id);

-- 11. Add group_id to chess_moves table
ALTER TABLE chess_moves 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id);

CREATE INDEX IF NOT EXISTS idx_chess_moves_group ON chess_moves(group_id);

-- 12. Add group_id to chess_board_states table
ALTER TABLE chess_board_states 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id);

CREATE INDEX IF NOT EXISTS idx_chess_board_states_group ON chess_board_states(group_id);

-- Comments
COMMENT ON COLUMN photos.group_id IS 'The group this photo belongs to';
COMMENT ON COLUMN messages.group_id IS 'The group this message belongs to';
COMMENT ON COLUMN poker_tables.group_id IS 'The group this poker table belongs to';
COMMENT ON COLUMN chess_games.group_id IS 'The group this chess game belongs to';
COMMENT ON COLUMN pulses.group_id IS 'The group this pulse belongs to';

-- Verification
SELECT 
    'group_id columns added' as status,
    (SELECT COUNT(*) FROM information_schema.columns WHERE column_name = 'group_id') as total_columns;
