-- Fix Users Table Schema
-- Missing columns identified by backend error logs
-- Run this in Supabase SQL Editor

-- 1. Add missing authentication columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_confirmed_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_confirmed_at TIMESTAMPTZ;

-- 2. Update existing users to have proper timestamps
-- Use joined_date as created_at for existing users
UPDATE users 
SET created_at = COALESCE(
  -- Try to parse joined_date if it's a string
  CASE 
    WHEN joined_date ~ '^\d{4}-\d{2}-\d{2}' THEN joined_date::TIMESTAMPTZ
    ELSE NOW()
  END,
  NOW()
) 
WHERE created_at IS NULL;

-- Set updated_at to now for existing users
UPDATE users 
SET updated_at = NOW() 
WHERE updated_at IS NULL;

-- Set last_sign_in_at to last_login if it exists and is a valid timestamp
UPDATE users 
SET last_sign_in_at = CASE 
  WHEN last_login IS NOT NULL AND last_login ~ '^\d{4}-\d{2}-\d{2}' 
  THEN last_login::TIMESTAMPTZ
  ELSE NULL
END
WHERE last_sign_in_at IS NULL AND last_login IS NOT NULL;

-- 3. Create function to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_last_sign_in_at ON users(last_sign_in_at);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);

-- 6. Comments for documentation
COMMENT ON COLUMN users.last_sign_in_at IS 'Timestamp of users last sign in';
COMMENT ON COLUMN users.created_at IS 'Timestamp when user account was created';
COMMENT ON COLUMN users.updated_at IS 'Timestamp when user account was last updated';
COMMENT ON COLUMN users.email_verified IS 'Whether users email address is verified';
COMMENT ON COLUMN users.email_confirmed_at IS 'Timestamp when email was confirmed';
COMMENT ON COLUMN users.phone_confirmed_at IS 'Timestamp when phone was confirmed';

-- 7. Verify the changes (this will show current table structure)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
AND column_name IN ('last_sign_in_at', 'created_at', 'updated_at', 'email_verified', 'email_confirmed_at', 'phone_confirmed_at')
ORDER BY column_name;