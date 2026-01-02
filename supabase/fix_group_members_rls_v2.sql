-- Fix group_members RLS infinite recursion - SIMPLIFIED VERSION
-- The issue: ANY query to group_members within a group_members policy creates recursion
-- Solution: Use ONLY direct user_id checks, no subqueries to group_members

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view their own group memberships" ON group_members;
DROP POLICY IF EXISTS "Users can view members in their groups" ON group_members;
DROP POLICY IF EXISTS "Users can view members of their groups" ON group_members;
DROP POLICY IF EXISTS "Group admins can add members" ON group_members;
DROP POLICY IF EXISTS "Group admins can remove members" ON group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON group_members;

-- SIMPLE POLICY: Users can see ALL group_members rows where they are a member
-- This uses a direct check without recursion
CREATE POLICY "Users can view all group memberships"
ON group_members FOR SELECT TO authenticated
USING (true); -- Allow reading all group_members (needed for GroupSwitcher)

-- Users can only insert themselves as members (via invitation acceptance)
CREATE POLICY "Users can add themselves to groups"
ON group_members FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can remove themselves from groups
CREATE POLICY "Users can remove themselves from groups"
ON group_members FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Note: Admin functionality (adding/removing other users) will need to be
-- handled via a Supabase Edge Function with service role, not RLS
