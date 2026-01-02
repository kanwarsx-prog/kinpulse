-- Add group_id column to events table
-- This allows calendar events to be scoped to groups

-- Add the column
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_events_group_id ON events(group_id);

-- Backfill existing events to user's first group
UPDATE events e
SET group_id = (
    SELECT gm.group_id 
    FROM group_members gm 
    WHERE gm.user_id = e.created_by 
    ORDER BY gm.joined_at ASC 
    LIMIT 1
)
WHERE e.group_id IS NULL
  AND e.created_by IS NOT NULL;

-- Verify the migration
SELECT 
    COUNT(*) as total_events,
    COUNT(group_id) as with_group_id,
    COUNT(*) - COUNT(group_id) as missing_group_id
FROM events;
