-- Create unified auth_challenges table to replace all OTP tables
CREATE TABLE IF NOT EXISTS public.auth_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('login', 'password_reset', 'telegram_link')),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'telegram')),
  code_hash TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_auth_challenges_email ON public.auth_challenges(email);
CREATE INDEX IF NOT EXISTS idx_auth_challenges_token ON public.auth_challenges(token);
CREATE INDEX IF NOT EXISTS idx_auth_challenges_expires_at ON public.auth_challenges(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_challenges_user_id ON public.auth_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_challenges_type_email ON public.auth_challenges(type, email);

-- Enable RLS
ALTER TABLE public.auth_challenges ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access
CREATE POLICY "Service role can insert challenges" ON public.auth_challenges
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can read challenges" ON public.auth_challenges
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can update challenges" ON public.auth_challenges
  FOR UPDATE
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can delete challenges" ON public.auth_challenges
  FOR DELETE
  TO service_role
  USING (true);

-- Drop old OTP tables
DROP TABLE IF EXISTS public.telegram_otp;
DROP TABLE IF EXISTS public.password_reset_otps;