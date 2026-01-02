-- Make family_id nullable in chess_games table
-- This allows chess games to work with group_id instead

-- Make family_id nullable
ALTER TABLE chess_games 
ALTER COLUMN family_id DROP NOT NULL;

-- Verify the change
SELECT 
    column_name, 
    is_nullable,
    data_type
FROM information_schema.columns 
WHERE table_name = 'chess_games' 
  AND column_name IN ('family_id', 'group_id');
