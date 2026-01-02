-- Create a test group to demonstrate multi-group switching
-- This creates a "Friends" group and adds you as a member

-- 1. Create a new group (replace YOUR_USER_ID with your actual user ID)
-- You can find your user ID by running: SELECT id FROM profiles WHERE email = 'your@email.com';

-- First, get your user ID (replace with your email)
DO $$
DECLARE
    v_user_id UUID;
    v_new_group_id UUID;
BEGIN
    -- Get the first user (you can modify this to target specific user)
    SELECT id INTO v_user_id FROM profiles LIMIT 1;
    
    -- Create a new "Friends" group
    INSERT INTO groups (name, icon, created_by)
    VALUES ('Friends', '👥', v_user_id)
    RETURNING id INTO v_new_group_id;
    
    -- Add yourself as admin of the new group
    INSERT INTO group_members (group_id, user_id, role)
    VALUES (v_new_group_id, v_user_id, 'admin');
    
    RAISE NOTICE 'Created group "Friends" with ID: %', v_new_group_id;
END $$;

-- Verify the groups
SELECT g.name, g.icon, gm.role, p.email
FROM groups g
JOIN group_members gm ON g.id = gm.group_id
JOIN profiles p ON gm.user_id = p.id
ORDER BY g.created_at;
