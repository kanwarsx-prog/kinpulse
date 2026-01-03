-- Fix RLS policies for group_invitations to allow invite code lookups

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Anyone can read active invite codes" ON group_invitations;
DROP POLICY IF EXISTS "Users can read invitations for their groups" ON group_invitations;
DROP POLICY IF EXISTS "Group members can create invitations" ON group_invitations;
DROP POLICY IF EXISTS "Inviters can update own invitations" ON group_invitations;
DROP POLICY IF EXISTS "Inviters can delete own invitations" ON group_invitations;
DROP POLICY IF EXISTS "Users can view group invitations" ON group_invitations;
DROP POLICY IF EXISTS "Users can create group invitations" ON group_invitations;
DROP POLICY IF EXISTS "Users can update own invitations" ON group_invitations;
DROP POLICY IF EXISTS "Users can delete own invitations" ON group_invitations;

-- Allow anyone (even unauthenticated) to read active invite codes
-- This is necessary for the join flow where new users need to validate codes
CREATE POLICY "Anyone can read active invite codes"
ON group_invitations
FOR SELECT
USING (
    is_active = true 
    AND invite_code IS NOT NULL
);

-- Allow users to read all invitations for groups they belong to
CREATE POLICY "Users can read invitations for their groups"
ON group_invitations
FOR SELECT
USING (
    auth.uid() IN (
        SELECT user_id 
        FROM group_members 
        WHERE group_id = group_invitations.group_id
    )
);

-- Allow group members to create invitations for their groups
CREATE POLICY "Group members can create invitations"
ON group_invitations
FOR INSERT
WITH CHECK (
    auth.uid() IN (
        SELECT user_id 
        FROM group_members 
        WHERE group_id = group_invitations.group_id
    )
);

-- Allow inviters to update their own invitations
CREATE POLICY "Inviters can update own invitations"
ON group_invitations
FOR UPDATE
USING (inviter_id = auth.uid())
WITH CHECK (inviter_id = auth.uid());

-- Allow inviters to delete their own invitations
CREATE POLICY "Inviters can delete own invitations"
ON group_invitations
FOR DELETE
USING (inviter_id = auth.uid());
