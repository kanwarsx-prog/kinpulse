-- Move all content from Friends group to Family group
-- This fixes the backfill that assigned content to the wrong group

-- First, let's see what groups you have
SELECT id, name FROM groups;

-- Check current distribution of pulses
SELECT 
    g.name as group_name,
    COUNT(p.id) as pulse_count
FROM pulses p
JOIN groups g ON p.group_id = g.id
GROUP BY g.name;

-- Check current distribution of messages
SELECT 
    g.name as group_name,
    COUNT(m.id) as message_count
FROM messages m
JOIN groups g ON m.group_id = g.id
GROUP BY g.name;

-- Move all pulses from Friends to Family
-- Replace 'Friends' and 'Family' with your actual group names if different
UPDATE pulses
SET group_id = (SELECT id FROM groups WHERE name = 'Family')
WHERE group_id = (SELECT id FROM groups WHERE name = 'Friends');

-- Move all messages from Friends to Family
UPDATE messages
SET group_id = (SELECT id FROM groups WHERE name = 'Family')
WHERE group_id = (SELECT id FROM groups WHERE name = 'Friends');

-- Verify the move
SELECT 
    g.name as group_name,
    COUNT(p.id) as pulse_count
FROM pulses p
JOIN groups g ON p.group_id = g.id
GROUP BY g.name;

SELECT 
    g.name as group_name,
    COUNT(m.id) as message_count
FROM messages m
JOIN groups g ON m.group_id = g.id
GROUP BY g.name;
