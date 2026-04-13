-- Add encrypted password columns to prop_firms
ALTER TABLE prop_firms
ADD COLUMN IF NOT EXISTS investor_password_encrypted TEXT,
ADD COLUMN IF NOT EXISTS encryption_iv TEXT,
ADD COLUMN IF NOT EXISTS bridge_url TEXT,
ADD COLUMN IF NOT EXISTS bridge_api_key TEXT,
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'never';

-- Create open_positions table for real-time position tracking
CREATE TABLE IF NOT EXISTS public.open_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  prop_firm_id UUID NOT NULL REFERENCES prop_firms(id) ON DELETE CASCADE,
  mt5_ticket BIGINT NOT NULL,
  symbol TEXT NOT NULL,
  trade_type TEXT NOT NULL,
  volume NUMERIC NOT NULL,
  open_price NUMERIC NOT NULL,
  current_price NUMERIC,
  take_profit NUMERIC,
  stop_loss NUMERIC,
  unrealized_pnl NUMERIC DEFAULT 0,
  open_time TIMESTAMPTZ NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(prop_firm_id, mt5_ticket)
);

-- Enable RLS on open_positions
ALTER TABLE public.open_positions ENABLE ROW LEVEL SECURITY;

-- Users can view their own positions
CREATE POLICY "Users can view their own positions"
ON public.open_positions FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own positions
CREATE POLICY "Users can insert their own positions"
ON public.open_positions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own positions
CREATE POLICY "Users can update their own positions"
ON public.open_positions FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own positions
CREATE POLICY "Users can delete their own positions"
ON public.open_positions FOR DELETE
USING (auth.uid() = user_id);

-- Create sync_logs table
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  prop_firm_id UUID NOT NULL REFERENCES prop_firms(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  trades_synced INTEGER DEFAULT 0,
  positions_synced INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on sync_logs
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own sync logs
CREATE POLICY "Users can view their own sync logs"
ON public.sync_logs FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own sync logs
CREATE POLICY "Users can insert their own sync logs"
ON public.sync_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Enable realtime for open_positions
ALTER PUBLICATION supabase_realtime ADD TABLE public.open_positions;