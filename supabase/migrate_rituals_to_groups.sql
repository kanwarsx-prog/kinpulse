-- Add group_id to rituals table
ALTER TABLE rituals 
ADD COLUMN group_id UUID REFERENCES groups(id);

-- Create an index for performance
CREATE INDEX idx_rituals_group_id ON rituals(group_id);

-- Make family_id nullable since we are moving to group_id
ALTER TABLE rituals ALTER COLUMN family_id DROP NOT NULL;

-- Update RLS policies to use group_id
-- First, drop existing policies if they rely on family_id strictness or verify them
DROP POLICY IF EXISTS "Users can view rituals of their family" ON rituals;
DROP POLICY IF EXISTS "Users can create rituals for their family" ON rituals;
DROP POLICY IF EXISTS "Users can update their own rituals" ON rituals;
DROP POLICY IF EXISTS "Users can delete their own rituals" ON rituals;

-- Enable RLS
ALTER TABLE rituals ENABLE ROW LEVEL SECURITY;

-- View Policy: Members of the group can view rituals
CREATE POLICY "Group members can view rituals"
ON rituals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = rituals.group_id
    AND group_members.user_id = auth.uid()
  )
);

-- Insert Policy: Members can create rituals for their group
CREATE POLICY "Group members can create rituals"
ON rituals FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = rituals.group_id
    AND group_members.user_id = auth.uid()
  )
);

-- Update Policy: Creators can update their rituals
CREATE POLICY "Creators can update rituals"
ON rituals FOR UPDATE
USING (created_by = auth.uid());

-- Delete Policy: Creators can delete their rituals
CREATE POLICY "Creators can delete rituals"
ON rituals FOR DELETE
USING (created_by = auth.uid());

-- Migrate existing data (Optional: for now we assume new usage or manual migration, 
-- but if we knew the mapping we could do: UPDATE rituals SET group_id = family_id WHERE group_id IS NULL; if IDs were shared)
-- Since we are moving to groups, we might want to make family_id nullable later or keep it for backward compat.
-- For now, we just add group_id.
