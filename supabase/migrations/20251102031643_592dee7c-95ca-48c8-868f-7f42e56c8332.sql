-- Add screenshot_url column to trades table
ALTER TABLE public.trades
ADD COLUMN IF NOT EXISTS screenshot_url TEXT;