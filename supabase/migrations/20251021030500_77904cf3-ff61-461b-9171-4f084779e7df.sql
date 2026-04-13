-- Make certificates bucket public for image display
UPDATE storage.buckets 
SET public = true 
WHERE id = 'certificates';