-- =============================================
-- LOYALTY & PARTNER PROGRAM - Complete Schema
-- =============================================

-- 1. Add new permissions to admin_roles schema
-- (We'll update existing roles via separate insert)

-- 2. Loyalty Progress Table - Track user loyalty cycles
CREATE TABLE public.loyalty_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_orders integer NOT NULL DEFAULT 0,
  current_cycle integer NOT NULL DEFAULT 1,
  discount_status text NOT NULL DEFAULT 'locked' CHECK (discount_status IN ('locked', 'unlocked', 'used')),
  discount_unlocked_at timestamp with time zone,
  discount_used_at timestamp with time zone,
  discount_used_on_order_id uuid REFERENCES public.plaque_orders(id),
  admin_locked boolean NOT NULL DEFAULT false,
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 3. Referral Links Table - User's referral codes
CREATE TABLE public.referral_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  total_signups integer NOT NULL DEFAULT 0,
  qualified_referrals integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  banned_at timestamp with time zone,
  banned_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 4. Referrals Table - Individual referral tracking
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_link_id uuid NOT NULL REFERENCES public.referral_links(id) ON DELETE CASCADE,
  signup_at timestamp with time zone NOT NULL DEFAULT now(),
  first_order_id uuid REFERENCES public.plaque_orders(id),
  first_order_at timestamp with time zone,
  is_qualified boolean NOT NULL DEFAULT false,
  is_suspicious boolean NOT NULL DEFAULT false,
  suspicious_reason text,
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(referred_user_id)
);

-- 5. Partner Rewards Table - Earned partner discounts
CREATE TABLE public.partner_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_eligible' CHECK (status IN ('not_eligible', 'under_review', 'eligible', 'approved', 'used', 'revoked')),
  discount_percentage integer NOT NULL DEFAULT 60,
  discount_cap numeric NOT NULL DEFAULT 25,
  approved_at timestamp with time zone,
  approved_by uuid REFERENCES public.staff(id),
  used_at timestamp with time zone,
  used_on_order_id uuid REFERENCES public.plaque_orders(id),
  revoked_at timestamp with time zone,
  revoked_by uuid REFERENCES public.staff(id),
  revoked_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 6. Discount Rules Table - Global configuration (CEO only)
CREATE TABLE public.discount_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}',
  description text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.staff(id)
);

-- 7. Admin Audit Logs Table - All admin actions logged
CREATE TABLE public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES public.staff(id),
  admin_email text,
  action_type text NOT NULL,
  target_table text NOT NULL,
  target_id uuid,
  old_value jsonb,
  new_value jsonb,
  reason text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- =============================================
-- Enable RLS on all tables
-- =============================================

ALTER TABLE public.loyalty_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies
-- =============================================

-- Loyalty Progress Policies
CREATE POLICY "Users can view their own loyalty progress"
  ON public.loyalty_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "CEO can manage all loyalty progress"
  ON public.loyalty_progress FOR ALL
  USING (is_ceo(auth.uid()));

CREATE POLICY "Staff with manage_support can view loyalty progress"
  ON public.loyalty_progress FOR SELECT
  USING (staff_has_permission(auth.uid(), 'manage_support'));

CREATE POLICY "Staff with manage_support can update loyalty progress"
  ON public.loyalty_progress FOR UPDATE
  USING (staff_has_permission(auth.uid(), 'manage_support'));

-- Referral Links Policies
CREATE POLICY "Users can view their own referral links"
  ON public.referral_links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own referral links"
  ON public.referral_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "CEO can manage all referral links"
  ON public.referral_links FOR ALL
  USING (is_ceo(auth.uid()));

CREATE POLICY "Staff with manage_support can view all referral links"
  ON public.referral_links FOR SELECT
  USING (staff_has_permission(auth.uid(), 'manage_support'));

-- Referrals Policies
CREATE POLICY "Users can view referrals they made"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id);

CREATE POLICY "CEO can manage all referrals"
  ON public.referrals FOR ALL
  USING (is_ceo(auth.uid()));

CREATE POLICY "Staff with manage_support can view all referrals"
  ON public.referrals FOR SELECT
  USING (staff_has_permission(auth.uid(), 'manage_support'));

-- Partner Rewards Policies
CREATE POLICY "Users can view their own partner rewards"
  ON public.partner_rewards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "CEO can manage all partner rewards"
  ON public.partner_rewards FOR ALL
  USING (is_ceo(auth.uid()));

CREATE POLICY "Staff with manage_support can view all partner rewards"
  ON public.partner_rewards FOR SELECT
  USING (staff_has_permission(auth.uid(), 'manage_support'));

CREATE POLICY "Staff with manage_support can update partner rewards"
  ON public.partner_rewards FOR UPDATE
  USING (staff_has_permission(auth.uid(), 'manage_support'));

-- Discount Rules Policies
CREATE POLICY "Anyone authenticated can view discount rules"
  ON public.discount_rules FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "CEO can manage discount rules"
  ON public.discount_rules FOR ALL
  USING (is_ceo(auth.uid()));

-- Admin Audit Logs Policies
CREATE POLICY "CEO can view all audit logs"
  ON public.admin_audit_logs FOR SELECT
  USING (is_ceo(auth.uid()));

CREATE POLICY "Staff can view audit logs"
  ON public.admin_audit_logs FOR SELECT
  USING (staff_has_permission(auth.uid(), 'manage_support'));

-- =============================================
-- Database Functions
-- =============================================

-- Function to increment loyalty progress when order is approved
CREATE OR REPLACE FUNCTION public.increment_loyalty_on_order_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Function to decrement loyalty on refund/rejection
CREATE OR REPLACE FUNCTION public.decrement_loyalty_on_order_refund()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Function to log admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action(
  _action_type text,
  _target_table text,
  _target_id uuid,
  _old_value jsonb,
  _new_value jsonb,
  _reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- =============================================
-- Triggers
-- =============================================

-- Trigger for loyalty increment on order approval
CREATE TRIGGER trigger_loyalty_increment
  AFTER UPDATE ON public.plaque_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_loyalty_on_order_approved();

-- Trigger for loyalty decrement on refund
CREATE TRIGGER trigger_loyalty_decrement
  AFTER UPDATE ON public.plaque_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_loyalty_on_order_refund();

-- =============================================
-- Insert default discount rules
-- =============================================

INSERT INTO public.discount_rules (key, value, description) VALUES
  ('loyalty_percentage', '{"value": 50}', 'Percentage discount for loyalty reward (10th order)'),
  ('loyalty_cap', '{"value": 25}', 'Maximum discount cap for loyalty in USD'),
  ('loyalty_threshold', '{"value": 9}', 'Number of orders needed before discount unlocks'),
  ('affiliate_percentage_tier1', '{"value": 60}', 'Tier 1 affiliate discount percentage'),
  ('affiliate_percentage_tier2', '{"value": 65}', 'Tier 2 affiliate discount percentage'),
  ('affiliate_cap', '{"value": 25}', 'Maximum discount cap for affiliate in USD'),
  ('affiliate_conversion_threshold', '{"value": 3}', 'Number of qualified referrals needed'),
  ('stack_prevention_enabled', '{"value": true}', 'Prevent stacking of discounts');

-- =============================================
-- Indexes for performance
-- =============================================

CREATE INDEX idx_loyalty_progress_user ON public.loyalty_progress(user_id);
CREATE INDEX idx_loyalty_progress_status ON public.loyalty_progress(discount_status);
CREATE INDEX idx_referral_links_code ON public.referral_links(code);
CREATE INDEX idx_referral_links_user ON public.referral_links(user_id);
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_referred ON public.referrals(referred_user_id);
CREATE INDEX idx_partner_rewards_user ON public.partner_rewards(user_id);
CREATE INDEX idx_partner_rewards_status ON public.partner_rewards(status);
CREATE INDEX idx_admin_audit_logs_action ON public.admin_audit_logs(action_type);
CREATE INDEX idx_admin_audit_logs_created ON public.admin_audit_logs(created_at DESC);