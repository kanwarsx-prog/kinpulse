-- Multi-Group Feature - Database Schema
-- Phase 1: Create new tables for groups, group members, and invitations

-- 1. Groups table - stores all groups (Family, Friends, Work, etc.)
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT '👥', -- emoji or icon identifier
    created_by UUID REFERENCES profiles(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Group members table - tracks who belongs to which groups
CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- 3. Group invitations table - manage group invites
CREATE TABLE IF NOT EXISTS group_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
    inviter_id UUID REFERENCES profiles(id) NOT NULL,
    invitee_email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

-- 4. Add current_group_id to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS current_group_id UUID REFERENCES groups(id);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_token ON group_invitations(token);
CREATE INDEX IF NOT EXISTS idx_group_invitations_email ON group_invitations(invitee_email);
CREATE INDEX IF NOT EXISTS idx_profiles_current_group ON profiles(current_group_id);

-- 6. Enable RLS on new tables
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for groups table
CREATE POLICY "Users can view groups they belong to"
ON groups FOR SELECT TO authenticated
USING (
    id IN (
        SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can create groups"
ON groups FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Group admins can update groups"
ON groups FOR UPDATE TO authenticated
USING (
    id IN (
        SELECT group_id FROM group_members 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Group admins can delete groups"
ON groups FOR DELETE TO authenticated
USING (
    id IN (
        SELECT group_id FROM group_members 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- 8. RLS Policies for group_members table
CREATE POLICY "Users can view members of their groups"
ON group_members FOR SELECT TO authenticated
USING (
    group_id IN (
        SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Group admins can add members"
ON group_members FOR INSERT TO authenticated
WITH CHECK (
    group_id IN (
        SELECT group_id FROM group_members 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Group admins can remove members"
ON group_members FOR DELETE TO authenticated
USING (
    group_id IN (
        SELECT group_id FROM group_members 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- 9. RLS Policies for group_invitations table
CREATE POLICY "Users can view invitations for their groups"
ON group_invitations FOR SELECT TO authenticated
USING (
    group_id IN (
        SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
    OR invitee_email = (SELECT email FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Group members can create invitations"
ON group_invitations FOR INSERT TO authenticated
WITH CHECK (
    group_id IN (
        SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
    AND inviter_id = auth.uid()
);

CREATE POLICY "Invitees can update their invitations"
ON group_invitations FOR UPDATE TO authenticated
USING (
    invitee_email = (SELECT email FROM profiles WHERE id = auth.uid())
);

-- Comments for documentation
COMMENT ON TABLE groups IS 'User-created groups (Family, Friends, Work, etc.)';
COMMENT ON TABLE group_members IS 'Tracks which users belong to which groups';
COMMENT ON TABLE group_invitations IS 'Pending invitations to join groups';
COMMENT ON COLUMN profiles.current_group_id IS 'The group context the user is currently viewing';
