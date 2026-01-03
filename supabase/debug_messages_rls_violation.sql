-- Check active policies on messages
select * from pg_policies where tablename = 'messages';

-- Check group membership for the specific user (we can't know the exact ID easily without auth.uid, but we can dump for a known user if we knew it, or just dump all to see structure)
-- Let's just check the structure and a few rows
SELECT * FROM group_members LIMIT 10;

-- Check if there are any triggers that might be interfering
SELECT event_object_table, trigger_name, action_statement FROM information_schema.triggers WHERE event_object_table = 'messages';
