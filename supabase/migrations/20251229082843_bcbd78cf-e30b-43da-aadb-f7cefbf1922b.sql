-- =====================================================
-- ACCOUNT CYCLES SYSTEM: Complete Database Schema
-- =====================================================

-- 1. Add funded_balance column to prop_firms (immutable original funded amount)
ALTER TABLE public.prop_firms 
ADD COLUMN IF NOT EXISTS funded_balance NUMERIC;

COMMENT ON COLUMN public.prop_firms.funded_balance IS 
  'Immutable original funded amount for funded accounts. Used as starting_balance for all cycles.';

-- 2. Create account_cycles table
CREATE TABLE public.account_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prop_firm_id UUID NOT NULL REFERENCES public.prop_firms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  cycle_number INTEGER NOT NULL DEFAULT 1,
  
  -- Immutable starting values (from funded_balance)
  starting_balance NUMERIC NOT NULL,
  
  -- Calculated deterministically at close time: starting_balance + SUM(trades.profit)
  ending_balance NUMERIC,
  withdrawn_amount NUMERIC DEFAULT 0,
  
  -- Cycle-scoped targets
  profit_target NUMERIC,
  max_drawdown_percentage NUMERIC,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE,
  
  -- Payout documentation
  payout_proof_url TEXT,
  notes TEXT,
  migration_note TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(prop_firm_id, cycle_number)
);

-- 3. Add cycle_id to trades table
ALTER TABLE public.trades 
ADD COLUMN IF NOT EXISTS cycle_id UUID REFERENCES public.account_cycles(id);

CREATE INDEX IF NOT EXISTS idx_trades_cycle_id ON public.trades(cycle_id);

-- 4. Enable RLS on account_cycles
ALTER TABLE public.account_cycles ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for account_cycles
CREATE POLICY "Users can view their own cycles"
ON public.account_cycles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create cycles for their funded accounts"
ON public.account_cycles
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.prop_firms 
    WHERE id = prop_firm_id 
    AND user_id = auth.uid() 
    AND account_type = 'Funded'
  )
);

CREATE POLICY "Users can update their own active cycles"
ON public.account_cycles
FOR UPDATE
USING (auth.uid() = user_id AND status = 'active');

-- 6. Migration: Set funded_balance for existing funded accounts
UPDATE public.prop_firms 
SET funded_balance = balance 
WHERE account_type = 'Funded' AND funded_balance IS NULL;

-- 7. Migration: Create initial cycle for each existing funded account
INSERT INTO public.account_cycles (
  prop_firm_id, 
  user_id, 
  cycle_number, 
  starting_balance, 
  profit_target,
  status,
  migration_note
)
SELECT 
  id,
  user_id,
  1,
  COALESCE(funded_balance, balance, 0),
  profit_target,
  'active',
  'Cycle created during migration. Starting balance estimated from current balance.'
FROM public.prop_firms
WHERE account_type = 'Funded'
ON CONFLICT (prop_firm_id, cycle_number) DO NOTHING;

-- 8. Migration: Link existing trades to their account's first cycle
UPDATE public.trades t
SET cycle_id = ac.id
FROM public.account_cycles ac
WHERE t.prop_firm_id = ac.prop_firm_id 
  AND ac.cycle_number = 1
  AND t.cycle_id IS NULL
  AND t.prop_firm_id IN (
    SELECT id FROM public.prop_firms WHERE account_type = 'Funded'
  );

-- 9. Create function to close cycle and start new one
CREATE OR REPLACE FUNCTION public.close_cycle_and_start_new(
  _prop_firm_id UUID,
  _withdrawn_amount NUMERIC,
  _payout_proof_url TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _current_cycle RECORD;
  _funded_balance NUMERIC;
  _cycle_pnl NUMERIC;
  _new_cycle_id UUID;
  _user_id UUID;
BEGIN
  -- Verify user owns this account
  SELECT user_id, funded_balance INTO _user_id, _funded_balance
  FROM prop_firms
  WHERE id = _prop_firm_id;
  
  IF _user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: You do not own this account';
  END IF;
  
  IF _funded_balance IS NULL THEN
    RAISE EXCEPTION 'No funded_balance set for this account';
  END IF;
  
  -- Get current active cycle
  SELECT * INTO _current_cycle
  FROM account_cycles
  WHERE prop_firm_id = _prop_firm_id AND status = 'active'
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active cycle found for this account';
  END IF;
  
  -- Calculate ending_balance deterministically: starting_balance + SUM(trades.profit)
  SELECT COALESCE(SUM(profit), 0) INTO _cycle_pnl
  FROM trades
  WHERE cycle_id = _current_cycle.id;
  
  -- Close current cycle
  UPDATE account_cycles
  SET 
    status = 'closed',
    end_date = now(),
    ending_balance = _current_cycle.starting_balance + _cycle_pnl,
    withdrawn_amount = _withdrawn_amount,
    payout_proof_url = _payout_proof_url,
    updated_at = now()
  WHERE id = _current_cycle.id;
  
  -- Create new cycle using funded_balance (immutable)
  INSERT INTO account_cycles (
    prop_firm_id,
    user_id,
    cycle_number,
    starting_balance,
    profit_target,
    max_drawdown_percentage,
    status
  )
  VALUES (
    _prop_firm_id,
    _current_cycle.user_id,
    _current_cycle.cycle_number + 1,
    _funded_balance,
    _current_cycle.profit_target,
    _current_cycle.max_drawdown_percentage,
    'active'
  )
  RETURNING id INTO _new_cycle_id;
  
  -- Reset current_profit on the account (for display purposes)
  UPDATE prop_firms
  SET current_profit = 0, updated_at = now()
  WHERE id = _prop_firm_id;
  
  RETURN _new_cycle_id;
END;
$$;

-- 10. Create function to get active cycle for an account
CREATE OR REPLACE FUNCTION public.get_active_cycle(_prop_firm_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM account_cycles 
  WHERE prop_firm_id = _prop_firm_id AND status = 'active'
  LIMIT 1;
$$;

-- 11. Trigger to auto-create first cycle when a funded account is created
CREATE OR REPLACE FUNCTION public.create_initial_cycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.account_type = 'Funded' AND NEW.funded_balance IS NOT NULL THEN
    INSERT INTO account_cycles (
      prop_firm_id,
      user_id,
      cycle_number,
      starting_balance,
      profit_target,
      status
    ) VALUES (
      NEW.id,
      NEW.user_id,
      1,
      NEW.funded_balance,
      NEW.profit_target,
      'active'
    )
    ON CONFLICT (prop_firm_id, cycle_number) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_create_initial_cycle
AFTER INSERT ON public.prop_firms
FOR EACH ROW
EXECUTE FUNCTION public.create_initial_cycle();

-- 12. Add updated_at trigger for account_cycles
CREATE TRIGGER update_account_cycles_updated_at
BEFORE UPDATE ON public.account_cycles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();