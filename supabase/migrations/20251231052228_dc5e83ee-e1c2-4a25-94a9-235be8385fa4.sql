-- Update RLS policies for social_media_posts to use manage_social_media permission instead of manage_analytics

-- Drop existing policy
DROP POLICY IF EXISTS "Marketing staff can manage social media posts" ON public.social_media_posts;

-- Create new policy using manage_social_media permission
CREATE POLICY "Social media staff can manage posts" 
ON public.social_media_posts 
FOR ALL 
USING (staff_has_permission(auth.uid(), 'manage_social_media'::text))
WITH CHECK (staff_has_permission(auth.uid(), 'manage_social_media'::text));