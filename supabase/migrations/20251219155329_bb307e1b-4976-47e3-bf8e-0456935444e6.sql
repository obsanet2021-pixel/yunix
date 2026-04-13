-- Make user_id nullable for Telegram users
ALTER TABLE support_tickets 
  ALTER COLUMN user_id DROP NOT NULL;

-- Add a check to ensure either user_id or telegram_user_chat_id is set
ALTER TABLE support_tickets
  ADD CONSTRAINT support_tickets_user_or_telegram_required
  CHECK (user_id IS NOT NULL OR telegram_user_chat_id IS NOT NULL);