-- Diagnostic: Check all groups and memberships

-- 1. Show all groups that exist
SELECT 
    id,
    name,
    icon,
    created_by,
    created_at
FROM groups
ORDER BY created_at DESC;

-- 2. Show all group memberships
SELECT 
    g.name as group_name,
    p.email as member_email,
    p.name as member_name,
    gm.role,
    gm.joined_at
FROM group_members gm
JOIN groups g ON gm.group_id = g.id
JOIN profiles p ON gm.user_id = p.id
ORDER BY g.name, gm.joined_at;

-- 3. Show groups with member counts
SELECT 
    g.name,
    g.icon,
    COUNT(gm.user_id) as member_count,
    STRING_AGG(p.email, ', ') as members
FROM groups g
LEFT JOIN group_members gm ON g.id = gm.group_id
LEFT JOIN profiles p ON gm.user_id = p.id
GROUP BY g.id, g.name, g.icon
ORDER BY g.created_at DESC;
