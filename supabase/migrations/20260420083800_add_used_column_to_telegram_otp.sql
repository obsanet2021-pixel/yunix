-- Add used column to existing telegram_otp table
ALTER TABLE public.telegram_otp ADD COLUMN IF NOT EXISTS used BOOLEAN DEFAULT FALSE;
