-- Add support for multiple screenshots and video to trades table
ALTER TABLE public.trades 
ADD COLUMN IF NOT EXISTS screenshots text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS video_url text;

-- Migrate existing screenshot_url to screenshots array (backward compatibility)
UPDATE public.trades 
SET screenshots = ARRAY[screenshot_url]
WHERE screenshot_url IS NOT NULL AND (screenshots IS NULL OR screenshots = '{}');