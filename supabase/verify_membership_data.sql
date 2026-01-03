-- Verify if the user is ACTUALLY in the group they are trying to send to
-- We will list ALL groups the current user is a member of.
-- Since we can't capture auth.uid() in a raw SQL script easily without running it as a function,
-- we will look up the user by email if you know it, OR just list all members of the 'Friends' group.

SELECT 
    g.name, 
    g.id as group_id, 
    gm.user_id 
FROM group_members gm
JOIN groups g ON gm.group_id = g.id
WHERE g.name = 'Friends';

-- Also check policies one more time to be absolutely sure
SELECT * FROM pg_policies WHERE tablename = 'messages';
