-- Check RLS policies for REACTIONS table
SELECT * FROM pg_policies WHERE tablename = 'reactions';

-- Check if inserting a message manually works (to isolate frontend vs backend)
-- We'll try to insert a message into a group where the user is a member
-- Note: We can't actually "run" this as a specific user easily here without their token,
-- but we can check if the policy syntax is valid.

-- Let's check the constraints on reactions too
SELECT * FROM information_schema.table_constraints WHERE table_name = 'reactions';
