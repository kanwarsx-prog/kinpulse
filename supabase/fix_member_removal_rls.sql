-- Fix RLS to allow removing other members

-- Drop the restrictive "self-only" delete policy if it exists
DROP POLICY IF EXISTS "Users can remove themselves from groups" ON group_members;

-- Create a more permissive delete policy
-- Allows a user to delete a member if the authenticated user is ALSO a member of that group
CREATE POLICY "Group members can remove members"
ON group_members
FOR DELETE
USING (
    auth.uid() IN (
        SELECT user_id 
        FROM group_members AS gm 
        WHERE gm.group_id = group_members.group_id
    )
);

-- Ensure insert policy is also correct (existing one looks okay but let's be safe)
DROP POLICY IF EXISTS "Authenticated users can add members" ON group_members;

CREATE POLICY "Group members can add members"
ON group_members
FOR INSERT
WITH CHECK (
    -- Allow if user is adding THEMSELVES (joining)
    auth.uid() = user_id
    OR
    -- OR if the adder is already a member of the group
    auth.uid() IN (
        SELECT user_id 
        FROM group_members 
        WHERE group_id = group_id
    )
    OR
    -- OR if it's a new group creation (no members yet)
    NOT EXISTS (
        SELECT 1 
        FROM group_members AS gm 
        WHERE gm.group_id = group_members.group_id
    )
);
