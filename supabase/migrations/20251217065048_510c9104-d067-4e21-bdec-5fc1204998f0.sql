-- Create social media posts table for marketing tracking
CREATE TABLE IF NOT EXISTS public.social_media_posts (
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON c.oid = p.polrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE p.polname = 'CEO can manage all social media posts'
      AND c.relname = 'social_media_posts'
      AND n.nspname = 'public'
  ) THEN
    CREATE POLICY "CEO can manage all social media posts"
    ON public.social_media_posts
    FOR ALL
    USING (is_ceo(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON c.oid = p.polrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE p.polname = 'Marketing staff can manage social media posts'
      AND c.relname = 'social_media_posts'
      AND n.nspname = 'public'
  ) THEN
    CREATE POLICY "Marketing staff can manage social media posts"
    ON public.social_media_posts
    FOR ALL
    USING (staff_has_permission(auth.uid(), 'manage_analytics'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON c.oid = p.polrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE p.polname = 'Staff can view social media posts'
      AND c.relname = 'social_media_posts'
      AND n.nspname = 'public'
  ) THEN
    CREATE POLICY "Staff can view social media posts"
    ON public.social_media_posts
    FOR SELECT
    USING (EXISTS (SELECT 1 FROM staff WHERE staff.user_id = auth.uid()));
  END IF;
END
$$;

DROP TRIGGER IF EXISTS update_social_media_posts_updated_at ON public.social_media_posts;
CREATE TRIGGER update_social_media_posts_updated_at
BEFORE UPDATE ON public.social_media_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();