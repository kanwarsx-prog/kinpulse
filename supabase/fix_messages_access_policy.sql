-- Fix RLS policy for messages to allow access via group membership

-- Drop the old restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view family and DM messages" ON messages;

-- Create new comprehensive SELECT policy
CREATE POLICY "Users can view messages they have access to"
ON messages
FOR SELECT
USING (
    -- User is the sender
    auth.uid() = user_id
    OR
    -- User is the recipient (DM)
    auth.uid() = recipient_id
    OR
    -- User is a member of the group (family_id refers to group_id now)
    EXISTS (
        SELECT 1 
        FROM group_members 
        WHERE group_members.group_id = messages.family_id 
        AND group_members.user_id = auth.uid()
    )
    -- Fallback for legacy "families" logic if group_members is empty (optional, but good for safety)
    -- OR family_id = (SELECT family_id FROM profiles WHERE id = auth.uid())
);

-- Fix INSERT policy to allow posting to any group you are a member of
DROP POLICY IF EXISTS "Users can send messages" ON messages;

CREATE POLICY "Users can send messages to their groups"
ON messages
FOR INSERT
WITH CHECK (
    -- Allow sending if you are the user_id
    auth.uid() = user_id
    AND (
        -- And you are a member of the target group
        EXISTS (
            SELECT 1 
            FROM group_members 
            WHERE group_members.group_id = family_id 
            AND group_members.user_id = auth.uid()
        )
        OR
        -- OR it is a DM (we might want to restrict DMs to people in shared groups, but open for now)
        recipient_id IS NOT NULL
    )
);
