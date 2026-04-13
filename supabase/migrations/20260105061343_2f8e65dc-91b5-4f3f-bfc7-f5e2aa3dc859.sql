-- 1. Bridge Activity Logs - Detailed logs for all bridge operations
CREATE TABLE public.bridge_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prop_firm_id UUID REFERENCES public.prop_firms(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'sync', 'connect', 'disconnect', 'error', 'trade_received'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'success', 'failed'
  request_payload JSONB,
  response_payload JSONB,
  error_message TEXT,
  execution_time_ms INTEGER,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Bridge User Settings - Per-user bridge preferences
CREATE TABLE public.bridge_user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  auto_sync_enabled BOOLEAN NOT NULL DEFAULT true,
  sync_interval_minutes INTEGER NOT NULL DEFAULT 30,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  sync_trades BOOLEAN NOT NULL DEFAULT true,
  sync_positions BOOLEAN NOT NULL DEFAULT true,
  sync_balance BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Portfolio Snapshots - Periodic account state snapshots
CREATE TABLE public.portfolio_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prop_firm_id UUID REFERENCES public.prop_firms(id) ON DELETE CASCADE,
  balance NUMERIC NOT NULL DEFAULT 0,
  equity NUMERIC NOT NULL DEFAULT 0,
  margin NUMERIC DEFAULT 0,
  free_margin NUMERIC DEFAULT 0,
  margin_level NUMERIC DEFAULT 0,
  profit NUMERIC DEFAULT 0,
  open_positions_count INTEGER DEFAULT 0,
  snapshot_type TEXT NOT NULL DEFAULT 'auto', -- 'auto', 'manual', 'sync'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.bridge_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bridge_user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bridge_activity_logs
CREATE POLICY "Users can view their own bridge logs"
  ON public.bridge_activity_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bridge logs"
  ON public.bridge_activity_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff can view all bridge logs"
  ON public.bridge_activity_logs FOR SELECT
  USING (is_ceo(auth.uid()) OR staff_has_permission(auth.uid(), 'manage_support'));

-- RLS Policies for bridge_user_settings
CREATE POLICY "Users can view their own settings"
  ON public.bridge_user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON public.bridge_user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON public.bridge_user_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all settings"
  ON public.bridge_user_settings FOR SELECT
  USING (is_ceo(auth.uid()) OR staff_has_permission(auth.uid(), 'manage_support'));

-- RLS Policies for portfolio_snapshots
CREATE POLICY "Users can view their own snapshots"
  ON public.portfolio_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own snapshots"
  ON public.portfolio_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff can view all snapshots"
  ON public.portfolio_snapshots FOR SELECT
  USING (is_ceo(auth.uid()) OR staff_has_permission(auth.uid(), 'manage_support'));

-- Indexes for performance
CREATE INDEX idx_bridge_activity_logs_user_id ON public.bridge_activity_logs(user_id);
CREATE INDEX idx_bridge_activity_logs_prop_firm_id ON public.bridge_activity_logs(prop_firm_id);
CREATE INDEX idx_bridge_activity_logs_created_at ON public.bridge_activity_logs(created_at DESC);
CREATE INDEX idx_portfolio_snapshots_user_id ON public.portfolio_snapshots(user_id);
CREATE INDEX idx_portfolio_snapshots_prop_firm_id ON public.portfolio_snapshots(prop_firm_id);
CREATE INDEX idx_portfolio_snapshots_created_at ON public.portfolio_snapshots(created_at DESC);

-- Trigger for updated_at on bridge_user_settings
CREATE TRIGGER update_bridge_user_settings_updated_at
  BEFORE UPDATE ON public.bridge_user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();