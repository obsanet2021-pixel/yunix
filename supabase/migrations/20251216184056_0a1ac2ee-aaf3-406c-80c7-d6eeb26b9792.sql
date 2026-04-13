-- Create plaque_prices table for managing plaque sizes and prices
CREATE TABLE public.plaque_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  size_name TEXT NOT NULL,
  dimensions TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plaque_prices ENABLE ROW LEVEL SECURITY;

-- Staff can view all prices
CREATE POLICY "Staff can view plaque prices"
ON public.plaque_prices
FOR SELECT
USING (is_ceo(auth.uid()) OR staff_has_permission(auth.uid(), 'manage_support'::text));

-- CEO can manage plaque prices
CREATE POLICY "CEO can manage plaque prices"
ON public.plaque_prices
FOR ALL
USING (is_ceo(auth.uid()));

-- Insert default plaque prices
INSERT INTO public.plaque_prices (size_name, dimensions, price, is_active) VALUES
  ('15x15 cm', '15 × 15 cm', 37.99, true),
  ('13x18 cm', '13 × 18 cm', 47.99, true),
  ('15x20 cm', '15 × 20 cm', 57.99, true),
  ('20x20 cm', '20 × 20 cm', 67.99, true);

-- Create trigger for updated_at
CREATE TRIGGER update_plaque_prices_updated_at
BEFORE UPDATE ON public.plaque_prices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();