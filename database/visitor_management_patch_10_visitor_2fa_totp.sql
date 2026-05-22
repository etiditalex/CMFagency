-- Visitor account 2FA support using TOTP (Google Authenticator)

-- Create visitor_user_totp table for storing TOTP secrets
CREATE TABLE IF NOT EXISTS visitor_user_totp (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  secret text NOT NULL,
  verified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS for visitor TOTP table
ALTER TABLE visitor_user_totp ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can only read/write their own 2FA config
CREATE POLICY "visitor_totp_own_only" ON visitor_user_totp
FOR ALL USING (auth.uid() = user_id);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_visitor_totp_user_id 
ON visitor_user_totp(user_id);

-- Add 2FA enabled status to visitor accounts profile (optional)
-- If portal_members doesn't have a 2fa_enabled column, add it:
ALTER TABLE portal_members
ADD COLUMN IF NOT EXISTS visitor_2fa_enabled boolean DEFAULT false;

-- Create view to easily check visitor 2FA status
CREATE OR REPLACE VIEW v_visitor_2fa_status AS
SELECT 
    vt.user_id,
    CASE WHEN vt.verified_at IS NOT NULL THEN true ELSE false END as has_totp,
    pm.visitor_2fa_enabled,
    vt.verified_at,
    vt.created_at
FROM visitor_user_totp vt
LEFT JOIN portal_members pm ON vt.user_id = pm.user_id;

-- Add comment
COMMENT ON TABLE visitor_user_totp IS 'TOTP secrets for visitor account 2FA (Google Authenticator)';
COMMENT ON COLUMN visitor_user_totp.secret IS 'Encrypted TOTP secret for generating 6-digit codes';
COMMENT ON COLUMN visitor_user_totp.verified_at IS 'Timestamp when 2FA was verified; NULL means setup incomplete';
