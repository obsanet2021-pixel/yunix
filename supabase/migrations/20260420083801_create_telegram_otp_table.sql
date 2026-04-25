-- Create telegram_otp table for OTP verification
CREATE TABLE IF NOT EXISTS public.telegram_otp (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  otp_code TEXT NOT NULL,
  link_token TEXT NOT NULL UNIQUE,
  purpose TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  used BOOLEAN DEFAULT FALSE,
  telegram_chat_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_telegram_otp_email ON public.telegram_otp(email);
CREATE INDEX IF NOT EXISTS idx_telegram_otp_link_token ON public.telegram_otp(link_token);
CREATE INDEX IF NOT EXISTS idx_telegram_otp_expires_at ON public.telegram_otp(expires_at);

-- Enable RLS
ALTER TABLE public.telegram_otp ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow service role to insert OTPs
CREATE POLICY "Service role can insert OTPs" ON public.telegram_otp
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow service role to read OTPs
CREATE POLICY "Service role can read OTPs" ON public.telegram_otp
  FOR SELECT
  TO service_role
  USING (true);

-- Allow service role to update OTPs
CREATE POLICY "Service role can update OTPs" ON public.telegram_otp
  FOR UPDATE
  TO service_role
  WITH CHECK (true);

-- Allow service role to delete OTPs
CREATE POLICY "Service role can delete OTPs" ON public.telegram_otp
  FOR DELETE
  TO service_role
  USING (true);
