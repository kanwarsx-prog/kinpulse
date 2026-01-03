-- Make invitee_email nullable in group_invitations
-- This allows the table to support both:
-- 1. Email invitations (with invitee_email)
-- 2. Shareable invite codes (without invitee_email)

ALTER TABLE group_invitations 
ALTER COLUMN invitee_email DROP NOT NULL;

-- Add a check constraint to ensure either invite_code or invitee_email is present
ALTER TABLE group_invitations
ADD CONSTRAINT group_invitations_type_check 
CHECK (
  (invite_code IS NOT NULL AND invitee_email IS NULL) OR
  (invite_code IS NULL AND invitee_email IS NOT NULL)
);
