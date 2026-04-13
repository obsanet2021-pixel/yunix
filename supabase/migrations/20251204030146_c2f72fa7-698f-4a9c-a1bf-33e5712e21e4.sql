-- Drop the problematic RLS policy that causes infinite recursion
DROP POLICY IF EXISTS "Staff can view all staff" ON public.staff;