-- Add installation_status column to profiles table
-- Values: 'browser' | 'standalone'

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS installation_status TEXT DEFAULT 'browser';

-- Add check constraint for valid values
ALTER TABLE profiles
ADD CONSTRAINT check_installation_status 
CHECK (installation_status IN ('browser', 'standalone'));

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_profiles_installation_status ON profiles(installation_status);
