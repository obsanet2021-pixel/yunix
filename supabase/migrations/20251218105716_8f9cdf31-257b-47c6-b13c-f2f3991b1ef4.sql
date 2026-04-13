-- Add telegram_chat_id to profiles for linking Telegram accounts
ALTER TABLE public.profiles 
ADD COLUMN telegram_chat_id BIGINT UNIQUE;

-- Index for faster lookups when sending notifications
CREATE INDEX idx_profiles_telegram_chat_id ON public.profiles(telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;

-- Add telegram linking code for verification
ALTER TABLE public.profiles
ADD COLUMN telegram_link_code TEXT UNIQUE;

-- Add telegram linked timestamp
ALTER TABLE public.profiles
ADD COLUMN telegram_linked_at TIMESTAMP WITH TIME ZONE;