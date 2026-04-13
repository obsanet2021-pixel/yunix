-- Create plaque_orders table
CREATE TABLE public.plaque_orders (
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
CREATE POLICY "Users can view their own plaque orders"
ON public.plaque_orders
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own orders
CREATE POLICY "Users can create their own plaque orders"
ON public.plaque_orders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- CEO can view all orders
CREATE POLICY "CEO can view all plaque orders"
ON public.plaque_orders
FOR SELECT
USING (is_ceo(auth.uid()));

-- CEO can update orders
CREATE POLICY "CEO can update plaque orders"
ON public.plaque_orders
FOR UPDATE
USING (is_ceo(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_plaque_orders_updated_at
BEFORE UPDATE ON public.plaque_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();