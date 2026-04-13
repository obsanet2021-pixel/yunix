
-- Daily Check-ins table (private psychology data)
CREATE TABLE public.daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood TEXT,
  confidence_level INTEGER,
  stress_level INTEGER,
  sleep_quality TEXT,
  trading_plan TEXT,
  planned_pairs TEXT[],
  daily_risk_limit NUMERIC,
  max_trades INTEGER,
  ai_response TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, checkin_date)
);

ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own checkins" ON public.daily_checkins
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own checkins" ON public.daily_checkins
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own checkins" ON public.daily_checkins
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Account Snapshots table (screenshot sync data)
CREATE TABLE public.account_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  prop_firm_id UUID REFERENCES public.prop_firms(id),
  balance NUMERIC,
  equity NUMERIC,
  floating_pnl NUMERIC,
  margin_used NUMERIC,
  free_margin NUMERIC,
  open_trades INTEGER,
  screenshot_url TEXT,
  extracted_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.account_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own snapshots" ON public.account_snapshots
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own snapshots" ON public.account_snapshots
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
