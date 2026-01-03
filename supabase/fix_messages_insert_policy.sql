-- Fix INSERT policy for messages to specifically allow group-based sending
-- The screenshot showed 'Users can send messages' just checked user_id = auth.uid()
-- But we need to ensure it allows the specific INSERT where family_id is a group_id

DROP POLICY IF EXISTS "Users can send messages" ON messages;

CREATE POLICY "Users can send messages"
ON messages
FOR INSERT
WITH CHECK (
    -- User matches the sender
    auth.uid() = user_id
    AND (
        -- For DMs
        recipient_id IS NOT NULL
        OR
        -- For Group Chat: User must be a member of the group (family_id)
        EXISTS (
            SELECT 1 
            FROM group_members 
            WHERE group_members.group_id = messages.family_id 
            AND group_members.user_id = auth.uid()
        )
        -- Fallback: If it's a "Family" loop (for backward compatibility if groups aren't fully migrated)
        OR EXISTS (
            SELECT 1
            FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.family_id = messages.family_id
        )
    )
);
