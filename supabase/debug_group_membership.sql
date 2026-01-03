-- Dump groups and members to debug RLS failure
-- Corrected: Removed non-existent 'type' column

-- 1. List all groups
SELECT * FROM groups;

-- 2. List all group members with user details
SELECT 
    gm.group_id,
    g.name as group_name,
    gm.user_id,
    p.email,
    gm.role
FROM group_members gm
JOIN groups g ON gm.group_id = g.id
JOIN profiles p ON gm.user_id = p.id
ORDER BY g.name;

-- 3. Check the specific RLS policy content for messages (specifically WITH_CHECK)
SELECT policyname, cmd, roles, with_check 
FROM pg_policies 
WHERE tablename = 'messages';
