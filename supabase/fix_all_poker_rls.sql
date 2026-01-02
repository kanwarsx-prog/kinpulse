-- Comprehensive RLS fix for ALL poker tables
-- This fixes the brittleness by updating all poker-related tables at once

-- ============================================
-- POKER_TABLES
-- ============================================
DROP POLICY IF EXISTS "Users can view tables in their family" ON poker_tables;
DROP POLICY IF EXISTS "Users can view tables in their group" ON poker_tables;
DROP POLICY IF EXISTS "Users can create tables" ON poker_tables;
DROP POLICY IF EXISTS "Users can create tables in their groups" ON poker_tables;
DROP POLICY IF EXISTS "Users can update their tables" ON poker_tables;
DROP POLICY IF EXISTS "Users can update tables they created" ON poker_tables;
DROP POLICY IF EXISTS "Users can delete tables they created" ON poker_tables;

-- Make family_id nullable if not already
ALTER TABLE poker_tables ALTER COLUMN family_id DROP NOT NULL;

CREATE POLICY "poker_tables_select" ON poker_tables FOR SELECT TO authenticated USING (true);
CREATE POLICY "poker_tables_insert" ON poker_tables FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "poker_tables_update" ON poker_tables FOR UPDATE TO authenticated USING (true);
CREATE POLICY "poker_tables_delete" ON poker_tables FOR DELETE TO authenticated USING (true);

-- ============================================
-- POKER_SEATS
-- ============================================
DROP POLICY IF EXISTS "Users can view seats" ON poker_seats;
DROP POLICY IF EXISTS "Users can create seats" ON poker_seats;
DROP POLICY IF EXISTS "Users can update seats" ON poker_seats;
DROP POLICY IF EXISTS "Users can delete seats" ON poker_seats;

CREATE POLICY "poker_seats_select" ON poker_seats FOR SELECT TO authenticated USING (true);
CREATE POLICY "poker_seats_insert" ON poker_seats FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "poker_seats_update" ON poker_seats FOR UPDATE TO authenticated USING (true);
CREATE POLICY "poker_seats_delete" ON poker_seats FOR DELETE TO authenticated USING (true);

-- ============================================
-- POKER_HANDS
-- ============================================
DROP POLICY IF EXISTS "Users can view hands" ON poker_hands;
DROP POLICY IF EXISTS "Users can create hands" ON poker_hands;
DROP POLICY IF EXISTS "Users can update hands" ON poker_hands;
DROP POLICY IF EXISTS "Users can delete hands" ON poker_hands;

CREATE POLICY "poker_hands_select" ON poker_hands FOR SELECT TO authenticated USING (true);
CREATE POLICY "poker_hands_insert" ON poker_hands FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "poker_hands_update" ON poker_hands FOR UPDATE TO authenticated USING (true);
CREATE POLICY "poker_hands_delete" ON poker_hands FOR DELETE TO authenticated USING (true);

-- ============================================
-- POKER_ACTIONS
-- ============================================
DROP POLICY IF EXISTS "Users can view actions" ON poker_actions;
DROP POLICY IF EXISTS "Users can create actions" ON poker_actions;
DROP POLICY IF EXISTS "Users can update actions" ON poker_actions;
DROP POLICY IF EXISTS "Users can delete actions" ON poker_actions;

CREATE POLICY "poker_actions_select" ON poker_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "poker_actions_insert" ON poker_actions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "poker_actions_update" ON poker_actions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "poker_actions_delete" ON poker_actions FOR DELETE TO authenticated USING (true);

-- Verify all policies
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename LIKE 'poker_%'
ORDER BY tablename, cmd;
