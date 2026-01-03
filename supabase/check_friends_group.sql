-- Show all members of the "Friends" group

SELECT 
    g.name as group_name,
    g.icon,
    p.email,
    p.name as user_name,
    gm.role,
    gm.joined_at
FROM groups g
JOIN group_members gm ON g.id = gm.group_id
JOIN profiles p ON gm.user_id = p.id
WHERE g.name = 'Friends'
ORDER BY gm.joined_at;

-- Also show all groups and their member counts
SELECT 
    g.name,
    g.icon,
    COUNT(gm.user_id) as member_count
FROM groups g
LEFT JOIN group_members gm ON g.id = gm.group_id
GROUP BY g.id, g.name, g.icon
ORDER BY g.created_at;
