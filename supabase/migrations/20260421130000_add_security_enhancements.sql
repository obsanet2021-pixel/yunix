-- Add security enhancements to auth_challenges table
ALTER TABLE public.auth_challenges
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;

-- Add indexes for performance and security
CREATE INDEX IF NOT EXISTS idx_auth_challenges_email_type_used_expires
  ON public.auth_challenges (email, type, used, expires_at);

CREATE INDEX IF NOT EXISTS idx_auth_challenges_token
  ON public.auth_challenges (token);

CREATE INDEX IF NOT EXISTS idx_auth_challenges_locked_until
  ON public.auth_challenges (locked_until)
  WHERE locked_until IS NOT NULL;