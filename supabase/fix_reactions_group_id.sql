-- Update reactions table to use group_id instead of family_id
-- This allows reactions to work correctly in the multi-group system

-- Add group_id column
ALTER TABLE reactions 
ADD COLUMN IF NOT EXISTS group_id UUID;

-- Backfill group_id from user's first group
-- Since we don't have a direct family_id to group_id mapping,
-- we'll assign reactions to the user's first group
UPDATE reactions r
SET group_id = (
    SELECT gm.group_id 
    FROM group_members gm 
    WHERE gm.user_id = r.user_id 
    ORDER BY gm.joined_at ASC 
    LIMIT 1
)
WHERE r.group_id IS NULL;

-- Make group_id NOT NULL after backfill
ALTER TABLE reactions 
ALTER COLUMN group_id SET NOT NULL;

-- Drop old policies that depend on family_id
DROP POLICY IF EXISTS "Users can view family reactions" ON reactions;
DROP POLICY IF EXISTS "Users can create own reactions" ON reactions;
DROP POLICY IF EXISTS "reactions_select" ON reactions;
DROP POLICY IF EXISTS "reactions_write" ON reactions;

-- Drop family_id column
ALTER TABLE reactions 
DROP COLUMN IF EXISTS family_id;

-- Create new RLS policies using group_id

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
