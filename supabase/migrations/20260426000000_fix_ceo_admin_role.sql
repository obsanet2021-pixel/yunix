-- Fix CEO admin role and ensure all staff have proper roles in user_roles table

-- 1. Insert CEO as admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('ec850929-598f-41b3-a23c-7f0ceb464b8c', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Ensure all active staff have staff role in user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT 
  u.id,
  'staff'::app_role
FROM public.staff s
JOIN auth.users u ON u.email = s.email
WHERE s.status = 'active'
ON CONFLICT (user_id, role) DO NOTHING;
