-- Create RLS policy for staff to read their own record
CREATE POLICY "Users can view their own staff record"
ON public.staff
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create RLS policy for CEO to read all staff records
CREATE POLICY "CEO can view all staff records"
ON public.staff
FOR SELECT
TO authenticated
USING (public.is_ceo(auth.uid()));

-- Create RLS policy for CEO to manage all staff records
CREATE POLICY "CEO can insert staff records"
ON public.staff
FOR INSERT
TO authenticated
WITH CHECK (public.is_ceo(auth.uid()));

CREATE POLICY "CEO can update staff records"
ON public.staff
FOR UPDATE
TO authenticated
USING (public.is_ceo(auth.uid()));

CREATE POLICY "CEO can delete staff records"
ON public.staff
FOR DELETE
TO authenticated
USING (public.is_ceo(auth.uid()));