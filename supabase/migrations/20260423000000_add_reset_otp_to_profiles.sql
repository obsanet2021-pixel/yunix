ALTER TABLE profiles ADD COLUMN reset_otp TEXT;
ALTER TABLE profiles ADD COLUMN reset_otp_expires_at TIMESTAMPTZ;