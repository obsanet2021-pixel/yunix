-- Add policy to allow staff to view their own record by email (for initial access before user_id is linked)
CREATE POLICY "Staff can view own record by email"
ON public.staff
FOR SELECT
TO authenticated
USING (lower(email) = lower(auth.email()));