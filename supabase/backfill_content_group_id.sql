-- Backfill group_id for existing content
-- This assigns existing family content to the corresponding group

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
-- For each message with family_id but no group_id, find the corresponding group
UPDATE messages m
SET group_id = g.id
FROM groups g
WHERE m.family_id = g.family_id
  AND m.group_id IS NULL
  AND g.family_id IS NOT NULL;

-- Backfill pulses
UPDATE pulses p
SET group_id = g.id
FROM groups g
WHERE p.family_id = g.family_id
  AND p.group_id IS NULL
  AND g.family_id IS NOT NULL;

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
