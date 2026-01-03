-- Update reactions table to use group_id instead of family_id
-- This allows reactions to work correctly in the multi-group system

-- Add group_id column
ALTER TABLE reactions 
ADD COLUMN IF NOT EXISTS group_id UUID;

-- Backfill group_id from family_id
-- Map family_id to the corresponding group_id
UPDATE reactions r
SET group_id = g.id
FROM groups g
WHERE r.family_id = g.family_id
AND r.group_id IS NULL;

-- Make group_id NOT NULL after backfill
ALTER TABLE reactions 
ALTER COLUMN group_id SET NOT NULL;

-- Drop family_id column
ALTER TABLE reactions 
DROP COLUMN IF EXISTS family_id;

-- Update RLS policies to use group_id
DROP POLICY IF EXISTS "reactions_select" ON reactions;
DROP POLICY IF EXISTS "reactions_write" ON reactions;

CREATE POLICY "reactions_select" ON reactions
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM group_members gm
        WHERE gm.group_id = reactions.group_id
        AND gm.user_id = auth.uid()
    )
);

CREATE POLICY "reactions_write" ON reactions
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM group_members gm
        WHERE gm.group_id = reactions.group_id
        AND gm.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM group_members gm
        WHERE gm.group_id = reactions.group_id
        AND gm.user_id = auth.uid()
    )
);

-- Verify the changes
SELECT 
    'Reactions with group_id' as check_name,
    COUNT(*) as count
FROM reactions
WHERE group_id IS NOT NULL;
