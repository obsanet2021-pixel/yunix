-- Insert new discount rules for tiered loyalty
INSERT INTO public.discount_rules (key, value, description) VALUES
  ('first_order_discount_percentage', '{"value": 50}', 'Discount percentage for first order'),
  ('first_order_discount_enabled', '{"value": true}', 'Enable discount for first order'),
  ('sixth_order_free', '{"value": true}', 'Make 6th order completely free'),
  ('sixth_order_threshold', '{"value": 6}', 'Which order number is free (6th order)')
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description;

-- Create discount codes table
CREATE TABLE IF NOT EXISTS public.discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  min_order_value NUMERIC,
  max_discount NUMERIC,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.staff(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

-- RLS policies for discount_codes
CREATE POLICY "CEO can manage discount codes"
  ON public.discount_codes FOR ALL
  USING (is_ceo(auth.uid()));

CREATE POLICY "Staff with manage_support can view discount codes"
  ON public.discount_codes FOR SELECT
  USING (staff_has_permission(auth.uid(), 'manage_support'));

CREATE POLICY "Authenticated users can view active discount codes"
  ON public.discount_codes FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

-- Add discount_code_id to plaque_orders
ALTER TABLE public.plaque_orders 
  ADD COLUMN IF NOT EXISTS discount_code_id UUID REFERENCES public.discount_codes(id),
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;

-- Trigger to update updated_at
CREATE OR REPLACE TRIGGER update_discount_codes_updated_at
  BEFORE UPDATE ON public.discount_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();