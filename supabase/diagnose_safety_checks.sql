-- Comprehensive Audit to explain the "Row-Level Security" error

-- 1. Check if the "Friends" group exists and retrieve its ID
SELECT * FROM groups WHERE name = 'Friends';

-- 2. Check if the current user is actually in that group (LIMIT 20 to see recent adds)
-- Note: We can't filter by your specific ID efficiently without knowing it, 
-- but listing members of the Friends group will help.
SELECT 
    gm.user_id, 
    p.email, 
    gm.role, 
    g.name 
FROM group_members gm
JOIN groups g ON gm.group_id = g.id
JOIN profiles p ON gm.user_id = p.id
WHERE g.name = 'Friends';

-- 3. Get the definition of the trigger that runs on every message
-- If this trigger crashes, the database reports "Security Policy Violation" or similar generic errors.
select pg_get_functiondef('notify_new_family_message'::regproc);

-- 4. Double check if there are any specific policies for the table excluding the one we just made
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'messages';
