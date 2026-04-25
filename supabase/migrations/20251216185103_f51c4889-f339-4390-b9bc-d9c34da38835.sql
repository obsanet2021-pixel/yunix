-- Create system_settings table for maintenance mode and other settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON c.oid = p.polrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE p.polname = 'Anyone can view system settings'
      AND c.relname = 'system_settings'
      AND n.nspname = 'public'
  ) THEN
    CREATE POLICY "Anyone can view system settings"
    ON public.system_settings
    FOR SELECT
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON c.oid = p.polrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE p.polname = 'CEO can update system settings'
      AND c.relname = 'system_settings'
      AND n.nspname = 'public'
  ) THEN
    CREATE POLICY "CEO can update system settings"
    ON public.system_settings
    FOR UPDATE
    USING (public.is_ceo(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON c.oid = p.polrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE p.polname = 'CEO can insert system settings'
      AND c.relname = 'system_settings'
      AND n.nspname = 'public'
  ) THEN
    CREATE POLICY "CEO can insert system settings"
    ON public.system_settings
    FOR INSERT
    WITH CHECK (public.is_ceo(auth.uid()));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.system_settings WHERE key = 'maintenance_mode'
  ) THEN
    INSERT INTO public.system_settings (key, value)
    VALUES ('maintenance_mode', '{"enabled": false, "message": "We are currently performing maintenance. Please check back soon."}'::jsonb);
  END IF;
END
$$;