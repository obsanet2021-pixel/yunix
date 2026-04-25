-- Add expires_at column to telegram_otp table for OTP expiry support
-- This migration is safe to run even if the column already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'telegram_otp' 
    AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE telegram_otp ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;
