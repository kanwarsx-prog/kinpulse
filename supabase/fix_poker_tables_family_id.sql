-- Fix poker_tables to remove family_id NOT NULL constraint
-- The issue: poker_tables still requires family_id but we're using group_id now

-- Option 1: Make family_id nullable (for backward compatibility)
ALTER TABLE poker_tables 
ALTER COLUMN family_id DROP NOT NULL;

-- Option 2: If you want to remove family_id entirely (cleaner but breaks old data)
-- ALTER TABLE poker_tables DROP COLUMN family_id;

-- Verify the change
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'poker_tables' 
AND column_name IN ('family_id', 'group_id');
