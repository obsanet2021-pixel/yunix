-- Create plaque_payments table for payment tracking
CREATE TABLE IF NOT EXISTS public.plaque_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.plaque_orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('telebirr', 'crypto', 'bank')),
  proof_image_url TEXT,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'rejected')),
  received_at TIMESTAMP WITH TIME ZONE,
  received_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plaque_payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
CREATE POLICY "Users can view their own payments"
ON public.plaque_payments
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own payments
CREATE POLICY "Users can create their own payments"
ON public.plaque_payments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- CEO can view all payments
CREATE POLICY "CEO can view all payments"
ON public.plaque_payments
FOR SELECT
USING (is_ceo(auth.uid()));

-- CEO can update payments
CREATE POLICY "CEO can update payments"
ON public.plaque_payments
FOR UPDATE
USING (is_ceo(auth.uid()));

-- Staff with manage_support can view all payments
CREATE POLICY "Staff can view all payments"
ON public.plaque_payments
FOR SELECT
USING (staff_has_permission(auth.uid(), 'manage_support'));

-- Staff with manage_support can update payments
CREATE POLICY "Staff can update payments"
ON public.plaque_payments
FOR UPDATE
USING (staff_has_permission(auth.uid(), 'manage_support'));

-- Add payment_status column to plaque_orders
ALTER TABLE public.plaque_orders 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'pending', 'received'));

-- Create trigger for updated_at
CREATE TRIGGER update_plaque_payments_updated_at
BEFORE UPDATE ON public.plaque_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();