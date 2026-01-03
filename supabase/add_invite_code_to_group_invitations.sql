-- Add invite_code column to group_invitations table
-- This allows groups to have shareable invite codes

ALTER TABLE group_invitations 
ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- Add is_active column to track if invitation is still valid
ALTER TABLE group_invitations 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add expires_at column for optional expiration
ALTER TABLE group_invitations 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Add max_uses column for optional usage limits
ALTER TABLE group_invitations 
ADD COLUMN IF NOT EXISTS max_uses INTEGER;

-- Create index on invite_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_group_invitations_invite_code 
ON group_invitations(invite_code) WHERE invite_code IS NOT NULL;

-- Create index on active invitations
CREATE INDEX IF NOT EXISTS idx_group_invitations_active 
ON group_invitations(group_id, is_active) WHERE is_active = true;
