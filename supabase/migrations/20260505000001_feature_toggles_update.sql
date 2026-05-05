-- Update feature toggles configuration for the new feature access system
-- This migration ensures all new toggleable features have default values

DO $$
DECLARE
    current_toggles JSONB;
    new_toggles JSONB;
BEGIN
    -- Get existing toggles or use empty object
    SELECT COALESCE(
        (SELECT value FROM public.system_settings WHERE key = 'feature_toggles'),
        '{}'::jsonb
    ) INTO current_toggles;

    -- Define new toggleable features with defaults
    new_toggles := jsonb_build_object(
        -- Existing toggles (preserve current values if set)
        'mt5_connection', COALESCE(current_toggles->>'mt5_connection', 'true')::boolean,
        'plaque_orders', COALESCE(current_toggles->>'plaque_orders', 'true')::boolean,
        'bridge_settings', COALESCE(current_toggles->>'bridge_settings', 'true')::boolean,
        'activity_log', COALESCE(current_toggles->>'activity_log', 'true')::boolean,
        'google_sign_in', COALESCE(current_toggles->>'google_sign_in', 'false')::boolean,
        'invitation_contest', COALESCE(current_toggles->>'invitation_contest', 'false')::boolean,
        
        -- New toggleable features (default enabled)
        'certificate_size_guide', COALESCE(current_toggles->>'certificate_size_guide', 'true')::boolean,
        'loyalty_program', COALESCE(current_toggles->>'loyalty_program', 'true')::boolean,
        'partner_program', COALESCE(current_toggles->>'partner_program', 'true')::boolean,
        'google_signin', COALESCE(current_toggles->>'google_signin', 'true')::boolean
    );

    -- Upsert the feature toggles
    INSERT INTO public.system_settings (key, value, created_at, updated_at)
    VALUES ('feature_toggles', new_toggles, now(), now())
    ON CONFLICT (key) DO UPDATE SET
        value = new_toggles,
        updated_at = now();

    RAISE NOTICE 'Feature toggles updated successfully: %', new_toggles;
END $$;

-- Create function to check if a feature is enabled (for use in RLS policies or edge functions)
CREATE OR REPLACE FUNCTION public.is_feature_enabled(feature_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (value->>feature_key)::boolean 
     FROM public.system_settings 
     WHERE key = 'feature_toggles'),
    true  -- Default to enabled if not found
  );
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION public.is_feature_enabled IS 'Check if a toggleable feature is globally enabled. Used for feature gating.';

-- Ensure system_settings table exists and has proper constraints
DO $$
BEGIN
    -- Add unique constraint on key if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_system_settings_key_unique'
    ) THEN
        CREATE UNIQUE INDEX idx_system_settings_key_unique ON public.system_settings(key);
    END IF;
END $$;
