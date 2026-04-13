-- Add storage policy for certificates bucket allowing course managers to upload final certificates
CREATE POLICY "Course managers can upload final certificates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'certificates' 
  AND staff_has_permission(auth.uid(), 'manage_courses')
);

-- Allow course managers to view/download certificates
CREATE POLICY "Course managers can view certificates"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'certificates' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR staff_has_permission(auth.uid(), 'manage_courses')
  )
);