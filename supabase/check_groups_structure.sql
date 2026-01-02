-- Check groups table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'groups';

-- Check if there's a way to map family_id to group_id
-- Option 1: Check if groups have a family_id column
SELECT * FROM groups LIMIT 5;

-- Option 2: Check if we can map by name
-- (e.g., a group named "Family" corresponds to the old family)
SELECT id, name FROM groups;
