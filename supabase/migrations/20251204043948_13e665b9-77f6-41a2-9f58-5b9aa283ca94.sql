-- Create plaque_orders table
CREATE TABLE IF NOT EXISTS public.plaque_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  certificate_id UUID NOT NULL REFERENCES public.certificates(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  phone TEXT NOT NULL,
  size TEXT NOT NULL CHECK (size IN ('Small', 'Medium', 'Large')),
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('Standard', 'Express')),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Awaiting Approval', 'Delivered')),
  invoice_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plaque_orders ENABLE ROW LEVEL SECURITY;

-- Users can view their own orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON c.oid = p.polrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE p.polname = 'Users can view their own plaque orders'
      AND c.relname = 'plaque_orders'
      AND n.nspname = 'public'
  ) THEN
    CREATE POLICY "Users can view their own plaque orders"
    ON public.plaque_orders
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON c.oid = p.polrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE p.polname = 'Users can create their own plaque orders'
      AND c.relname = 'plaque_orders'
      AND n.nspname = 'public'
  ) THEN
    CREATE POLICY "Users can create their own plaque orders"
    ON public.plaque_orders
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON c.oid = p.polrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE p.polname = 'CEO can view all plaque orders'
      AND c.relname = 'plaque_orders'
      AND n.nspname = 'public'
  ) THEN
    CREATE POLICY "CEO can view all plaque orders"
    ON public.plaque_orders
    FOR SELECT
    USING (is_ceo(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy p
    JOIN pg_catalog.pg_class c ON c.oid = p.polrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE p.polname = 'CEO can update plaque orders'
      AND c.relname = 'plaque_orders'
      AND n.nspname = 'public'
  ) THEN
    CREATE POLICY "CEO can update plaque orders"
    ON public.plaque_orders
    FOR UPDATE
    USING (is_ceo(auth.uid()));
  END IF;
END
$$;

DROP TRIGGER IF EXISTS update_plaque_orders_updated_at ON public.plaque_orders;
CREATE TRIGGER update_plaque_orders_updated_at
BEFORE UPDATE ON public.plaque_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();