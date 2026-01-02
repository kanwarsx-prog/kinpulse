-- Backfill group_id for existing content
-- This assigns existing content to each user's first group

-- First, let's see what we're working with
SELECT 
    'messages' as table_name,
    COUNT(*) as total_rows,
    COUNT(group_id) as with_group_id,
    COUNT(*) - COUNT(group_id) as missing_group_id
FROM messages
UNION ALL
SELECT 
    'pulses' as table_name,
    COUNT(*) as total_rows,
    COUNT(group_id) as with_group_id,
    COUNT(*) - COUNT(group_id) as missing_group_id
FROM pulses;

-- Backfill messages
-- For each message without group_id, assign it to the sender's first group
UPDATE messages m
SET group_id = (
    SELECT gm.group_id 
    FROM group_members gm 
    WHERE gm.user_id = m.user_id 
    ORDER BY gm.joined_at ASC 
    LIMIT 1
)
WHERE m.group_id IS NULL
  AND m.user_id IS NOT NULL;

-- Backfill pulses
-- For each pulse without group_id, assign it to the user's first group
UPDATE pulses p
SET group_id = (
    SELECT gm.group_id 
    FROM group_members gm 
    WHERE gm.user_id = p.user_id 
    ORDER BY gm.joined_at ASC 
    LIMIT 1
)
WHERE p.group_id IS NULL
  AND p.user_id IS NOT NULL;

-- Verify the backfill
SELECT 
    'messages' as table_name,
    COUNT(*) as total_rows,
    COUNT(group_id) as with_group_id,
    COUNT(*) - COUNT(group_id) as missing_group_id
FROM messages
UNION ALL
SELECT 
    'pulses' as table_name,
    COUNT(*) as total_rows,
    COUNT(group_id) as with_group_id,
    COUNT(*) - COUNT(group_id) as missing_group_id
FROM pulses;
