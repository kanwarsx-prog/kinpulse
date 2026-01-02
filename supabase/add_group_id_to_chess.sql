-- Add group_id to chess tables
-- This allows chess games to be scoped to groups

-- Add group_id to chess_games table
ALTER TABLE chess_games 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_chess_games_group_id ON chess_games(group_id);

-- Backfill existing games to creator's first group
UPDATE chess_games cg
SET group_id = (
    SELECT gm.group_id 
    FROM group_members gm 
    WHERE gm.user_id = cg.white_player_id 
    ORDER BY gm.joined_at ASC 
    LIMIT 1
)
WHERE cg.group_id IS NULL
  AND cg.white_player_id IS NOT NULL;

-- Verify the migration
SELECT 
    COUNT(*) as total_games,
    COUNT(group_id) as with_group_id,
    COUNT(*) - COUNT(group_id) as missing_group_id
FROM chess_games;
