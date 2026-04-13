-- Create storage bucket for course thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-thumbnails', 'course-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload course thumbnails
CREATE POLICY "Admins can upload course thumbnails"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course-thumbnails' 
  AND (storage.foldername(name))[1] = 'thumbnails'
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Allow public access to view course thumbnails
CREATE POLICY "Course thumbnails are publicly accessible"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'course-thumbnails');

-- Allow admins to delete course thumbnails
CREATE POLICY "Admins can delete course thumbnails"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'course-thumbnails'
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);