-- Create system_settings table for maintenance mode and other settings
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings (needed to check maintenance mode)
CREATE POLICY "Anyone can view system settings"
ON public.system_settings
FOR SELECT
USING (true);

-- Only CEO can update settings
CREATE POLICY "CEO can update system settings"
ON public.system_settings
FOR UPDATE
USING (public.is_ceo(auth.uid()));

CREATE POLICY "CEO can insert system settings"
ON public.system_settings
FOR INSERT
WITH CHECK (public.is_ceo(auth.uid()));

-- Insert default maintenance mode setting
INSERT INTO public.system_settings (key, value)
VALUES ('maintenance_mode', '{"enabled": false, "message": "We are currently performing maintenance. Please check back soon."}'::jsonb);