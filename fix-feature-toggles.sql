-- Fix feature_toggles record to include all expected fields
-- This updates the feature_toggles record in system_settings to include all fields expected by the code

INSERT INTO public.system_settings (key, value)
VALUES (
  'feature_toggles',
  '{
    "mt5_connection": true,
    "plaque_orders": true,
    "certificate_size_guide": true,
    "loyalty_program": true,
    "partner_program": true,
    "bridge_settings": true,
    "activity_log": true,
    "google_sign_in": false,
    "invitation_contest": false
  }'::jsonb
)
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = now();
