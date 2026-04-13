-- Create telegram_otp table for OTP-based authentication
CREATE TABLE public.telegram_otp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  link_token TEXT NOT NULL UNIQUE,
  purpose TEXT NOT NULL DEFAULT 'verification', -- 'verification', 'signin', 'password_reset'
  telegram_chat_id BIGINT,
  verified BOOLEAN DEFAULT FALSE,
  used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX idx_telegram_otp_link_token ON public.telegram_otp(link_token);
CREATE INDEX idx_telegram_otp_email ON public.telegram_otp(email);
CREATE INDEX idx_telegram_otp_expires ON public.telegram_otp(expires_at);

-- Enable RLS
ALTER TABLE public.telegram_otp ENABLE ROW LEVEL SECURITY;

-- Allow edge functions to manage OTP records (using service role)
-- No user-level policies needed as this is managed by edge functions