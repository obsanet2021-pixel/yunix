-- Create order status history table to track all status changes
CREATE TABLE public.order_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.plaque_orders(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  status_type TEXT NOT NULL DEFAULT 'order', -- 'order', 'payment', 'delivery'
  changed_by UUID,
  changed_by_type TEXT NOT NULL DEFAULT 'system', -- 'system', 'user', 'staff'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- Users can view status history for their own orders
CREATE POLICY "Users can view status history for their orders"
ON public.order_status_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM plaque_orders
    WHERE plaque_orders.id = order_status_history.order_id
    AND plaque_orders.user_id = auth.uid()
  )
);

-- Staff can view all status history
CREATE POLICY "Staff can view all status history"
ON public.order_status_history
FOR SELECT
USING (is_ceo(auth.uid()) OR staff_has_permission(auth.uid(), 'manage_support'));

-- Staff can insert status history
CREATE POLICY "Staff can insert status history"
ON public.order_status_history
FOR INSERT
WITH CHECK (is_ceo(auth.uid()) OR staff_has_permission(auth.uid(), 'manage_support'));

-- System/triggers can insert (service role)
CREATE POLICY "Service role can manage status history"
ON public.order_status_history
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Create index for faster lookups
CREATE INDEX idx_order_status_history_order_id ON public.order_status_history(order_id);
CREATE INDEX idx_order_status_history_created_at ON public.order_status_history(created_at DESC);

-- Add realtime for status history
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status_history;

-- Create trigger function to log status changes automatically
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on plaque_orders
CREATE TRIGGER trigger_log_order_status_change
AFTER UPDATE ON public.plaque_orders
FOR EACH ROW
EXECUTE FUNCTION public.log_order_status_change();