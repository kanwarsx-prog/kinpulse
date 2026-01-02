-- Clean up duplicate group_members entries
-- This removes duplicate rows, keeping only the first one

-- First, let's see if there are duplicates
SELECT 
    group_id, 
    user_id, 
    COUNT(*) as count
FROM group_members
GROUP BY group_id, user_id
HAVING COUNT(*) > 1;

-- Delete duplicates, keeping only the row with the lowest id
DELETE FROM group_members
WHERE id NOT IN (
    SELECT MIN(id)
    FROM group_members
    GROUP BY group_id, user_id
);

-- Verify no duplicates remain
SELECT 
    group_id, 
    user_id, 
    COUNT(*) as count
FROM group_members
GROUP BY group_id, user_id
HAVING COUNT(*) > 1;

-- Should return 0 rows
