-- Create MT5 Bridge Configuration table (centralized admin config)
CREATE TABLE public.mt5_bridge_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bridge_url TEXT NOT NULL,
  bridge_api_key TEXT,
  is_active BOOLEAN DEFAULT true,
  sync_interval_minutes INTEGER DEFAULT 30 CHECK (sync_interval_minutes >= 20 AND sync_interval_minutes <= 60),
  last_global_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mt5_bridge_config ENABLE ROW LEVEL SECURITY;

-- Only CEO can manage bridge config
CREATE POLICY "CEO can manage bridge config"
ON public.mt5_bridge_config FOR ALL
USING (is_ceo(auth.uid()));

-- Staff can view bridge config
CREATE POLICY "Staff can view bridge config"
ON public.mt5_bridge_config FOR SELECT
USING (EXISTS (SELECT 1 FROM staff WHERE staff.user_id = auth.uid()));

-- Add auto_sync_enabled to prop_firms for per-account opt-in/out
ALTER TABLE public.prop_firms 
ADD COLUMN auto_sync_enabled BOOLEAN DEFAULT true;

-- Remove bridge_url and bridge_api_key from prop_firms (moving to centralized config)
-- We'll keep the columns but deprecate them - admin config takes precedence
-- ALTER TABLE public.prop_firms DROP COLUMN bridge_url, DROP COLUMN bridge_api_key;
-- Actually, let's keep them for backwards compatibility and just not use them

-- Create trigger for updated_at
CREATE TRIGGER update_mt5_bridge_config_updated_at
BEFORE UPDATE ON public.mt5_bridge_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for sync_logs to show live sync status
ALTER PUBLICATION supabase_realtime ADD TABLE public.sync_logs;