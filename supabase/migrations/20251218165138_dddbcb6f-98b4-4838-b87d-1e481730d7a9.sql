-- Add RLS policy to allow users to update payment_status on their own plaque orders
CREATE POLICY "Users can update their own plaque orders" 
ON public.plaque_orders 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add RLS policy to allow staff with manage_support permission to update any plaque order
CREATE POLICY "Staff with manage_support can update plaque orders" 
ON public.plaque_orders 
FOR UPDATE 
USING (staff_has_permission(auth.uid(), 'manage_support'::text));