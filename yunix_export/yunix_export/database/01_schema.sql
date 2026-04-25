--
-- PostgreSQL database dump
--

\restrict qbOrNrSGhmL73poEZr2fTyIWXfTDcRDBq5v1QUIvajz17xNsQtaUCeA5SDbGFUL

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'SQL_ASCII';
SET standard_conforming_strings = off;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET escape_string_warning = off;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: account_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.account_status AS ENUM (
    'In Progress',
    'Passed',
    'Failed'
);


--
-- Name: account_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.account_type AS ENUM (
    'Personal',
    'Evaluation',
    'Funded'
);


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user'
);


--
-- Name: prop_firm_account_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.prop_firm_account_type AS ENUM (
    'Personal',
    'Funded',
    'Evaluation 1',
    'Evaluation 2',
    'Evaluation 3'
);


--
-- Name: auto_assign_trade_cycle(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_assign_trade_cycle() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: close_cycle_and_start_new(uuid, numeric, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.close_cycle_and_start_new(_prop_firm_id uuid, _withdrawn_amount numeric, _payout_proof_url text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: create_initial_cycle(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_initial_cycle() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: decrement_loyalty_on_order_refund(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.decrement_loyalty_on_order_refund() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only trigger when order is rejected or refunded
  IF (NEW.status = 'Rejected' OR NEW.ceo_action = 'rejected') AND 
     OLD.status NOT IN ('Rejected') THEN
    
    UPDATE loyalty_progress 
    SET 
      completed_orders = GREATEST(0, completed_orders - 1),
      updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: generate_referral_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_referral_code() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    -- Generate 8 character alphanumeric code
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM referral_links WHERE code = new_code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;


--
-- Name: get_active_cycle(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_active_cycle(_prop_firm_id uuid) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT id FROM account_cycles 
  WHERE prop_firm_id = _prop_firm_id AND status = 'active'
  LIMIT 1;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(TRIM(CONCAT(
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        ' ',
        COALESCE(NEW.raw_user_meta_data->>'last_name', '')
      )), ''),
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
    )
  );
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


--
-- Name: increment_loyalty_on_order_approved(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_loyalty_on_order_approved() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  current_progress record;
  orders_needed integer := 9;
BEGIN
  -- Only trigger when status changes to 'Approved' and payment is confirmed
  IF NEW.status = 'Approved' AND NEW.payment_status = 'confirmed' AND 
     (OLD.status != 'Approved' OR OLD.payment_status != 'confirmed') THEN
    
    -- Get or create loyalty progress
    SELECT * INTO current_progress FROM loyalty_progress WHERE user_id = NEW.user_id;
    
    IF NOT FOUND THEN
      -- Create new loyalty progress record
      INSERT INTO loyalty_progress (user_id, completed_orders)
      VALUES (NEW.user_id, 1);
    ELSE
      -- Don't increment if admin locked
      IF current_progress.admin_locked THEN
        RETURN NEW;
      END IF;
      
      -- Increment completed orders
      UPDATE loyalty_progress 
      SET 
        completed_orders = current_progress.completed_orders + 1,
        discount_status = CASE 
          WHEN current_progress.completed_orders + 1 >= orders_needed AND current_progress.discount_status = 'locked'
          THEN 'unlocked' 
          ELSE current_progress.discount_status 
        END,
        discount_unlocked_at = CASE 
          WHEN current_progress.completed_orders + 1 >= orders_needed AND current_progress.discount_status = 'locked'
          THEN now() 
          ELSE current_progress.discount_unlocked_at 
        END,
        updated_at = now()
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: is_ceo(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_ceo(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff s
    JOIN public.admin_roles r ON s.role_id = r.id
    WHERE s.user_id = _user_id AND r.name = 'CEO'
  )
$$;


--
-- Name: link_staff_account(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.link_staff_account(_user_id uuid, _user_email text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.staff
  SET user_id = _user_id, status = 'active', updated_at = now()
  WHERE lower(email) = lower(_user_email)
    AND (user_id IS NULL OR user_id = _user_id);
  
  RETURN FOUND;
END;
$$;


--
-- Name: log_admin_action(text, text, uuid, jsonb, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_admin_action(_action_type text, _target_table text, _target_id uuid, _old_value jsonb, _new_value jsonb, _reason text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  current_staff record;
  log_id uuid;
BEGIN
  -- Get current staff info
  SELECT s.id, s.email INTO current_staff
  FROM staff s
  WHERE s.user_id = auth.uid();
  
  -- Insert audit log
  INSERT INTO admin_audit_logs (
    admin_id, admin_email, action_type, target_table, target_id,
    old_value, new_value, reason
  ) VALUES (
    current_staff.id, current_staff.email, _action_type, _target_table, _target_id,
    _old_value, _new_value, _reason
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;


--
-- Name: log_order_status_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_order_status_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Log order status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.order_status_history (order_id, previous_status, new_status, status_type, changed_by_type)
    VALUES (NEW.id, OLD.status, NEW.status, 'order', 'system');
  END IF;
  
  -- Log payment status change
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    INSERT INTO public.order_status_history (order_id, previous_status, new_status, status_type, changed_by_type)
    VALUES (NEW.id, OLD.payment_status, NEW.payment_status, 'payment', 'system');
  END IF;
  
  -- Log delivery status change
  IF OLD.delivery_status IS DISTINCT FROM NEW.delivery_status THEN
    INSERT INTO public.order_status_history (order_id, previous_status, new_status, status_type, changed_by_type)
    VALUES (NEW.id, OLD.delivery_status, NEW.delivery_status, 'delivery', 'system');
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: recalculate_prop_firm_financials(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.recalculate_prop_firm_financials(_prop_firm_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: staff_has_permission(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.staff_has_permission(_user_id uuid, _permission text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff s
    JOIN public.admin_roles r ON s.role_id = r.id
    WHERE s.user_id = _user_id 
    AND (r.name = 'CEO' OR (r.permissions->>_permission)::boolean = true)
  )
$$;


--
-- Name: trigger_recalculate_financials(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_recalculate_financials() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account_cycles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_cycles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prop_firm_id uuid NOT NULL,
    user_id uuid NOT NULL,
    cycle_number integer DEFAULT 1 NOT NULL,
    starting_balance numeric NOT NULL,
    ending_balance numeric,
    withdrawn_amount numeric DEFAULT 0,
    profit_target numeric,
    max_drawdown_percentage numeric,
    status text DEFAULT 'active'::text NOT NULL,
    start_date timestamp with time zone DEFAULT now() NOT NULL,
    end_date timestamp with time zone,
    payout_proof_url text,
    notes text,
    migration_note text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT account_cycles_status_check CHECK ((status = ANY (ARRAY['active'::text, 'closed'::text])))
);


--
-- Name: account_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    prop_firm_id uuid,
    balance numeric,
    equity numeric,
    floating_pnl numeric,
    margin_used numeric,
    free_margin numeric,
    open_trades integer,
    screenshot_url text,
    extracted_data jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: admin_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid,
    admin_email text,
    action_type text NOT NULL,
    target_table text NOT NULL,
    target_id uuid,
    old_value jsonb,
    new_value jsonb,
    reason text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    permissions jsonb DEFAULT '{"manage_roles": false, "manage_users": false, "view_reports": false, "view_invoices": false, "manage_courses": false, "manage_finance": false, "manage_support": false, "view_dashboard": false, "manage_settings": false, "manage_analytics": false}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: bridge_activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bridge_activity_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    prop_firm_id uuid,
    action_type text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    request_payload jsonb,
    response_payload jsonb,
    error_message text,
    execution_time_ms integer,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: bridge_user_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bridge_user_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    auto_sync_enabled boolean DEFAULT true NOT NULL,
    sync_interval_minutes integer DEFAULT 30 NOT NULL,
    notifications_enabled boolean DEFAULT true NOT NULL,
    sync_trades boolean DEFAULT true NOT NULL,
    sync_positions boolean DEFAULT true NOT NULL,
    sync_balance boolean DEFAULT true NOT NULL,
    last_sync_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ceo_telegram_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ceo_telegram_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    telegram_chat_id bigint NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    group_chat_id bigint,
    auto_notify_new_orders boolean DEFAULT true
);


--
-- Name: certificates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.certificates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    file_url text NOT NULL,
    file_type text NOT NULL,
    prop_firm_id uuid,
    issued_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chat_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text DEFAULT 'New Chat'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chat_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text])))
);


--
-- Name: courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    description text,
    category text,
    thumbnail_url text,
    video_url text,
    resources jsonb DEFAULT '[]'::jsonb,
    author_id uuid,
    published boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    level text DEFAULT 'beginner'::text,
    hours numeric DEFAULT 0
);


--
-- Name: daily_checkins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_checkins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    checkin_date date DEFAULT CURRENT_DATE NOT NULL,
    mood text,
    confidence_level integer,
    stress_level integer,
    sleep_quality text,
    trading_plan text,
    planned_pairs text[],
    daily_risk_limit numeric,
    max_trades integer,
    ai_response text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: delivery_bot_agents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_bot_agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id uuid,
    telegram_chat_id bigint,
    telegram_username text,
    is_active boolean DEFAULT true,
    linked_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: delivery_pricing; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_pricing (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    city_name text NOT NULL,
    delivery_fee numeric DEFAULT 0 NOT NULL,
    is_free boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_fallback boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: discount_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discount_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    description text,
    discount_type text NOT NULL,
    discount_value numeric NOT NULL,
    max_uses integer,
    current_uses integer DEFAULT 0,
    min_order_value numeric,
    max_discount numeric,
    valid_from timestamp with time zone,
    valid_until timestamp with time zone,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT discount_codes_discount_type_check CHECK ((discount_type = ANY (ARRAY['percentage'::text, 'fixed'::text])))
);


--
-- Name: discount_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discount_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value jsonb DEFAULT '{}'::jsonb NOT NULL,
    description text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid
);


--
-- Name: final_certificates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.final_certificates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    certificate_url text NOT NULL,
    issued_by uuid NOT NULL,
    issued_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: lessons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lessons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    title text NOT NULL,
    content text,
    video_url text,
    order_index integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: loyalty_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loyalty_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    completed_orders integer DEFAULT 0 NOT NULL,
    current_cycle integer DEFAULT 1 NOT NULL,
    discount_status text DEFAULT 'locked'::text NOT NULL,
    discount_unlocked_at timestamp with time zone,
    discount_used_at timestamp with time zone,
    discount_used_on_order_id uuid,
    admin_locked boolean DEFAULT false NOT NULL,
    admin_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT loyalty_progress_discount_status_check CHECK ((discount_status = ANY (ARRAY['locked'::text, 'unlocked'::text, 'used'::text])))
);


--
-- Name: mt5_bridge_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mt5_bridge_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bridge_url text NOT NULL,
    bridge_api_key text,
    is_active boolean DEFAULT true,
    sync_interval_minutes integer DEFAULT 30,
    last_global_sync_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT mt5_bridge_config_sync_interval_minutes_check CHECK (((sync_interval_minutes >= 20) AND (sync_interval_minutes <= 60)))
);


--
-- Name: open_positions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.open_positions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    prop_firm_id uuid NOT NULL,
    mt5_ticket bigint NOT NULL,
    symbol text NOT NULL,
    trade_type text NOT NULL,
    volume numeric NOT NULL,
    open_price numeric NOT NULL,
    current_price numeric,
    take_profit numeric,
    stop_loss numeric,
    unrealized_pnl numeric DEFAULT 0,
    open_time timestamp with time zone NOT NULL,
    last_updated timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: order_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    previous_status text,
    new_status text NOT NULL,
    status_type text DEFAULT 'order'::text NOT NULL,
    changed_by uuid,
    changed_by_type text DEFAULT 'system'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: partner_rewards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_rewards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    status text DEFAULT 'not_eligible'::text NOT NULL,
    discount_percentage integer DEFAULT 60 NOT NULL,
    discount_cap numeric DEFAULT 25 NOT NULL,
    approved_at timestamp with time zone,
    approved_by uuid,
    used_at timestamp with time zone,
    used_on_order_id uuid,
    revoked_at timestamp with time zone,
    revoked_by uuid,
    revoked_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT partner_rewards_status_check CHECK ((status = ANY (ARRAY['not_eligible'::text, 'under_review'::text, 'eligible'::text, 'approved'::text, 'used'::text, 'revoked'::text])))
);


--
-- Name: password_reset_otps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_otps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    otp_code text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payouts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    prop_firm_id uuid,
    amount numeric,
    payout_date date,
    trader_name text,
    firm_name text,
    certificate_url text NOT NULL,
    extracted_data jsonb,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: plaque_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plaque_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    certificate_id uuid,
    full_name text NOT NULL,
    shipping_address text NOT NULL,
    phone text NOT NULL,
    size text NOT NULL,
    delivery_method text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    notes text,
    status text DEFAULT 'Pending'::text NOT NULL,
    invoice_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    price numeric DEFAULT 0,
    approved_at timestamp with time zone,
    approved_by uuid,
    pricing_id uuid,
    payment_status text DEFAULT 'unpaid'::text,
    ceo_action text,
    ceo_action_reason text,
    ceo_action_at timestamp with time zone,
    ceo_action_by uuid,
    delivery_status text,
    shipped_at timestamp with time zone,
    shipped_by uuid,
    delivered_at timestamp with time zone,
    delivered_by uuid,
    customer_confirmed_at timestamp with time zone,
    delivery_confirmation_code text,
    customer_confirmation_requested_at timestamp with time zone,
    final_certificate_id uuid,
    delivery_city text,
    delivery_fee numeric DEFAULT 0,
    delivery_type text DEFAULT 'Paid'::text,
    discount_code_id uuid,
    discount_amount numeric DEFAULT 0,
    CONSTRAINT plaque_orders_ceo_action_check CHECK (((ceo_action IS NULL) OR (ceo_action = ANY (ARRAY['approved'::text, 'rejected'::text])))),
    CONSTRAINT plaque_orders_delivery_method_check CHECK ((delivery_method = ANY (ARRAY['Standard'::text, 'Express'::text]))),
    CONSTRAINT plaque_orders_payment_status_check CHECK ((payment_status = ANY (ARRAY['unpaid'::text, 'pending'::text, 'received'::text, 'paid'::text, 'rejected'::text]))),
    CONSTRAINT plaque_orders_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT plaque_orders_status_check CHECK ((status = ANY (ARRAY['Pending'::text, 'Awaiting Approval'::text, 'Delivered'::text, 'Rejected'::text, 'Processing'::text])))
);


--
-- Name: plaque_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plaque_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    user_id uuid NOT NULL,
    amount numeric NOT NULL,
    payment_method text NOT NULL,
    proof_image_url text,
    full_name text NOT NULL,
    phone text NOT NULL,
    email text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    received_at timestamp with time zone,
    received_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT plaque_payments_payment_method_check CHECK ((payment_method = ANY (ARRAY['telebirr'::text, 'crypto'::text, 'bank'::text]))),
    CONSTRAINT plaque_payments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'received'::text, 'rejected'::text])))
);


--
-- Name: plaque_prices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plaque_prices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    size_name text NOT NULL,
    dimensions text NOT NULL,
    price numeric DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    express_surcharge numeric DEFAULT 20
);


--
-- Name: portfolio_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portfolio_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    prop_firm_id uuid,
    balance numeric DEFAULT 0 NOT NULL,
    equity numeric DEFAULT 0 NOT NULL,
    margin numeric DEFAULT 0,
    free_margin numeric DEFAULT 0,
    margin_level numeric DEFAULT 0,
    profit numeric DEFAULT 0,
    open_positions_count integer DEFAULT 0,
    snapshot_type text DEFAULT 'auto'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    name text,
    bio text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    account_type public.account_type DEFAULT 'Personal'::public.account_type NOT NULL,
    telegram_chat_id bigint,
    telegram_link_code text,
    telegram_linked_at timestamp with time zone
);


--
-- Name: COLUMN profiles.account_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.account_type IS 'Type of trading account: Personal, Evaluation, or Funded';


--
-- Name: prop_firm_certificate_sizes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prop_firm_certificate_sizes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prop_firm_name text NOT NULL,
    certificate_type text NOT NULL,
    size text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: prop_firms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prop_firms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    account_number text,
    balance numeric(12,2),
    equity numeric(12,2),
    profit_target numeric(12,2),
    current_profit numeric(12,2) DEFAULT 0,
    consistency_percentage numeric(5,2),
    dashboard_screenshot_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    account_type public.prop_firm_account_type DEFAULT 'Personal'::public.prop_firm_account_type NOT NULL,
    account_status public.account_status DEFAULT 'In Progress'::public.account_status,
    funded_balance numeric,
    investor_password text,
    mt5_server text,
    mt5_login text,
    investor_password_encrypted text,
    encryption_iv text,
    bridge_url text,
    bridge_api_key text,
    last_sync_at timestamp with time zone,
    sync_status text DEFAULT 'never'::text,
    auto_sync_enabled boolean DEFAULT true
);


--
-- Name: COLUMN prop_firms.account_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.prop_firms.account_type IS 'Type of prop firm account';


--
-- Name: COLUMN prop_firms.funded_balance; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.prop_firms.funded_balance IS 'Immutable original funded amount for funded accounts. Used as starting_balance for all cycles.';


--
-- Name: COLUMN prop_firms.investor_password; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.prop_firms.investor_password IS 'MT5 investor password for read-only access';


--
-- Name: COLUMN prop_firms.mt5_server; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.prop_firms.mt5_server IS 'MT5 broker server name (e.g., ICMarkets-MT5)';


--
-- Name: COLUMN prop_firms.mt5_login; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.prop_firms.mt5_login IS 'MT5 login ID if different from account_number';


--
-- Name: referral_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    code text NOT NULL,
    total_signups integer DEFAULT 0 NOT NULL,
    qualified_referrals integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    banned_at timestamp with time zone,
    banned_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: referrals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referrals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referrer_id uuid NOT NULL,
    referred_user_id uuid NOT NULL,
    referral_link_id uuid NOT NULL,
    signup_at timestamp with time zone DEFAULT now() NOT NULL,
    first_order_id uuid,
    first_order_at timestamp with time zone,
    is_qualified boolean DEFAULT false NOT NULL,
    is_suspicious boolean DEFAULT false NOT NULL,
    suspicious_reason text,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: social_media_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.social_media_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_by uuid,
    platform text NOT NULL,
    post_url text NOT NULL,
    campaign_name text,
    post_title text,
    views integer DEFAULT 0,
    likes integer DEFAULT 0,
    shares integer DEFAULT 0,
    comments integer DEFAULT 0,
    clicks integer DEFAULT 0,
    posted_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT social_media_posts_platform_check CHECK ((platform = ANY (ARRAY['youtube'::text, 'tiktok'::text, 'instagram'::text, 'twitter'::text, 'facebook'::text, 'linkedin'::text])))
);


--
-- Name: staff; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    name text NOT NULL,
    email text NOT NULL,
    role_id uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    invited_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    invite_token text,
    CONSTRAINT staff_status_check CHECK ((status = ANY (ARRAY['active'::text, 'pending'::text, 'suspended'::text])))
);


--
-- Name: staff_reminders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_reminders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_by uuid NOT NULL,
    assigned_to uuid NOT NULL,
    title text NOT NULL,
    description text,
    priority text DEFAULT 'normal'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    due_date timestamp with time zone,
    completed_at timestamp with time zone,
    completed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: student_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    course_id uuid NOT NULL,
    lesson_id uuid,
    completed boolean DEFAULT false,
    progress_percentage numeric DEFAULT 0,
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: support_group_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_group_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_chat_id bigint NOT NULL,
    group_name text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: support_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    message text NOT NULL,
    is_staff_reply boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: support_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    category text DEFAULT 'general'::text,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    assigned_to uuid,
    subject text NOT NULL,
    message text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    category text DEFAULT 'general'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    telegram_user_chat_id bigint,
    telegram_thread_id text,
    escalated boolean DEFAULT false,
    escalated_at timestamp with time zone,
    escalated_by uuid,
    CONSTRAINT support_tickets_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT support_tickets_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'resolved'::text, 'closed'::text]))),
    CONSTRAINT support_tickets_user_or_telegram_required CHECK (((user_id IS NOT NULL) OR (telegram_user_chat_id IS NOT NULL)))
);


--
-- Name: sync_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sync_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    prop_firm_id uuid NOT NULL,
    status text NOT NULL,
    trades_synced integer DEFAULT 0,
    positions_synced integer DEFAULT 0,
    error_message text,
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid
);


--
-- Name: telegram_broadcast_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telegram_broadcast_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    broadcast_id uuid NOT NULL,
    recipient_chat_id bigint NOT NULL,
    recipient_email text,
    status text NOT NULL,
    error_message text,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT telegram_broadcast_logs_status_check CHECK ((status = ANY (ARRAY['sent'::text, 'failed'::text])))
);


--
-- Name: telegram_broadcasts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telegram_broadcasts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    image_url text,
    target_audience text DEFAULT 'all'::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    sent_at timestamp with time zone,
    scheduled_for timestamp with time zone,
    total_recipients integer DEFAULT 0,
    successful_sends integer DEFAULT 0,
    failed_sends integer DEFAULT 0,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT telegram_broadcasts_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'scheduled'::text, 'failed'::text]))),
    CONSTRAINT telegram_broadcasts_target_audience_check CHECK ((target_audience = ANY (ARRAY['all'::text, 'verified'::text])))
);


--
-- Name: telegram_otp; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telegram_otp (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    email text NOT NULL,
    otp_code text NOT NULL,
    link_token text NOT NULL,
    purpose text DEFAULT 'verification'::text NOT NULL,
    telegram_chat_id bigint,
    verified boolean DEFAULT false,
    used boolean DEFAULT false,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: telegram_support_agents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telegram_support_agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id uuid,
    telegram_chat_id bigint,
    telegram_username text,
    role text DEFAULT 'support'::text NOT NULL,
    is_active boolean DEFAULT true,
    linked_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pending_reply_ticket_id uuid,
    CONSTRAINT telegram_support_agents_role_check CHECK ((role = ANY (ARRAY['support'::text, 'ceo'::text])))
);


--
-- Name: testimonials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.testimonials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    role text NOT NULL,
    company text,
    quote text NOT NULL,
    rating integer DEFAULT 5 NOT NULL,
    approved boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT testimonials_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: ticket_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    sender_type text NOT NULL,
    sender_id uuid,
    sender_name text,
    message text NOT NULL,
    telegram_message_id bigint,
    has_attachment boolean DEFAULT false,
    attachment_type text,
    created_at timestamp with time zone DEFAULT now(),
    attachment_url text,
    CONSTRAINT ticket_messages_sender_type_check CHECK ((sender_type = ANY (ARRAY['user'::text, 'support'::text, 'ceo'::text])))
);


--
-- Name: trades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trades (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    prop_firm_id uuid,
    pair text NOT NULL,
    profit numeric NOT NULL,
    session text,
    emotion text,
    notes text,
    trade_date date NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    screenshot_url text,
    screenshots text[] DEFAULT '{}'::text[],
    video_url text,
    cycle_id uuid,
    trade_type text,
    volume numeric,
    entry_price numeric,
    take_profit numeric,
    stop_loss numeric,
    close_price numeric,
    open_time timestamp with time zone,
    close_time timestamp with time zone,
    mt5_ticket bigint,
    is_synced boolean DEFAULT false,
    emotion_tag text,
    rule_broken boolean DEFAULT false,
    mistake_tags text[] DEFAULT '{}'::text[]
);


--
-- Name: COLUMN trades.trade_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trades.trade_type IS 'Buy or Sell';


--
-- Name: COLUMN trades.volume; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trades.volume IS 'Lot size';


--
-- Name: COLUMN trades.entry_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trades.entry_price IS 'Trade open price';


--
-- Name: COLUMN trades.take_profit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trades.take_profit IS 'Take profit price level';


--
-- Name: COLUMN trades.stop_loss; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trades.stop_loss IS 'Stop loss price level';


--
-- Name: COLUMN trades.close_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trades.close_price IS 'Trade close price';


--
-- Name: COLUMN trades.open_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trades.open_time IS 'Exact trade open timestamp';


--
-- Name: COLUMN trades.close_time; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trades.close_time IS 'Exact trade close timestamp';


--
-- Name: COLUMN trades.mt5_ticket; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trades.mt5_ticket IS 'MT5 position ticket ID';


--
-- Name: COLUMN trades.is_synced; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trades.is_synced IS 'Whether trade was imported from MT5';


--
-- Name: COLUMN trades.emotion_tag; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trades.emotion_tag IS 'Structured emotion tag: calm, confident, fearful, greedy, fomo, revenge, frustrated';


--
-- Name: COLUMN trades.rule_broken; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trades.rule_broken IS 'Whether the trader broke their trading rules on this trade';


--
-- Name: COLUMN trades.mistake_tags; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.trades.mistake_tags IS 'Array of mistake tags: early_entry, late_entry, moved_sl, removed_tp, oversized, revenge_trade, fomo_trade, chased_price';


--
-- Name: user_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    account_name text NOT NULL,
    mt5_login text NOT NULL,
    mt5_server text NOT NULL,
    investor_password_encrypted text,
    encryption_iv text,
    prop_firm_id uuid,
    is_active boolean DEFAULT true,
    sync_status text DEFAULT 'pending'::text,
    last_sync_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'user'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_strategies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_strategies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    rule_text text NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_telegram_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_telegram_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    telegram_chat_id bigint NOT NULL,
    telegram_username text,
    current_ticket_id uuid,
    session_state text DEFAULT 'idle'::text,
    selected_category text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_telegram_sessions_session_state_check CHECK ((session_state = ANY (ARRAY['idle'::text, 'selecting_category'::text, 'awaiting_message'::text, 'in_conversation'::text])))
);


--
-- Name: account_cycles account_cycles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_cycles
    ADD CONSTRAINT account_cycles_pkey PRIMARY KEY (id);


--
-- Name: account_cycles account_cycles_prop_firm_id_cycle_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_cycles
    ADD CONSTRAINT account_cycles_prop_firm_id_cycle_number_key UNIQUE (prop_firm_id, cycle_number);


--
-- Name: account_snapshots account_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_snapshots
    ADD CONSTRAINT account_snapshots_pkey PRIMARY KEY (id);


--
-- Name: admin_audit_logs admin_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_logs
    ADD CONSTRAINT admin_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: admin_roles admin_roles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_roles
    ADD CONSTRAINT admin_roles_name_key UNIQUE (name);


--
-- Name: admin_roles admin_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_roles
    ADD CONSTRAINT admin_roles_pkey PRIMARY KEY (id);


--
-- Name: bridge_activity_logs bridge_activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bridge_activity_logs
    ADD CONSTRAINT bridge_activity_logs_pkey PRIMARY KEY (id);


--
-- Name: bridge_user_settings bridge_user_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bridge_user_settings
    ADD CONSTRAINT bridge_user_settings_pkey PRIMARY KEY (id);


--
-- Name: bridge_user_settings bridge_user_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bridge_user_settings
    ADD CONSTRAINT bridge_user_settings_user_id_key UNIQUE (user_id);


--
-- Name: ceo_telegram_config ceo_telegram_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ceo_telegram_config
    ADD CONSTRAINT ceo_telegram_config_pkey PRIMARY KEY (id);


--
-- Name: ceo_telegram_config ceo_telegram_config_telegram_chat_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ceo_telegram_config
    ADD CONSTRAINT ceo_telegram_config_telegram_chat_id_key UNIQUE (telegram_chat_id);


--
-- Name: certificates certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_pkey PRIMARY KEY (id);


--
-- Name: chat_conversations chat_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: courses courses_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_slug_key UNIQUE (slug);


--
-- Name: daily_checkins daily_checkins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_checkins
    ADD CONSTRAINT daily_checkins_pkey PRIMARY KEY (id);


--
-- Name: daily_checkins daily_checkins_user_id_checkin_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_checkins
    ADD CONSTRAINT daily_checkins_user_id_checkin_date_key UNIQUE (user_id, checkin_date);


--
-- Name: delivery_bot_agents delivery_bot_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_bot_agents
    ADD CONSTRAINT delivery_bot_agents_pkey PRIMARY KEY (id);


--
-- Name: delivery_bot_agents delivery_bot_agents_telegram_chat_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_bot_agents
    ADD CONSTRAINT delivery_bot_agents_telegram_chat_id_key UNIQUE (telegram_chat_id);


--
-- Name: delivery_pricing delivery_pricing_city_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_pricing
    ADD CONSTRAINT delivery_pricing_city_name_key UNIQUE (city_name);


--
-- Name: delivery_pricing delivery_pricing_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_pricing
    ADD CONSTRAINT delivery_pricing_pkey PRIMARY KEY (id);


--
-- Name: discount_codes discount_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_codes
    ADD CONSTRAINT discount_codes_code_key UNIQUE (code);


--
-- Name: discount_codes discount_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_codes
    ADD CONSTRAINT discount_codes_pkey PRIMARY KEY (id);


--
-- Name: discount_rules discount_rules_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_rules
    ADD CONSTRAINT discount_rules_key_key UNIQUE (key);


--
-- Name: discount_rules discount_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_rules
    ADD CONSTRAINT discount_rules_pkey PRIMARY KEY (id);


--
-- Name: final_certificates final_certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.final_certificates
    ADD CONSTRAINT final_certificates_pkey PRIMARY KEY (id);


--
-- Name: lessons lessons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_pkey PRIMARY KEY (id);


--
-- Name: loyalty_progress loyalty_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_progress
    ADD CONSTRAINT loyalty_progress_pkey PRIMARY KEY (id);


--
-- Name: loyalty_progress loyalty_progress_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_progress
    ADD CONSTRAINT loyalty_progress_user_id_key UNIQUE (user_id);


--
-- Name: mt5_bridge_config mt5_bridge_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mt5_bridge_config
    ADD CONSTRAINT mt5_bridge_config_pkey PRIMARY KEY (id);


--
-- Name: open_positions open_positions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.open_positions
    ADD CONSTRAINT open_positions_pkey PRIMARY KEY (id);


--
-- Name: open_positions open_positions_prop_firm_id_mt5_ticket_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.open_positions
    ADD CONSTRAINT open_positions_prop_firm_id_mt5_ticket_key UNIQUE (prop_firm_id, mt5_ticket);


--
-- Name: order_status_history order_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_pkey PRIMARY KEY (id);


--
-- Name: partner_rewards partner_rewards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_rewards
    ADD CONSTRAINT partner_rewards_pkey PRIMARY KEY (id);


--
-- Name: partner_rewards partner_rewards_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_rewards
    ADD CONSTRAINT partner_rewards_user_id_key UNIQUE (user_id);


--
-- Name: password_reset_otps password_reset_otps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_otps
    ADD CONSTRAINT password_reset_otps_pkey PRIMARY KEY (id);


--
-- Name: payouts payouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payouts
    ADD CONSTRAINT payouts_pkey PRIMARY KEY (id);


--
-- Name: plaque_orders plaque_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plaque_orders
    ADD CONSTRAINT plaque_orders_pkey PRIMARY KEY (id);


--
-- Name: plaque_payments plaque_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plaque_payments
    ADD CONSTRAINT plaque_payments_pkey PRIMARY KEY (id);


--
-- Name: plaque_prices plaque_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plaque_prices
    ADD CONSTRAINT plaque_prices_pkey PRIMARY KEY (id);


--
-- Name: portfolio_snapshots portfolio_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_snapshots
    ADD CONSTRAINT portfolio_snapshots_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_telegram_chat_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_telegram_chat_id_key UNIQUE (telegram_chat_id);


--
-- Name: profiles profiles_telegram_link_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_telegram_link_code_key UNIQUE (telegram_link_code);


--
-- Name: prop_firm_certificate_sizes prop_firm_certificate_sizes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prop_firm_certificate_sizes
    ADD CONSTRAINT prop_firm_certificate_sizes_pkey PRIMARY KEY (id);


--
-- Name: prop_firms prop_firms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prop_firms
    ADD CONSTRAINT prop_firms_pkey PRIMARY KEY (id);


--
-- Name: referral_links referral_links_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_links
    ADD CONSTRAINT referral_links_code_key UNIQUE (code);


--
-- Name: referral_links referral_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_links
    ADD CONSTRAINT referral_links_pkey PRIMARY KEY (id);


--
-- Name: referral_links referral_links_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_links
    ADD CONSTRAINT referral_links_user_id_key UNIQUE (user_id);


--
-- Name: referrals referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_pkey PRIMARY KEY (id);


--
-- Name: referrals referrals_referred_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referred_user_id_key UNIQUE (referred_user_id);


--
-- Name: social_media_posts social_media_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_media_posts
    ADD CONSTRAINT social_media_posts_pkey PRIMARY KEY (id);


--
-- Name: staff staff_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_email_key UNIQUE (email);


--
-- Name: staff staff_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_pkey PRIMARY KEY (id);


--
-- Name: staff_reminders staff_reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_reminders
    ADD CONSTRAINT staff_reminders_pkey PRIMARY KEY (id);


--
-- Name: student_progress student_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_progress
    ADD CONSTRAINT student_progress_pkey PRIMARY KEY (id);


--
-- Name: student_progress student_progress_user_id_course_id_lesson_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_progress
    ADD CONSTRAINT student_progress_user_id_course_id_lesson_id_key UNIQUE (user_id, course_id, lesson_id);


--
-- Name: support_group_config support_group_config_group_chat_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_group_config
    ADD CONSTRAINT support_group_config_group_chat_id_key UNIQUE (group_chat_id);


--
-- Name: support_group_config support_group_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_group_config
    ADD CONSTRAINT support_group_config_pkey PRIMARY KEY (id);


--
-- Name: support_messages support_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_pkey PRIMARY KEY (id);


--
-- Name: support_templates support_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_templates
    ADD CONSTRAINT support_templates_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: sync_logs sync_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_logs
    ADD CONSTRAINT sync_logs_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_key_key UNIQUE (key);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: telegram_broadcast_logs telegram_broadcast_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_broadcast_logs
    ADD CONSTRAINT telegram_broadcast_logs_pkey PRIMARY KEY (id);


--
-- Name: telegram_broadcasts telegram_broadcasts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_broadcasts
    ADD CONSTRAINT telegram_broadcasts_pkey PRIMARY KEY (id);


--
-- Name: telegram_otp telegram_otp_link_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_otp
    ADD CONSTRAINT telegram_otp_link_token_key UNIQUE (link_token);


--
-- Name: telegram_otp telegram_otp_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_otp
    ADD CONSTRAINT telegram_otp_pkey PRIMARY KEY (id);


--
-- Name: telegram_support_agents telegram_support_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_support_agents
    ADD CONSTRAINT telegram_support_agents_pkey PRIMARY KEY (id);


--
-- Name: telegram_support_agents telegram_support_agents_telegram_chat_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_support_agents
    ADD CONSTRAINT telegram_support_agents_telegram_chat_id_key UNIQUE (telegram_chat_id);


--
-- Name: testimonials testimonials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.testimonials
    ADD CONSTRAINT testimonials_pkey PRIMARY KEY (id);


--
-- Name: ticket_messages ticket_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_messages
    ADD CONSTRAINT ticket_messages_pkey PRIMARY KEY (id);


--
-- Name: trades trades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trades
    ADD CONSTRAINT trades_pkey PRIMARY KEY (id);


--
-- Name: user_accounts user_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_accounts
    ADD CONSTRAINT user_accounts_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: user_strategies user_strategies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_strategies
    ADD CONSTRAINT user_strategies_pkey PRIMARY KEY (id);


--
-- Name: user_telegram_sessions user_telegram_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_telegram_sessions
    ADD CONSTRAINT user_telegram_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_telegram_sessions user_telegram_sessions_telegram_chat_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_telegram_sessions
    ADD CONSTRAINT user_telegram_sessions_telegram_chat_id_key UNIQUE (telegram_chat_id);


--
-- Name: idx_admin_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_audit_logs_action ON public.admin_audit_logs USING btree (action_type);


--
-- Name: idx_admin_audit_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_audit_logs_created ON public.admin_audit_logs USING btree (created_at DESC);


--
-- Name: idx_bridge_activity_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bridge_activity_logs_created_at ON public.bridge_activity_logs USING btree (created_at DESC);


--
-- Name: idx_bridge_activity_logs_prop_firm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bridge_activity_logs_prop_firm_id ON public.bridge_activity_logs USING btree (prop_firm_id);


--
-- Name: idx_bridge_activity_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bridge_activity_logs_user_id ON public.bridge_activity_logs USING btree (user_id);


--
-- Name: idx_chat_conversations_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_conversations_user_id ON public.chat_conversations USING btree (user_id);


--
-- Name: idx_chat_messages_conversation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_conversation_id ON public.chat_messages USING btree (conversation_id);


--
-- Name: idx_loyalty_progress_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loyalty_progress_status ON public.loyalty_progress USING btree (discount_status);


--
-- Name: idx_loyalty_progress_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loyalty_progress_user ON public.loyalty_progress USING btree (user_id);


--
-- Name: idx_order_status_history_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_status_history_created_at ON public.order_status_history USING btree (created_at DESC);


--
-- Name: idx_order_status_history_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_status_history_order_id ON public.order_status_history USING btree (order_id);


--
-- Name: idx_partner_rewards_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partner_rewards_status ON public.partner_rewards USING btree (status);


--
-- Name: idx_partner_rewards_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partner_rewards_user ON public.partner_rewards USING btree (user_id);


--
-- Name: idx_password_reset_otps_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_otps_email ON public.password_reset_otps USING btree (email);


--
-- Name: idx_password_reset_otps_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_otps_expires ON public.password_reset_otps USING btree (expires_at);


--
-- Name: idx_portfolio_snapshots_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portfolio_snapshots_created_at ON public.portfolio_snapshots USING btree (created_at DESC);


--
-- Name: idx_portfolio_snapshots_prop_firm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portfolio_snapshots_prop_firm_id ON public.portfolio_snapshots USING btree (prop_firm_id);


--
-- Name: idx_portfolio_snapshots_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portfolio_snapshots_user_id ON public.portfolio_snapshots USING btree (user_id);


--
-- Name: idx_profiles_telegram_chat_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_telegram_chat_id ON public.profiles USING btree (telegram_chat_id) WHERE (telegram_chat_id IS NOT NULL);


--
-- Name: idx_prop_firm_certificate_sizes_firm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prop_firm_certificate_sizes_firm ON public.prop_firm_certificate_sizes USING btree (prop_firm_name);


--
-- Name: idx_referral_links_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_links_code ON public.referral_links USING btree (code);


--
-- Name: idx_referral_links_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_links_user ON public.referral_links USING btree (user_id);


--
-- Name: idx_referrals_referred; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_referred ON public.referrals USING btree (referred_user_id);


--
-- Name: idx_referrals_referrer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_referrer ON public.referrals USING btree (referrer_id);


--
-- Name: idx_staff_invite_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_invite_token ON public.staff USING btree (invite_token);


--
-- Name: idx_telegram_broadcast_logs_broadcast_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_broadcast_logs_broadcast_id ON public.telegram_broadcast_logs USING btree (broadcast_id);


--
-- Name: idx_telegram_broadcasts_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_broadcasts_created_at ON public.telegram_broadcasts USING btree (created_at DESC);


--
-- Name: idx_telegram_broadcasts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_broadcasts_status ON public.telegram_broadcasts USING btree (status);


--
-- Name: idx_telegram_otp_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_otp_email ON public.telegram_otp USING btree (email);


--
-- Name: idx_telegram_otp_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_otp_expires ON public.telegram_otp USING btree (expires_at);


--
-- Name: idx_telegram_otp_link_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_otp_link_token ON public.telegram_otp USING btree (link_token);


--
-- Name: idx_trades_cycle_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trades_cycle_id ON public.trades USING btree (cycle_id);


--
-- Name: trades trades_auto_assign_cycle; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trades_auto_assign_cycle BEFORE INSERT ON public.trades FOR EACH ROW EXECUTE FUNCTION public.auto_assign_trade_cycle();


--
-- Name: trades trades_recalculate_financials; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trades_recalculate_financials AFTER INSERT OR DELETE OR UPDATE ON public.trades FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_financials();


--
-- Name: prop_firms trigger_create_initial_cycle; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_create_initial_cycle AFTER INSERT ON public.prop_firms FOR EACH ROW EXECUTE FUNCTION public.create_initial_cycle();


--
-- Name: plaque_orders trigger_log_order_status_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_log_order_status_change AFTER UPDATE ON public.plaque_orders FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();


--
-- Name: plaque_orders trigger_loyalty_decrement; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_loyalty_decrement AFTER UPDATE ON public.plaque_orders FOR EACH ROW EXECUTE FUNCTION public.decrement_loyalty_on_order_refund();


--
-- Name: plaque_orders trigger_loyalty_increment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_loyalty_increment AFTER UPDATE ON public.plaque_orders FOR EACH ROW EXECUTE FUNCTION public.increment_loyalty_on_order_approved();


--
-- Name: account_cycles update_account_cycles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_account_cycles_updated_at BEFORE UPDATE ON public.account_cycles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: admin_roles update_admin_roles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_admin_roles_updated_at BEFORE UPDATE ON public.admin_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bridge_user_settings update_bridge_user_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bridge_user_settings_updated_at BEFORE UPDATE ON public.bridge_user_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ceo_telegram_config update_ceo_telegram_config_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ceo_telegram_config_updated_at BEFORE UPDATE ON public.ceo_telegram_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: certificates update_certificates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_certificates_updated_at BEFORE UPDATE ON public.certificates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: chat_conversations update_chat_conversations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_chat_conversations_updated_at BEFORE UPDATE ON public.chat_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: courses update_courses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: delivery_bot_agents update_delivery_bot_agents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_delivery_bot_agents_updated_at BEFORE UPDATE ON public.delivery_bot_agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: delivery_pricing update_delivery_pricing_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_delivery_pricing_updated_at BEFORE UPDATE ON public.delivery_pricing FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: discount_codes update_discount_codes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_discount_codes_updated_at BEFORE UPDATE ON public.discount_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lessons update_lessons_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: mt5_bridge_config update_mt5_bridge_config_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_mt5_bridge_config_updated_at BEFORE UPDATE ON public.mt5_bridge_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: plaque_orders update_plaque_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_plaque_orders_updated_at BEFORE UPDATE ON public.plaque_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: plaque_payments update_plaque_payments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_plaque_payments_updated_at BEFORE UPDATE ON public.plaque_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: plaque_prices update_plaque_prices_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_plaque_prices_updated_at BEFORE UPDATE ON public.plaque_prices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: prop_firm_certificate_sizes update_prop_firm_certificate_sizes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_prop_firm_certificate_sizes_updated_at BEFORE UPDATE ON public.prop_firm_certificate_sizes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: prop_firms update_prop_firms_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_prop_firms_updated_at BEFORE UPDATE ON public.prop_firms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: social_media_posts update_social_media_posts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_social_media_posts_updated_at BEFORE UPDATE ON public.social_media_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: staff_reminders update_staff_reminders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_staff_reminders_updated_at BEFORE UPDATE ON public.staff_reminders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: staff update_staff_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: student_progress update_student_progress_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_student_progress_updated_at BEFORE UPDATE ON public.student_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: support_tickets update_support_tickets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: telegram_broadcasts update_telegram_broadcasts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_telegram_broadcasts_updated_at BEFORE UPDATE ON public.telegram_broadcasts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: testimonials update_testimonials_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_testimonials_updated_at BEFORE UPDATE ON public.testimonials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: trades update_trades_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_trades_updated_at BEFORE UPDATE ON public.trades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_accounts update_user_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_accounts_updated_at BEFORE UPDATE ON public.user_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: account_cycles account_cycles_prop_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_cycles
    ADD CONSTRAINT account_cycles_prop_firm_id_fkey FOREIGN KEY (prop_firm_id) REFERENCES public.prop_firms(id) ON DELETE CASCADE;


--
-- Name: account_snapshots account_snapshots_prop_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_snapshots
    ADD CONSTRAINT account_snapshots_prop_firm_id_fkey FOREIGN KEY (prop_firm_id) REFERENCES public.prop_firms(id);


--
-- Name: admin_audit_logs admin_audit_logs_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_logs
    ADD CONSTRAINT admin_audit_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.staff(id);


--
-- Name: bridge_activity_logs bridge_activity_logs_prop_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bridge_activity_logs
    ADD CONSTRAINT bridge_activity_logs_prop_firm_id_fkey FOREIGN KEY (prop_firm_id) REFERENCES public.prop_firms(id) ON DELETE CASCADE;


--
-- Name: certificates certificates_prop_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_prop_firm_id_fkey FOREIGN KEY (prop_firm_id) REFERENCES public.prop_firms(id) ON DELETE SET NULL;


--
-- Name: certificates certificates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id) ON DELETE CASCADE;


--
-- Name: courses courses_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: delivery_bot_agents delivery_bot_agents_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_bot_agents
    ADD CONSTRAINT delivery_bot_agents_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: discount_codes discount_codes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_codes
    ADD CONSTRAINT discount_codes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id);


--
-- Name: discount_rules discount_rules_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_rules
    ADD CONSTRAINT discount_rules_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.staff(id);


--
-- Name: lessons lessons_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: loyalty_progress loyalty_progress_discount_used_on_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_progress
    ADD CONSTRAINT loyalty_progress_discount_used_on_order_id_fkey FOREIGN KEY (discount_used_on_order_id) REFERENCES public.plaque_orders(id);


--
-- Name: loyalty_progress loyalty_progress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_progress
    ADD CONSTRAINT loyalty_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: open_positions open_positions_prop_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.open_positions
    ADD CONSTRAINT open_positions_prop_firm_id_fkey FOREIGN KEY (prop_firm_id) REFERENCES public.prop_firms(id) ON DELETE CASCADE;


--
-- Name: order_status_history order_status_history_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.plaque_orders(id) ON DELETE CASCADE;


--
-- Name: partner_rewards partner_rewards_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_rewards
    ADD CONSTRAINT partner_rewards_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.staff(id);


--
-- Name: partner_rewards partner_rewards_revoked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_rewards
    ADD CONSTRAINT partner_rewards_revoked_by_fkey FOREIGN KEY (revoked_by) REFERENCES public.staff(id);


--
-- Name: partner_rewards partner_rewards_used_on_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_rewards
    ADD CONSTRAINT partner_rewards_used_on_order_id_fkey FOREIGN KEY (used_on_order_id) REFERENCES public.plaque_orders(id);


--
-- Name: partner_rewards partner_rewards_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_rewards
    ADD CONSTRAINT partner_rewards_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: payouts payouts_prop_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payouts
    ADD CONSTRAINT payouts_prop_firm_id_fkey FOREIGN KEY (prop_firm_id) REFERENCES public.prop_firms(id);


--
-- Name: plaque_orders plaque_orders_certificate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plaque_orders
    ADD CONSTRAINT plaque_orders_certificate_id_fkey FOREIGN KEY (certificate_id) REFERENCES public.certificates(id) ON DELETE CASCADE;


--
-- Name: plaque_orders plaque_orders_discount_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plaque_orders
    ADD CONSTRAINT plaque_orders_discount_code_id_fkey FOREIGN KEY (discount_code_id) REFERENCES public.discount_codes(id);


--
-- Name: plaque_orders plaque_orders_final_certificate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plaque_orders
    ADD CONSTRAINT plaque_orders_final_certificate_id_fkey FOREIGN KEY (final_certificate_id) REFERENCES public.final_certificates(id);


--
-- Name: plaque_orders plaque_orders_pricing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plaque_orders
    ADD CONSTRAINT plaque_orders_pricing_id_fkey FOREIGN KEY (pricing_id) REFERENCES public.plaque_prices(id);


--
-- Name: plaque_payments plaque_payments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plaque_payments
    ADD CONSTRAINT plaque_payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.plaque_orders(id) ON DELETE CASCADE;


--
-- Name: portfolio_snapshots portfolio_snapshots_prop_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_snapshots
    ADD CONSTRAINT portfolio_snapshots_prop_firm_id_fkey FOREIGN KEY (prop_firm_id) REFERENCES public.prop_firms(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: prop_firms prop_firms_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prop_firms
    ADD CONSTRAINT prop_firms_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: referral_links referral_links_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_links
    ADD CONSTRAINT referral_links_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: referrals referrals_first_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_first_order_id_fkey FOREIGN KEY (first_order_id) REFERENCES public.plaque_orders(id);


--
-- Name: referrals referrals_referral_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referral_link_id_fkey FOREIGN KEY (referral_link_id) REFERENCES public.referral_links(id) ON DELETE CASCADE;


--
-- Name: referrals referrals_referred_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referred_user_id_fkey FOREIGN KEY (referred_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: referrals referrals_referrer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: social_media_posts social_media_posts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_media_posts
    ADD CONSTRAINT social_media_posts_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: staff staff_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.admin_roles(id) ON DELETE SET NULL;


--
-- Name: staff staff_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: student_progress student_progress_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_progress
    ADD CONSTRAINT student_progress_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: student_progress student_progress_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_progress
    ADD CONSTRAINT student_progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: support_messages support_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: support_messages support_messages_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;


--
-- Name: support_templates support_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_templates
    ADD CONSTRAINT support_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: support_tickets support_tickets_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: support_tickets support_tickets_escalated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_escalated_by_fkey FOREIGN KEY (escalated_by) REFERENCES public.staff(id);


--
-- Name: support_tickets support_tickets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sync_logs sync_logs_prop_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_logs
    ADD CONSTRAINT sync_logs_prop_firm_id_fkey FOREIGN KEY (prop_firm_id) REFERENCES public.prop_firms(id) ON DELETE CASCADE;


--
-- Name: system_settings system_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: telegram_broadcast_logs telegram_broadcast_logs_broadcast_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_broadcast_logs
    ADD CONSTRAINT telegram_broadcast_logs_broadcast_id_fkey FOREIGN KEY (broadcast_id) REFERENCES public.telegram_broadcasts(id) ON DELETE CASCADE;


--
-- Name: telegram_broadcasts telegram_broadcasts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_broadcasts
    ADD CONSTRAINT telegram_broadcasts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id) ON DELETE SET NULL;


--
-- Name: telegram_otp telegram_otp_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_otp
    ADD CONSTRAINT telegram_otp_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: telegram_support_agents telegram_support_agents_pending_reply_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_support_agents
    ADD CONSTRAINT telegram_support_agents_pending_reply_ticket_id_fkey FOREIGN KEY (pending_reply_ticket_id) REFERENCES public.support_tickets(id);


--
-- Name: telegram_support_agents telegram_support_agents_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_support_agents
    ADD CONSTRAINT telegram_support_agents_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: ticket_messages ticket_messages_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_messages
    ADD CONSTRAINT ticket_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;


--
-- Name: trades trades_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trades
    ADD CONSTRAINT trades_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES public.account_cycles(id);


--
-- Name: trades trades_prop_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trades
    ADD CONSTRAINT trades_prop_firm_id_fkey FOREIGN KEY (prop_firm_id) REFERENCES public.prop_firms(id) ON DELETE CASCADE;


--
-- Name: user_accounts user_accounts_prop_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_accounts
    ADD CONSTRAINT user_accounts_prop_firm_id_fkey FOREIGN KEY (prop_firm_id) REFERENCES public.prop_firms(id) ON DELETE SET NULL;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_telegram_sessions user_telegram_sessions_current_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_telegram_sessions
    ADD CONSTRAINT user_telegram_sessions_current_ticket_id_fkey FOREIGN KEY (current_ticket_id) REFERENCES public.support_tickets(id);


--
-- Name: final_certificates Admins and course managers can manage certificates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and course managers can manage certificates" ON public.final_certificates USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.staff_has_permission(auth.uid(), 'manage_courses'::text)));


--
-- Name: lessons Admins and course managers can manage lessons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and course managers can manage lessons" ON public.lessons USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.staff_has_permission(auth.uid(), 'manage_courses'::text)));


--
-- Name: student_progress Admins and course managers can view all progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and course managers can view all progress" ON public.student_progress FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.staff_has_permission(auth.uid(), 'manage_courses'::text)));


--
-- Name: courses Admins can delete courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete courses" ON public.courses FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can delete roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: courses Admins can insert courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert courses" ON public.courses FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can insert roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: courses Admins can update courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update courses" ON public.courses FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can update roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: discount_rules Anyone authenticated can view discount rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone authenticated can view discount rules" ON public.discount_rules FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: testimonials Anyone can view approved testimonials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view approved testimonials" ON public.testimonials FOR SELECT USING ((approved = true));


--
-- Name: system_settings Anyone can view system settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view system settings" ON public.system_settings FOR SELECT USING (true);


--
-- Name: certificates Authenticated users can create their own certificates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create their own certificates" ON public.certificates FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: prop_firms Authenticated users can create their own prop firms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create their own prop firms" ON public.prop_firms FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: certificates Authenticated users can delete their own certificates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can delete their own certificates" ON public.certificates FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: prop_firms Authenticated users can delete their own prop firms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can delete their own prop firms" ON public.prop_firms FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: certificates Authenticated users can update their own certificates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update their own certificates" ON public.certificates FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: prop_firms Authenticated users can update their own prop firms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update their own prop firms" ON public.prop_firms FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: discount_codes Authenticated users can view active discount codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view active discount codes" ON public.discount_codes FOR SELECT USING (((auth.uid() IS NOT NULL) AND (is_active = true)));


--
-- Name: delivery_pricing Authenticated users can view active pricing; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view active pricing" ON public.delivery_pricing FOR SELECT USING (((auth.uid() IS NOT NULL) AND (is_active = true)));


--
-- Name: prop_firm_certificate_sizes Authenticated users can view certificate sizes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view certificate sizes" ON public.prop_firm_certificate_sizes FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: certificates Authenticated users can view their own certificates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view their own certificates" ON public.certificates FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: prop_firms Authenticated users can view their own prop firms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view their own prop firms" ON public.prop_firms FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: staff_reminders CEO and COO can manage all reminders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CEO and COO can manage all reminders" ON public.staff_reminders USING ((public.is_ceo(auth.uid()) OR public.staff_has_permission(auth.uid(), 'manage_users'::text)));


--
-- Name: staff CEO and managers can manage staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CEO and managers can manage staff" ON public.staff USING ((public.is_ceo(auth.uid()) OR public.staff_has_permission(auth.uid(), 'manage_users'::text)));


--
-- Name: staff CEO can delete staff records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CEO can delete staff records" ON public.staff FOR DELETE TO authenticated USING (public.is_ceo(auth.uid()));


--
-- Name: staff CEO can insert staff records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CEO can insert staff records" ON public.staff FOR INSERT TO authenticated WITH CHECK (public.is_ceo(auth.uid()));


--
-- Name: system_settings CEO can insert system settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CEO can insert system settings" ON public.system_settings FOR INSERT WITH CHECK (public.is_ceo(auth.uid()));


--
-- Name: ceo_telegram_config CEO can manage CEO telegram config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CEO can manage CEO telegram config" ON public.ceo_telegram_config USING (public.is_ceo(auth.uid()));


--
-- Name: loyalty_progress CEO can manage all loyalty progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CEO can manage all loyalty progress" ON public.loyalty_progress USING (public.is_ceo(auth.uid()));


--
-- Name: partner_rewards CEO can manage all partner rewards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CEO can manage all partner rewards" ON public.partner_rewards USING (public.is_ceo(auth.uid()));


--
-- Name: referral_links CEO can manage all referral links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CEO can manage all referral links" ON public.referral_links USING (public.is_ceo(auth.uid()));


--
-- Name: referrals CEO can manage all referrals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CEO can manage all referrals" ON public.referrals USING (public.is_ceo(auth.uid()));


--
-- Name: social_media_posts CEO can manage all social media posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CEO can manage all social media posts" ON public.social_media_posts USING (public.is_ceo(auth.uid()));


--
-- Name: testimonials CEO can manage all testimonials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CEO can manage all testimonials" ON public.testimonials USING (public.is_ceo(auth.uid()));


--
-- Name: mt5_bridge_config CEO can manage bridge config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CEO can manage bridge config" ON public.mt5_bridge_config USING (public.is_ceo(auth.uid()));


--
-- Name: telegram_broadcasts CEO can manage broadcasts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CEO can manage broadcasts" ON public.telegram_broadcasts USING (public.is_ceo(auth.uid()));


--
-- Name: prop_firm_certificate_sizes CEO can manage certificate sizes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CEO can manage certificate sizes" ON public.prop_firm_certificate_sizes USING (public.is_ceo(auth.uid()));


--
-- Name: delivery_bot_agents CEO can manage delivery bot agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CEO can manage delivery bot agents" ON public.delivery_bot_agents USING (public.is_ceo(auth.uid()));


--
-- Name: delivery_pricing CEO can manage delivery pricing; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CEO can manage delivery pricing" ON public.delivery_pricing USING (public.is_ceo(auth.uid()));


--
-- Name: discount_codes CEO can manage discount codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CEO can manage discount codes" ON public.discount_codes USING (public.is_ceo(auth.uid()));


--
-- Name: discount_rules CEO can manage discount rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CEO can manage discount rules" ON public.discount_rules USING (public.is_ceo(auth.uid()));


--
-- Name: plaque_prices CEO can manage plaque prices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CEO can manage plaque prices" ON public.plaque_prices USING (public.is_ceo(auth.uid()));


--
-- Name: admin_roles CEO can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CEO can manage roles" ON public.admin_roles USING (public.is_ceo(auth.uid()));


--
-- Name: telegram_support_agents CEO can manage support agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CEO can manage support agents" ON public.telegram_support_agents USING (public.is_ceo(auth.uid()));


--
-- Name: support_group_config CEO can manage support group config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CEO can manage support group config" ON public.support_group_config USING (public.is_ceo(auth.uid()));


--
-- Name: support_templates CEO can manage templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CEO can manage templates" ON public.support_templates USING (public.is_ceo(auth.uid()));


--
-- Name: plaque_payments CEO can update payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CEO can update payments" ON public.plaque_payments FOR UPDATE USING (public.is_ceo(auth.uid()));


--
-- Name: plaque_orders CEO can update plaque orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CEO can update plaque orders" ON public.plaque_orders FOR UPDATE USING (public.is_ceo(auth.uid()));


--
-- Name: staff CEO can update staff records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CEO can update staff records" ON public.staff FOR UPDATE TO authenticated USING (public.is_ceo(auth.uid()));


--
-- Name: system_settings CEO can update system settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CEO can update system settings" ON public.system_settings FOR UPDATE USING (public.is_ceo(auth.uid()));


--
-- Name: admin_audit_logs CEO can view all audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CEO can view all audit logs" ON public.admin_audit_logs FOR SELECT USING (public.is_ceo(auth.uid()));


--
-- Name: plaque_payments CEO can view all payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CEO can view all payments" ON public.plaque_payments FOR SELECT USING (public.is_ceo(auth.uid()));


--
-- Name: plaque_orders CEO can view all plaque orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CEO can view all plaque orders" ON public.plaque_orders FOR SELECT USING (public.is_ceo(auth.uid()));


--
-- Name: staff CEO can view all staff records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CEO can view all staff records" ON public.staff FOR SELECT TO authenticated USING (public.is_ceo(auth.uid()));


--
-- Name: telegram_broadcast_logs CEO can view broadcast logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "CEO can view broadcast logs" ON public.telegram_broadcast_logs FOR SELECT USING (public.is_ceo(auth.uid()));


--
-- Name: lessons Lessons viewable for published courses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Lessons viewable for published courses" ON public.lessons FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.courses
  WHERE ((courses.id = lessons.course_id) AND ((courses.published = true) OR public.has_role(auth.uid(), 'admin'::public.app_role))))));


--
-- Name: profiles Profiles are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);


--
-- Name: courses Published courses are viewable by authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Published courses are viewable by authenticated users" ON public.courses FOR SELECT USING (((published = true) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: order_status_history Service role can manage status history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage status history" ON public.order_status_history USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: user_telegram_sessions Service role only for telegram sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role only for telegram sessions" ON public.user_telegram_sessions USING (false);


--
-- Name: social_media_posts Social media staff can manage posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Social media staff can manage posts" ON public.social_media_posts USING (public.staff_has_permission(auth.uid(), 'manage_social_media'::text)) WITH CHECK (public.staff_has_permission(auth.uid(), 'manage_social_media'::text));


--
-- Name: support_messages Staff can create messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can create messages" ON public.support_messages FOR INSERT WITH CHECK ((public.is_ceo(auth.uid()) OR public.staff_has_permission(auth.uid(), 'manage_support'::text)));


--
-- Name: order_status_history Staff can insert status history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can insert status history" ON public.order_status_history FOR INSERT WITH CHECK ((public.is_ceo(auth.uid()) OR public.staff_has_permission(auth.uid(), 'manage_support'::text)));


--
-- Name: ticket_messages Staff can manage all ticket messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage all ticket messages" ON public.ticket_messages USING ((public.is_ceo(auth.uid()) OR public.staff_has_permission(auth.uid(), 'manage_support'::text)));


--
-- Name: support_tickets Staff can update all tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can update all tickets" ON public.support_tickets FOR UPDATE USING ((public.is_ceo(auth.uid()) OR public.staff_has_permission(auth.uid(), 'manage_support'::text)));


--
-- Name: plaque_payments Staff can update payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can update payments" ON public.plaque_payments FOR UPDATE USING (public.staff_has_permission(auth.uid(), 'manage_support'::text));


--
-- Name: staff_reminders Staff can update their assigned reminders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can update their assigned reminders" ON public.staff_reminders FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.staff
  WHERE ((staff.user_id = auth.uid()) AND (staff.id = staff_reminders.assigned_to)))));


--
-- Name: bridge_activity_logs Staff can view all bridge logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view all bridge logs" ON public.bridge_activity_logs FOR SELECT USING ((public.is_ceo(auth.uid()) OR public.staff_has_permission(auth.uid(), 'manage_support'::text)));


--
-- Name: certificates Staff can view all certificates for plaque orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view all certificates for plaque orders" ON public.certificates FOR SELECT USING ((public.is_ceo(auth.uid()) OR public.staff_has_permission(auth.uid(), 'manage_support'::text) OR public.staff_has_permission(auth.uid(), 'manage_plaque_orders'::text)));


--
-- Name: support_messages Staff can view all messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view all messages" ON public.support_messages FOR SELECT USING ((public.is_ceo(auth.uid()) OR public.staff_has_permission(auth.uid(), 'manage_support'::text)));


--
-- Name: plaque_payments Staff can view all payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view all payments" ON public.plaque_payments FOR SELECT USING (public.staff_has_permission(auth.uid(), 'manage_support'::text));


--
-- Name: plaque_orders Staff can view all plaque orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view all plaque orders" ON public.plaque_orders FOR SELECT USING ((public.staff_has_permission(auth.uid(), 'manage_support'::text) OR public.staff_has_permission(auth.uid(), 'manage_plaque_orders'::text)));


--
-- Name: bridge_user_settings Staff can view all settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view all settings" ON public.bridge_user_settings FOR SELECT USING ((public.is_ceo(auth.uid()) OR public.staff_has_permission(auth.uid(), 'manage_support'::text)));


--
-- Name: portfolio_snapshots Staff can view all snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view all snapshots" ON public.portfolio_snapshots FOR SELECT USING ((public.is_ceo(auth.uid()) OR public.staff_has_permission(auth.uid(), 'manage_support'::text)));


--
-- Name: order_status_history Staff can view all status history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view all status history" ON public.order_status_history FOR SELECT USING ((public.is_ceo(auth.uid()) OR public.staff_has_permission(auth.uid(), 'manage_support'::text)));


--
-- Name: support_tickets Staff can view all tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view all tickets" ON public.support_tickets FOR SELECT USING ((public.is_ceo(auth.uid()) OR public.staff_has_permission(auth.uid(), 'manage_support'::text)));


--
-- Name: admin_audit_logs Staff can view audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view audit logs" ON public.admin_audit_logs FOR SELECT USING (public.staff_has_permission(auth.uid(), 'manage_support'::text));


--
-- Name: mt5_bridge_config Staff can view bridge config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view bridge config" ON public.mt5_bridge_config FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.staff
  WHERE (staff.user_id = auth.uid()))));


--
-- Name: telegram_broadcast_logs Staff can view broadcast logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view broadcast logs" ON public.telegram_broadcast_logs FOR SELECT USING (public.staff_has_permission(auth.uid(), 'manage_support'::text));


--
-- Name: telegram_broadcasts Staff can view broadcasts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view broadcasts" ON public.telegram_broadcasts FOR SELECT USING (public.staff_has_permission(auth.uid(), 'manage_support'::text));


--
-- Name: delivery_bot_agents Staff can view delivery bot agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view delivery bot agents" ON public.delivery_bot_agents FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.staff
  WHERE (staff.user_id = auth.uid()))));


--
-- Name: delivery_pricing Staff can view delivery pricing; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view delivery pricing" ON public.delivery_pricing FOR SELECT USING (public.staff_has_permission(auth.uid(), 'manage_support'::text));


--
-- Name: staff Staff can view own record by email; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view own record by email" ON public.staff FOR SELECT TO authenticated USING ((lower(email) = lower(auth.email())));


--
-- Name: plaque_prices Staff can view plaque prices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view plaque prices" ON public.plaque_prices FOR SELECT USING ((public.is_ceo(auth.uid()) OR public.staff_has_permission(auth.uid(), 'manage_support'::text)));


--
-- Name: admin_roles Staff can view roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view roles" ON public.admin_roles FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.staff
  WHERE (staff.user_id = auth.uid()))));


--
-- Name: social_media_posts Staff can view social media posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view social media posts" ON public.social_media_posts FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.staff
  WHERE (staff.user_id = auth.uid()))));


--
-- Name: telegram_support_agents Staff can view support agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view support agents" ON public.telegram_support_agents FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.staff
  WHERE (staff.user_id = auth.uid()))));


--
-- Name: support_group_config Staff can view support group config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view support group config" ON public.support_group_config FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.staff
  WHERE (staff.user_id = auth.uid()))));


--
-- Name: support_templates Staff can view templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view templates" ON public.support_templates FOR SELECT USING ((public.is_ceo(auth.uid()) OR public.staff_has_permission(auth.uid(), 'manage_support'::text)));


--
-- Name: staff_reminders Staff can view their assigned reminders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view their assigned reminders" ON public.staff_reminders FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.staff
  WHERE ((staff.user_id = auth.uid()) AND (staff.id = staff_reminders.assigned_to)))));


--
-- Name: loyalty_progress Staff with manage_support can update loyalty progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff with manage_support can update loyalty progress" ON public.loyalty_progress FOR UPDATE USING (public.staff_has_permission(auth.uid(), 'manage_support'::text));


--
-- Name: partner_rewards Staff with manage_support can update partner rewards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff with manage_support can update partner rewards" ON public.partner_rewards FOR UPDATE USING (public.staff_has_permission(auth.uid(), 'manage_support'::text));


--
-- Name: plaque_orders Staff with manage_support can update plaque orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff with manage_support can update plaque orders" ON public.plaque_orders FOR UPDATE USING (public.staff_has_permission(auth.uid(), 'manage_support'::text));


--
-- Name: partner_rewards Staff with manage_support can view all partner rewards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff with manage_support can view all partner rewards" ON public.partner_rewards FOR SELECT USING (public.staff_has_permission(auth.uid(), 'manage_support'::text));


--
-- Name: referral_links Staff with manage_support can view all referral links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff with manage_support can view all referral links" ON public.referral_links FOR SELECT USING (public.staff_has_permission(auth.uid(), 'manage_support'::text));


--
-- Name: referrals Staff with manage_support can view all referrals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff with manage_support can view all referrals" ON public.referrals FOR SELECT USING (public.staff_has_permission(auth.uid(), 'manage_support'::text));


--
-- Name: discount_codes Staff with manage_support can view discount codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff with manage_support can view discount codes" ON public.discount_codes FOR SELECT USING (public.staff_has_permission(auth.uid(), 'manage_support'::text));


--
-- Name: loyalty_progress Staff with manage_support can view loyalty progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff with manage_support can view loyalty progress" ON public.loyalty_progress FOR SELECT USING (public.staff_has_permission(auth.uid(), 'manage_support'::text));


--
-- Name: plaque_orders Staff with plaque permissions can update orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff with plaque permissions can update orders" ON public.plaque_orders FOR UPDATE USING (public.staff_has_permission(auth.uid(), 'manage_plaque_orders'::text));


--
-- Name: testimonials Support staff can update testimonials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Support staff can update testimonials" ON public.testimonials FOR UPDATE USING (public.staff_has_permission(auth.uid(), 'manage_support'::text));


--
-- Name: testimonials Support staff can view all testimonials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Support staff can view all testimonials" ON public.testimonials FOR SELECT USING (public.staff_has_permission(auth.uid(), 'manage_support'::text));


--
-- Name: account_cycles Users can create cycles for their funded accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create cycles for their funded accounts" ON public.account_cycles FOR INSERT WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM public.prop_firms
  WHERE ((prop_firms.id = account_cycles.prop_firm_id) AND (prop_firms.user_id = auth.uid()) AND (prop_firms.account_type = 'Funded'::public.prop_firm_account_type))))));


--
-- Name: chat_messages Users can create messages in their conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create messages in their conversations" ON public.chat_messages FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.chat_conversations
  WHERE ((chat_conversations.id = chat_messages.conversation_id) AND (chat_conversations.user_id = auth.uid())))));


--
-- Name: support_messages Users can create messages on their tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create messages on their tickets" ON public.support_messages FOR INSERT WITH CHECK (((auth.uid() = sender_id) AND (EXISTS ( SELECT 1
   FROM public.support_tickets
  WHERE ((support_tickets.id = support_messages.ticket_id) AND (support_tickets.user_id = auth.uid()))))));


--
-- Name: ticket_messages Users can create messages on their tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create messages on their tickets" ON public.ticket_messages FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.support_tickets
  WHERE ((support_tickets.id = ticket_messages.ticket_id) AND (support_tickets.user_id = auth.uid())))));


--
-- Name: user_accounts Users can create their own accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own accounts" ON public.user_accounts FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: chat_conversations Users can create their own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own conversations" ON public.chat_conversations FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: plaque_payments Users can create their own payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own payments" ON public.plaque_payments FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: payouts Users can create their own payouts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own payouts" ON public.payouts FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: plaque_orders Users can create their own plaque orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own plaque orders" ON public.plaque_orders FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: referral_links Users can create their own referral links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own referral links" ON public.referral_links FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: testimonials Users can create their own testimonials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own testimonials" ON public.testimonials FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: support_tickets Users can create their own tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own tickets" ON public.support_tickets FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: trades Users can create their own trades; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own trades" ON public.trades FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_accounts Users can delete their own accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own accounts" ON public.user_accounts FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: chat_conversations Users can delete their own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own conversations" ON public.chat_conversations FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: payouts Users can delete their own payouts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own payouts" ON public.payouts FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: testimonials Users can delete their own pending testimonials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own pending testimonials" ON public.testimonials FOR DELETE USING (((auth.uid() = user_id) AND (approved = false)));


--
-- Name: open_positions Users can delete their own positions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own positions" ON public.open_positions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: user_strategies Users can delete their own strategies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own strategies" ON public.user_strategies FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: trades Users can delete their own trades; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own trades" ON public.trades FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: bridge_activity_logs Users can insert their own bridge logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own bridge logs" ON public.bridge_activity_logs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: daily_checkins Users can insert their own checkins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own checkins" ON public.daily_checkins FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: open_positions Users can insert their own positions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own positions" ON public.open_positions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: bridge_user_settings Users can insert their own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own settings" ON public.bridge_user_settings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: account_snapshots Users can insert their own snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own snapshots" ON public.account_snapshots FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: portfolio_snapshots Users can insert their own snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own snapshots" ON public.portfolio_snapshots FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_strategies Users can insert their own strategies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own strategies" ON public.user_strategies FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: sync_logs Users can insert their own sync logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own sync logs" ON public.sync_logs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_accounts Users can update their own accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own accounts" ON public.user_accounts FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: account_cycles Users can update their own active cycles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own active cycles" ON public.account_cycles FOR UPDATE USING (((auth.uid() = user_id) AND (status = 'active'::text)));


--
-- Name: daily_checkins Users can update their own checkins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own checkins" ON public.daily_checkins FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: chat_conversations Users can update their own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own conversations" ON public.chat_conversations FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: payouts Users can update their own payouts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own payouts" ON public.payouts FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: testimonials Users can update their own pending testimonials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own pending testimonials" ON public.testimonials FOR UPDATE USING (((auth.uid() = user_id) AND (approved = false)));


--
-- Name: plaque_orders Users can update their own plaque orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own plaque orders" ON public.plaque_orders FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: open_positions Users can update their own positions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own positions" ON public.open_positions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: student_progress Users can update their own progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own progress" ON public.student_progress FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: bridge_user_settings Users can update their own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own settings" ON public.bridge_user_settings FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_strategies Users can update their own strategies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own strategies" ON public.user_strategies FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: support_tickets Users can update their own tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own tickets" ON public.support_tickets FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: trades Users can update their own trades; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own trades" ON public.trades FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: student_progress Users can update their progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their progress" ON public.student_progress FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: plaque_prices Users can view active plaque prices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view active plaque prices" ON public.plaque_prices FOR SELECT USING (((is_active = true) OR public.is_ceo(auth.uid()) OR public.staff_has_permission(auth.uid(), 'manage_support'::text)));


--
-- Name: chat_messages Users can view messages in their conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view messages in their conversations" ON public.chat_messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.chat_conversations
  WHERE ((chat_conversations.id = chat_messages.conversation_id) AND (chat_conversations.user_id = auth.uid())))));


--
-- Name: support_messages Users can view messages on their tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view messages on their tickets" ON public.support_messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.support_tickets
  WHERE ((support_tickets.id = support_messages.ticket_id) AND (support_tickets.user_id = auth.uid())))));


--
-- Name: ticket_messages Users can view messages on their tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view messages on their tickets" ON public.ticket_messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.support_tickets
  WHERE ((support_tickets.id = ticket_messages.ticket_id) AND (support_tickets.user_id = auth.uid())))));


--
-- Name: referrals Users can view referrals they made; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view referrals they made" ON public.referrals FOR SELECT USING ((auth.uid() = referrer_id));


--
-- Name: order_status_history Users can view status history for their orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view status history for their orders" ON public.order_status_history FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.plaque_orders
  WHERE ((plaque_orders.id = order_status_history.order_id) AND (plaque_orders.user_id = auth.uid())))));


--
-- Name: user_accounts Users can view their own accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own accounts" ON public.user_accounts FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: bridge_activity_logs Users can view their own bridge logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own bridge logs" ON public.bridge_activity_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: final_certificates Users can view their own certificates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own certificates" ON public.final_certificates FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: daily_checkins Users can view their own checkins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own checkins" ON public.daily_checkins FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: chat_conversations Users can view their own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own conversations" ON public.chat_conversations FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: account_cycles Users can view their own cycles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own cycles" ON public.account_cycles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: loyalty_progress Users can view their own loyalty progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own loyalty progress" ON public.loyalty_progress FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: partner_rewards Users can view their own partner rewards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own partner rewards" ON public.partner_rewards FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: plaque_payments Users can view their own payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own payments" ON public.plaque_payments FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: payouts Users can view their own payouts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own payouts" ON public.payouts FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: plaque_orders Users can view their own plaque orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own plaque orders" ON public.plaque_orders FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: open_positions Users can view their own positions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own positions" ON public.open_positions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: student_progress Users can view their own progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own progress" ON public.student_progress FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: referral_links Users can view their own referral links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own referral links" ON public.referral_links FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: bridge_user_settings Users can view their own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own settings" ON public.bridge_user_settings FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: account_snapshots Users can view their own snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own snapshots" ON public.account_snapshots FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: portfolio_snapshots Users can view their own snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own snapshots" ON public.portfolio_snapshots FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: staff Users can view their own staff record; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own staff record" ON public.staff FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: user_strategies Users can view their own strategies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own strategies" ON public.user_strategies FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: sync_logs Users can view their own sync logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own sync logs" ON public.sync_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: testimonials Users can view their own testimonials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own testimonials" ON public.testimonials FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: support_tickets Users can view their own tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own tickets" ON public.support_tickets FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: trades Users can view their own trades; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own trades" ON public.trades FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: account_cycles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.account_cycles ENABLE ROW LEVEL SECURITY;

--
-- Name: account_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.account_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: bridge_activity_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bridge_activity_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: bridge_user_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bridge_user_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: ceo_telegram_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ceo_telegram_config ENABLE ROW LEVEL SECURITY;

--
-- Name: certificates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: courses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_checkins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

--
-- Name: delivery_bot_agents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.delivery_bot_agents ENABLE ROW LEVEL SECURITY;

--
-- Name: delivery_pricing; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.delivery_pricing ENABLE ROW LEVEL SECURITY;

--
-- Name: discount_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: discount_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.discount_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: final_certificates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.final_certificates ENABLE ROW LEVEL SECURITY;

--
-- Name: lessons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

--
-- Name: loyalty_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.loyalty_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: mt5_bridge_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mt5_bridge_config ENABLE ROW LEVEL SECURITY;

--
-- Name: open_positions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.open_positions ENABLE ROW LEVEL SECURITY;

--
-- Name: order_status_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

--
-- Name: partner_rewards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.partner_rewards ENABLE ROW LEVEL SECURITY;

--
-- Name: password_reset_otps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;

--
-- Name: payouts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

--
-- Name: plaque_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plaque_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: plaque_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plaque_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: plaque_prices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plaque_prices ENABLE ROW LEVEL SECURITY;

--
-- Name: portfolio_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: prop_firm_certificate_sizes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prop_firm_certificate_sizes ENABLE ROW LEVEL SECURITY;

--
-- Name: prop_firms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prop_firms ENABLE ROW LEVEL SECURITY;

--
-- Name: referral_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referral_links ENABLE ROW LEVEL SECURITY;

--
-- Name: referrals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

--
-- Name: social_media_posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.social_media_posts ENABLE ROW LEVEL SECURITY;

--
-- Name: staff; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_reminders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_reminders ENABLE ROW LEVEL SECURITY;

--
-- Name: student_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: support_group_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.support_group_config ENABLE ROW LEVEL SECURITY;

--
-- Name: support_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: support_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.support_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: support_tickets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

--
-- Name: sync_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: system_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: telegram_broadcast_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.telegram_broadcast_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: telegram_broadcasts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.telegram_broadcasts ENABLE ROW LEVEL SECURITY;

--
-- Name: telegram_otp; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.telegram_otp ENABLE ROW LEVEL SECURITY;

--
-- Name: telegram_support_agents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.telegram_support_agents ENABLE ROW LEVEL SECURITY;

--
-- Name: testimonials; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

--
-- Name: ticket_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: trades; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

--
-- Name: user_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_strategies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_strategies ENABLE ROW LEVEL SECURITY;

--
-- Name: user_telegram_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_telegram_sessions ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict qbOrNrSGhmL73poEZr2fTyIWXfTDcRDBq5v1QUIvajz17xNsQtaUCeA5SDbGFUL

