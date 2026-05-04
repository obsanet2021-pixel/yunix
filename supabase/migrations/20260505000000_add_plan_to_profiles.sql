-- Add plan column to profiles table for feature gating
-- Free users get basic features, Starter/Pro get premium features
-- Staff/CEO get all features regardless of plan

-- Create plan enum type
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_plan') THEN
        CREATE TYPE public.user_plan AS ENUM ('free', 'starter', 'pro');
    END IF;
END $$;

-- Add plan column to profiles table with default 'free'
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS plan public.user_plan NOT NULL DEFAULT 'free';

-- Create index for plan lookups
CREATE INDEX IF NOT EXISTS idx_profiles_plan ON public.profiles(plan);

-- Function to check if user has required plan level
CREATE OR REPLACE FUNCTION public.has_plan_level(_user_id UUID, _required_plan text)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id 
    AND (
      -- Staff/CEO always have access
      EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.role::text IN ('admin', 'staff'))
      OR
      -- Check plan level
      CASE _required_plan
        WHEN 'free' THEN true  -- Everyone has free access
        WHEN 'starter' THEN p.plan::text IN ('starter', 'pro')
        WHEN 'pro' THEN p.plan::text = 'pro'
        ELSE false
      END
    )
  )
$$;

-- Update RLS policy to allow users to update their own plan (for future self-service upgrades)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can update own plan' 
        AND tablename = 'profiles'
    ) THEN
        CREATE POLICY "Users can update own plan"
          ON public.profiles FOR UPDATE
          USING (auth.uid() = id)
          WITH CHECK (auth.uid() = id);
    END IF;
END $$;

-- Add comment explaining the plan system
COMMENT ON COLUMN public.profiles.plan IS 'User subscription plan: free, starter, or pro. Staff/CEO bypass plan restrictions.';
