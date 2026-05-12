-- Create storage bucket for trade screenshots
-- Note: Run this in Supabase Dashboard SQL Editor or use supabase CLI

-- Create bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('trade-screenshots', 'trade-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the bucket
-- Allow users to upload their own screenshots
CREATE POLICY "Users can upload their own trade screenshots"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'trade-screenshots' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to read their own screenshots
CREATE POLICY "Users can read their own trade screenshots"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'trade-screenshots' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own screenshots
CREATE POLICY "Users can delete their own trade screenshots"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'trade-screenshots' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
