-- Create delivery_pricing table
CREATE TABLE public.delivery_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_name TEXT NOT NULL UNIQUE,
  delivery_fee NUMERIC NOT NULL DEFAULT 0,
  is_free BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_fallback BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add delivery columns to plaque_orders
ALTER TABLE public.plaque_orders ADD COLUMN IF NOT EXISTS delivery_city TEXT;
ALTER TABLE public.plaque_orders ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC DEFAULT 0;
ALTER TABLE public.plaque_orders ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'Paid';

-- Enable RLS
ALTER TABLE public.delivery_pricing ENABLE ROW LEVEL SECURITY;

-- RLS Policies for delivery_pricing
CREATE POLICY "CEO can manage delivery pricing" ON public.delivery_pricing
FOR ALL USING (is_ceo(auth.uid()));

CREATE POLICY "Staff can view delivery pricing" ON public.delivery_pricing
FOR SELECT USING (staff_has_permission(auth.uid(), 'manage_support'));

CREATE POLICY "Authenticated users can view active pricing" ON public.delivery_pricing
FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);

-- Seed initial delivery pricing data
INSERT INTO public.delivery_pricing (city_name, delivery_fee, is_free, is_fallback) VALUES
  ('Adama (Nazrit)', 0, true, false),
  ('Addis Ababa', 250, false, false),
  ('Dire Dawa', 300, false, false),
  ('Harar', 350, false, false),
  ('Jigjiga', 400, false, false),
  ('Jimma', 380, false, false),
  ('Other Cities', 450, false, true)
ON CONFLICT (city_name) DO NOTHING;

-- Create updated_at trigger for delivery_pricing
CREATE TRIGGER update_delivery_pricing_updated_at
BEFORE UPDATE ON public.delivery_pricing
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();