-- Insert feature toggles setting
INSERT INTO public.system_settings (key, value)
VALUES ('feature_toggles', '{"mt5_connection": true, "plaque_orders": true, "certificate_size_guide": true, "loyalty_program": true, "partner_program": true}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();