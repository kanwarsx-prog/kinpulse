-- Check and add missing foreign keys for chess tables

-- Add foreign keys if they don't exist
DO $$ 
BEGIN
    -- Add foreign key for white_player_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chess_games_white_player_fkey'
    ) THEN
        ALTER TABLE chess_games 
        ADD CONSTRAINT chess_games_white_player_fkey 
        FOREIGN KEY (white_player_id) REFERENCES profiles(id);
    END IF;

    -- Add foreign key for black_player_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chess_games_black_player_fkey'
    ) THEN
        ALTER TABLE chess_games 
        ADD CONSTRAINT chess_games_black_player_fkey 
        FOREIGN KEY (black_player_id) REFERENCES profiles(id);
    END IF;

    -- Add foreign key for family_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chess_games_family_fkey'
    ) THEN
        ALTER TABLE chess_games 
        ADD CONSTRAINT chess_games_family_fkey 
        FOREIGN KEY (family_id) REFERENCES families(id);
    END IF;
END $$;
