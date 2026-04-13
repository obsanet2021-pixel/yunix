-- Allow staff with manage_support permission or CEO to view all certificates for plaque order management
CREATE POLICY "Staff can view all certificates for plaque orders" 
ON public.certificates
FOR SELECT
USING (
  is_ceo(auth.uid()) OR 
  staff_has_permission(auth.uid(), 'manage_support'::text)
);