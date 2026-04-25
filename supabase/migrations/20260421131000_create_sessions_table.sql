-- Create sessions table for OTP-based login persistence
CREATE TABLE IF NOT EXISTS public.sessions (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_email_active ON public.sessions (email) WHERE revoked = false;
CREATE INDEX IF NOT EXISTS idx_sessions_user_id_active ON public.sessions (user_id) WHERE revoked = false;
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON public.sessions (token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON public.sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_revoked ON public.sessions (revoked);
