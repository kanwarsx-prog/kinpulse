-- Multi-Group Feature - Data Migration
-- Phase 2: Migrate existing families to groups
-- This script converts existing family data to the new group structure

-- IMPORTANT: Run create_groups_schema.sql BEFORE running this migration

-- 1. Migrate existing families to groups table
INSERT INTO groups (id, name, icon, created_by, created_at, updated_at)
SELECT 
    f.id,
    COALESCE(f.name, 'My Family') as name,
    '👨‍👩‍👧‍👦' as icon,
    f.created_by,
    f.created_at,
    f.updated_at
FROM families f
WHERE NOT EXISTS (SELECT 1 FROM groups WHERE groups.id = f.id);

-- 2. Migrate family members to group_members table
INSERT INTO group_members (group_id, user_id, role, joined_at)
SELECT 
    p.family_id as group_id,
    p.id as user_id,
    -- Set creator as admin, others as members
    CASE 
        WHEN p.id = (SELECT created_by FROM families WHERE id = p.family_id) 
        THEN 'admin' 
        ELSE 'member' 
    END as role,
    p.created_at as joined_at
FROM profiles p
WHERE p.family_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM group_members gm 
    WHERE gm.group_id = p.family_id AND gm.user_id = p.id
);

-- 3. Set current_group_id for all users to their family group
UPDATE profiles 
SET current_group_id = family_id
WHERE family_id IS NOT NULL 
AND current_group_id IS NULL;

-- 4. Backfill group_id on existing content tables

-- Photos
UPDATE photos 
SET group_id = (
    SELECT family_id FROM profiles WHERE profiles.id = photos.user_id
)
WHERE group_id IS NULL 
AND user_id IN (SELECT id FROM profiles WHERE family_id IS NOT NULL);

-- Messages
UPDATE messages 
SET group_id = (
    SELECT family_id FROM profiles WHERE profiles.id = messages.user_id
)
WHERE group_id IS NULL 
AND user_id IN (SELECT id FROM profiles WHERE family_id IS NOT NULL);

-- Poker tables
UPDATE poker_tables 
SET group_id = family_id
WHERE group_id IS NULL 
AND family_id IS NOT NULL;

-- Chess games
UPDATE chess_games 
SET group_id = family_id
WHERE group_id IS NULL 
AND family_id IS NOT NULL;

-- Pulses
UPDATE pulses 
SET group_id = (
    SELECT family_id FROM profiles WHERE profiles.id = pulses.user_id
)
WHERE group_id IS NULL 
AND user_id IN (SELECT id FROM profiles WHERE family_id IS NOT NULL);

-- Calendar events (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_events') THEN
        UPDATE calendar_events 
        SET group_id = (
            SELECT family_id FROM profiles WHERE profiles.id = calendar_events.user_id
        )
        WHERE group_id IS NULL 
        AND user_id IN (SELECT id FROM profiles WHERE family_id IS NOT NULL);
    END IF;
END $$;

-- 5. Verify migration
-- Count groups created
SELECT COUNT(*) as groups_created FROM groups;

-- Count group members
SELECT COUNT(*) as members_migrated FROM group_members;

-- Count users with current_group_id set
SELECT COUNT(*) as users_with_current_group FROM profiles WHERE current_group_id IS NOT NULL;

-- Show summary
SELECT 
    'Migration Summary' as status,
    (SELECT COUNT(*) FROM groups) as total_groups,
    (SELECT COUNT(*) FROM group_members) as total_memberships,
    (SELECT COUNT(*) FROM profiles WHERE current_group_id IS NOT NULL) as users_with_group;

-- Comments
COMMENT ON SCRIPT IS 'Migrates existing family data to new multi-group structure. Run after create_groups_schema.sql.';
