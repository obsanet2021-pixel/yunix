-- Add SELECT policy for staff with manage_support or manage_plaque_orders
CREATE POLICY "Staff can view all plaque orders" 
ON plaque_orders FOR SELECT
USING (
  staff_has_permission(auth.uid(), 'manage_support'::text) OR
  staff_has_permission(auth.uid(), 'manage_plaque_orders'::text)
);

-- Add UPDATE policy for manage_plaque_orders permission
CREATE POLICY "Staff with plaque permissions can update orders" 
ON plaque_orders FOR UPDATE
USING (
  staff_has_permission(auth.uid(), 'manage_plaque_orders'::text)
);

-- Update certificates policy to include manage_plaque_orders
DROP POLICY IF EXISTS "Staff can view all certificates for plaque orders" ON certificates;
CREATE POLICY "Staff can view all certificates for plaque orders" 
ON certificates FOR SELECT
USING (
  is_ceo(auth.uid()) OR 
  staff_has_permission(auth.uid(), 'manage_support'::text) OR
  staff_has_permission(auth.uid(), 'manage_plaque_orders'::text)
);