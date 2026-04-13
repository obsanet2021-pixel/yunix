-- Create SECURITY DEFINER function to allow users to link themselves to their staff record
-- This bypasses RLS safely because it only allows linking if email matches
CREATE OR REPLACE FUNCTION public.link_staff_account(_user_id uuid, _user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.staff
  SET user_id = _user_id, status = 'active', updated_at = now()
  WHERE lower(email) = lower(_user_email)
    AND (user_id IS NULL OR user_id = _user_id);
  
  RETURN FOUND;
END;
$$;