-- Create plaque_prices table for managing plaque sizes and prices
CREATE TABLE IF NOT EXISTS public.plaque_prices (
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON c.oid = p.polrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE p.polname = 'Staff can view plaque prices'
      AND c.relname = 'plaque_prices'
      AND n.nspname = 'public'
  ) THEN
    CREATE POLICY "Staff can view plaque prices"
    ON public.plaque_prices
    FOR SELECT
    USING (is_ceo(auth.uid()) OR staff_has_permission(auth.uid(), 'manage_support'::text));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON c.oid = p.polrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE p.polname = 'CEO can manage plaque prices'
      AND c.relname = 'plaque_prices'
      AND n.nspname = 'public'
  ) THEN
    CREATE POLICY "CEO can manage plaque prices"
    ON public.plaque_prices
    FOR ALL
    USING (is_ceo(auth.uid()));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.plaque_prices WHERE size_name = '15x15 cm'
  ) THEN
    INSERT INTO public.plaque_prices (size_name, dimensions, price, is_active) VALUES
      ('15x15 cm', '15 × 15 cm', 37.99, true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.plaque_prices WHERE size_name = '13x18 cm'
  ) THEN
    INSERT INTO public.plaque_prices (size_name, dimensions, price, is_active) VALUES
      ('13x18 cm', '13 × 18 cm', 47.99, true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.plaque_prices WHERE size_name = '15x20 cm'
  ) THEN
    INSERT INTO public.plaque_prices (size_name, dimensions, price, is_active) VALUES
      ('15x20 cm', '15 × 20 cm', 57.99, true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.plaque_prices WHERE size_name = '20x20 cm'
  ) THEN
    INSERT INTO public.plaque_prices (size_name, dimensions, price, is_active) VALUES
      ('20x20 cm', '20 × 20 cm', 67.99, true);
  END IF;
END
$$;

DROP TRIGGER IF EXISTS update_plaque_prices_updated_at ON public.plaque_prices;
CREATE TRIGGER update_plaque_prices_updated_at
BEFORE UPDATE ON public.plaque_prices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();