-- 1) Function to recalculate prop_firms current_profit and equity based on trades
CREATE OR REPLACE FUNCTION public.recalculate_prop_firm_financials(_prop_firm_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _account record;
  _base_balance numeric;
  _total_profit numeric;
  _active_cycle_id uuid;
BEGIN
  -- Get account info
  SELECT * INTO _account
  FROM prop_firms
  WHERE id = _prop_firm_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Determine base balance
  IF _account.account_type = 'Funded' AND _account.funded_balance IS NOT NULL THEN
    _base_balance := _account.funded_balance;
  ELSE
    _base_balance := COALESCE(_account.balance, 0);
  END IF;
  
  -- Calculate current_profit based on account type
  IF _account.account_type = 'Funded' THEN
    -- For Funded accounts, only sum trades from active cycle
    SELECT id INTO _active_cycle_id
    FROM account_cycles
    WHERE prop_firm_id = _prop_firm_id AND status = 'active'
    LIMIT 1;
    
    IF _active_cycle_id IS NOT NULL THEN
      SELECT COALESCE(SUM(profit), 0) INTO _total_profit
      FROM trades
      WHERE cycle_id = _active_cycle_id;
    ELSE
      _total_profit := 0;
    END IF;
  ELSE
    -- For non-funded accounts, sum all trades for this account
    SELECT COALESCE(SUM(profit), 0) INTO _total_profit
    FROM trades
    WHERE prop_firm_id = _prop_firm_id;
  END IF;
  
  -- Update the account
  UPDATE prop_firms
  SET 
    current_profit = _total_profit,
    equity = _base_balance + _total_profit,
    updated_at = now()
  WHERE id = _prop_firm_id;
END;
$$;

-- 2) Trigger function to auto-assign cycle_id for funded account trades
CREATE OR REPLACE FUNCTION public.auto_assign_trade_cycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _account_type text;
  _active_cycle_id uuid;
BEGIN
  -- Only process if prop_firm_id is set and cycle_id is not set
  IF NEW.prop_firm_id IS NOT NULL AND NEW.cycle_id IS NULL THEN
    -- Check if this is a Funded account
    SELECT account_type INTO _account_type
    FROM prop_firms
    WHERE id = NEW.prop_firm_id;
    
    IF _account_type = 'Funded' THEN
      -- Get the active cycle
      SELECT id INTO _active_cycle_id
      FROM account_cycles
      WHERE prop_firm_id = NEW.prop_firm_id AND status = 'active'
      LIMIT 1;
      
      IF _active_cycle_id IS NOT NULL THEN
        NEW.cycle_id := _active_cycle_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3) Trigger function to recalculate financials after trade changes
CREATE OR REPLACE FUNCTION public.trigger_recalculate_financials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.prop_firm_id IS NOT NULL THEN
      PERFORM recalculate_prop_firm_financials(OLD.prop_firm_id);
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If prop_firm_id changed, recalculate both
    IF OLD.prop_firm_id IS DISTINCT FROM NEW.prop_firm_id THEN
      IF OLD.prop_firm_id IS NOT NULL THEN
        PERFORM recalculate_prop_firm_financials(OLD.prop_firm_id);
      END IF;
      IF NEW.prop_firm_id IS NOT NULL THEN
        PERFORM recalculate_prop_firm_financials(NEW.prop_firm_id);
      END IF;
    ELSIF NEW.prop_firm_id IS NOT NULL THEN
      -- Same prop_firm, but profit might have changed
      PERFORM recalculate_prop_firm_financials(NEW.prop_firm_id);
    END IF;
    RETURN NEW;
  ELSE
    -- INSERT
    IF NEW.prop_firm_id IS NOT NULL THEN
      PERFORM recalculate_prop_firm_financials(NEW.prop_firm_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

-- 4) Create the BEFORE INSERT trigger for auto cycle assignment
DROP TRIGGER IF EXISTS trades_auto_assign_cycle ON trades;
CREATE TRIGGER trades_auto_assign_cycle
  BEFORE INSERT ON trades
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_trade_cycle();

-- 5) Create the AFTER INSERT/UPDATE/DELETE trigger for recalculating financials
DROP TRIGGER IF EXISTS trades_recalculate_financials ON trades;
CREATE TRIGGER trades_recalculate_financials
  AFTER INSERT OR UPDATE OR DELETE ON trades
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_financials();

-- 6) Update close_cycle_and_start_new to also reset equity correctly
CREATE OR REPLACE FUNCTION public.close_cycle_and_start_new(_prop_firm_id uuid, _withdrawn_amount numeric, _payout_proof_url text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
  
  -- Reset current_profit to 0 and equity to funded_balance (since new cycle starts fresh)
  UPDATE prop_firms
  SET 
    current_profit = 0, 
    equity = _funded_balance,
    updated_at = now()
  WHERE id = _prop_firm_id;
  
  RETURN _new_cycle_id;
END;
$$;