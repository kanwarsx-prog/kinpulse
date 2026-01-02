-- Fix poker_tables RLS to allow creating tables
-- The issue: Users can't create new poker tables due to restrictive INSERT policy

-- Check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'poker_tables';

-- Drop restrictive policies if they exist
DROP POLICY IF EXISTS "Users can view tables in their family" ON poker_tables;
DROP POLICY IF EXISTS "Users can create tables" ON poker_tables;
DROP POLICY IF EXISTS "Users can update their tables" ON poker_tables;

-- Allow users to view tables in their group
CREATE POLICY "Users can view tables in their group"
ON poker_tables FOR SELECT TO authenticated
USING (
    group_id IN (
        SELECT gm.group_id 
        FROM group_members gm 
        WHERE gm.user_id = auth.uid()
    )
);

-- Allow users to create tables in groups they belong to
CREATE POLICY "Users can create tables in their groups"
ON poker_tables FOR INSERT TO authenticated
WITH CHECK (
    group_id IN (
        SELECT gm.group_id 
        FROM group_members gm 
        WHERE gm.user_id = auth.uid()
    )
);

-- Allow users to update tables they created
CREATE POLICY "Users can update tables they created"
ON poker_tables FOR UPDATE TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Allow users to delete tables they created
CREATE POLICY "Users can delete tables they created"
ON poker_tables FOR DELETE TO authenticated
USING (created_by = auth.uid());
