-- Create social media posts table for marketing tracking
CREATE TABLE public.social_media_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id),
  platform TEXT NOT NULL CHECK (platform IN ('youtube', 'tiktok', 'instagram', 'twitter', 'facebook', 'linkedin')),
  post_url TEXT NOT NULL,
  campaign_name TEXT,
  post_title TEXT,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  posted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.social_media_posts ENABLE ROW LEVEL SECURITY;

-- CEO can manage all posts
CREATE POLICY "CEO can manage all social media posts"
ON public.social_media_posts
FOR ALL
USING (is_ceo(auth.uid()));

-- Marketing staff can manage posts
CREATE POLICY "Marketing staff can manage social media posts"
ON public.social_media_posts
FOR ALL
USING (staff_has_permission(auth.uid(), 'manage_analytics'));

-- Staff can view all posts
CREATE POLICY "Staff can view social media posts"
ON public.social_media_posts
FOR SELECT
USING (EXISTS (SELECT 1 FROM staff WHERE staff.user_id = auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_social_media_posts_updated_at
BEFORE UPDATE ON public.social_media_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();