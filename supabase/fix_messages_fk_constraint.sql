-- Remove the restrictive Foreign Key that forces all messages to belong to a 'Family'
-- This allows messages to be linked to 'Groups' instead.

ALTER TABLE messages
DROP CONSTRAINT IF EXISTS messages_family_id_fkey;

-- We usually want some referential integrity, but since we are splitting between families and groups, 
-- we can't have a simple FK. We could add a trigger to check existence, but for now, 
-- removing the blocker is the priority.
