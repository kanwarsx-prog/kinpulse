-- Fix group_members RLS to allow adding members from Admin Console
-- The issue: Only group admins can add members, but Admin Console needs to add anyone

-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Users can add themselves to groups" ON group_members;
DROP POLICY IF EXISTS "Group admins can add members" ON group_members;

-- Allow any authenticated user to add members (for Admin Console)
-- In production, you might want to restrict this to actual admins only
CREATE POLICY "Authenticated users can add members"
ON group_members FOR INSERT TO authenticated
WITH CHECK (true);

-- Keep the delete policies as they were
-- Users can still remove themselves, and we'll rely on app logic for admin removal
