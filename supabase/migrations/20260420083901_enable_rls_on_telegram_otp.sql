-- Enable RLS and add policies for telegram_otp table

-- Enable RLS
ALTER TABLE telegram_otp ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (from original table creation)
DROP POLICY IF EXISTS "Users can read own OTPs" ON telegram_otp;
DROP POLICY IF EXISTS "Service role can insert OTPs" ON telegram_otp;
DROP POLICY IF EXISTS "Service role can read OTPs" ON telegram_otp;
DROP POLICY IF EXISTS "Service role can update OTPs" ON telegram_otp;
DROP POLICY IF EXISTS "Service role can delete OTPs" ON telegram_otp;

-- Users can read their own OTPs (optional, for debugging)
CREATE POLICY "Users can read own OTPs"
ON telegram_otp
FOR SELECT
USING (auth.uid() = user_id);

-- Service role can insert OTPs (Edge Functions)
CREATE POLICY "Service role can insert OTPs"
ON telegram_otp
FOR INSERT
TO service_role
WITH CHECK (true);

-- Service role can update OTPs (Edge Functions)
CREATE POLICY "Service role can update OTPs"
ON telegram_otp
FOR UPDATE
TO service_role
WITH CHECK (true);

-- Service role can delete OTPs (Edge Functions)
CREATE POLICY "Service role can delete OTPs"
ON telegram_otp
FOR DELETE
TO service_role
USING (true);

-- Service role can read OTPs (Edge Functions)
CREATE POLICY "Service role can read OTPs"
ON telegram_otp
FOR SELECT
TO service_role
USING (true);
