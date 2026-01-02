-- Fix groups RLS to allow admins to see all groups
-- This allows the Admin Console to display all groups

-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view groups they belong to" ON groups;

-- Create a more permissive policy for viewing groups
-- Users can see all groups (needed for Admin Console and discovery)
CREATE POLICY "Users can view all groups"
ON groups FOR SELECT TO authenticated
USING (true);

-- Keep the other policies as they were
-- (Users can create, admins can update/delete their own groups)
