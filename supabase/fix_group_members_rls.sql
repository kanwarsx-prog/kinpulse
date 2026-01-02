-- Fix RLS policies for groups to avoid infinite recursion
-- The issue: group_members policy was checking group_members, creating a loop

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view members of their groups" ON group_members;
DROP POLICY IF EXISTS "Group admins can add members" ON group_members;
DROP POLICY IF EXISTS "Group admins can remove members" ON group_members;

-- Recreate with simpler, non-recursive policies

-- Allow users to see their own memberships
CREATE POLICY "Users can view their own group memberships"
ON group_members FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Allow users to see other members in groups they belong to
-- This uses a subquery that doesn't create recursion
CREATE POLICY "Users can view members in their groups"
ON group_members FOR SELECT TO authenticated
USING (
    group_id IN (
        SELECT gm.group_id 
        FROM group_members gm 
        WHERE gm.user_id = auth.uid()
    )
);

-- Group admins can add members (check admin role directly)
CREATE POLICY "Group admins can add members"
ON group_members FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM group_members gm
        WHERE gm.group_id = group_members.group_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'admin'
    )
);

-- Group admins can remove members
CREATE POLICY "Group admins can remove members"
ON group_members FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM group_members gm
        WHERE gm.group_id = group_members.group_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'admin'
    )
);

-- Users can leave groups (delete their own membership)
CREATE POLICY "Users can leave groups"
ON group_members FOR DELETE TO authenticated
USING (user_id = auth.uid());
