-- Check for duplicate group_members entries
-- This will show if there are multiple rows with the same group_id and user_id

SELECT 
    group_id, 
    user_id, 
    COUNT(*) as count
FROM group_members
GROUP BY group_id, user_id
HAVING COUNT(*) > 1;

-- If duplicates exist, this will show them
-- Expected result: 0 rows (no duplicates)

-- Also check total group_members
SELECT COUNT(*) as total_members FROM group_members;

-- Check if there are any NULL group_ids or user_ids
SELECT 
    COUNT(*) as null_group_ids
FROM group_members
WHERE group_id IS NULL;

SELECT 
    COUNT(*) as null_user_ids
FROM group_members
WHERE user_id IS NULL;
