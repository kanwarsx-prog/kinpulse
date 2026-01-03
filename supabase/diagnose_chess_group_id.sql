-- Diagnostic: Check chess_games group_id status

-- 1. Check if group_id column exists and its values
SELECT 
    id,
    white_player_id,
    black_player_id,
    group_id,
    status,
    created_at
FROM chess_games
ORDER BY created_at DESC
LIMIT 10;

-- 2. Count games by group_id
SELECT 
    group_id,
    COUNT(*) as game_count,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_games
FROM chess_games
GROUP BY group_id;

-- 3. Check for games with NULL group_id
SELECT COUNT(*) as games_without_group
FROM chess_games
WHERE group_id IS NULL;

-- 4. Check what groups the current user belongs to
SELECT 
    g.id as group_id,
    g.name as group_name,
    gm.role
FROM groups g
JOIN group_members gm ON g.id = gm.group_id
WHERE gm.user_id = auth.uid();

-- 5. Check RLS policies on chess_games
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'chess_games';
