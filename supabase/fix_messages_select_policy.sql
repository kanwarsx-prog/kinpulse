-- Fix SELECT policy for messages to allow viewing group messages
-- logical update: OR family_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())

DROP POLICY IF EXISTS "Users can view family and DM messages" ON messages;

CREATE POLICY "Users can view family and DM messages"
ON messages
FOR SELECT
USING (
    -- 1. Direct Messages
    (recipient_id IS NOT NULL AND (user_id = auth.uid() OR recipient_id = auth.uid()))
    
    OR
    
    -- 2. Group/Family Messages
    (recipient_id IS NULL AND (
        -- Legacy: User's primary family
        family_id IN (
            SELECT family_id FROM profiles WHERE id = auth.uid()
        )
        OR
        -- New: Any group the user is a member of
        family_id IN (
            SELECT group_id FROM group_members WHERE user_id = auth.uid()
        )
    ))
);
