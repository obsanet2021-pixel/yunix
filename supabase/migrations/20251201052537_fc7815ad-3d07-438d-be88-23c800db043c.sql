-- Create roles table for admin system
CREATE TABLE public.admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  permissions jsonb NOT NULL DEFAULT '{
    "manage_users": false,
    "manage_roles": false,
    "manage_finance": false,
    "manage_courses": false,
    "manage_analytics": false,
    "manage_settings": false,
    "manage_support": false,
    "view_dashboard": false,
    "view_invoices": false,
    "view_reports": false
  }'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create staff table
CREATE TABLE public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role_id uuid REFERENCES public.admin_roles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'suspended')),
  invited_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- Create function to check if user is CEO
CREATE OR REPLACE FUNCTION public.is_ceo(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff s
    JOIN public.admin_roles r ON s.role_id = r.id
    WHERE s.user_id = _user_id AND r.name = 'CEO'
  )
$$;

-- Create function to check staff permission
CREATE OR REPLACE FUNCTION public.staff_has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff s
    JOIN public.admin_roles r ON s.role_id = r.id
    WHERE s.user_id = _user_id 
    AND (r.name = 'CEO' OR (r.permissions->>_permission)::boolean = true)
  )
$$;

-- RLS Policies for admin_roles
CREATE POLICY "Staff can view roles" ON public.admin_roles
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.staff WHERE user_id = auth.uid())
);

CREATE POLICY "CEO can manage roles" ON public.admin_roles
FOR ALL USING (public.is_ceo(auth.uid()));

-- RLS Policies for staff
CREATE POLICY "Staff can view all staff" ON public.staff
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.staff WHERE user_id = auth.uid())
);

CREATE POLICY "CEO and managers can manage staff" ON public.staff
FOR ALL USING (
  public.is_ceo(auth.uid()) OR public.staff_has_permission(auth.uid(), 'manage_users')
);

-- Insert default CEO role with all permissions
INSERT INTO public.admin_roles (name, description, permissions) VALUES (
  'CEO',
  'Chief Executive Officer - Full system access',
  '{
    "manage_users": true,
    "manage_roles": true,
    "manage_finance": true,
    "manage_courses": true,
    "manage_analytics": true,
    "manage_settings": true,
    "manage_support": true,
    "view_dashboard": true,
    "view_invoices": true,
    "view_reports": true
  }'::jsonb
);

-- Insert default Manager role
INSERT INTO public.admin_roles (name, description, permissions) VALUES (
  'Manager',
  'Team Manager - Limited management access',
  '{
    "manage_users": true,
    "manage_roles": false,
    "manage_finance": false,
    "manage_courses": true,
    "manage_analytics": true,
    "manage_settings": false,
    "manage_support": true,
    "view_dashboard": true,
    "view_invoices": true,
    "view_reports": true
  }'::jsonb
);

-- Insert default Staff role
INSERT INTO public.admin_roles (name, description, permissions) VALUES (
  'Staff',
  'Regular Staff Member - Basic access',
  '{
    "manage_users": false,
    "manage_roles": false,
    "manage_finance": false,
    "manage_courses": false,
    "manage_analytics": false,
    "manage_settings": false,
    "manage_support": false,
    "view_dashboard": true,
    "view_invoices": false,
    "view_reports": true
  }'::jsonb
);

-- Create trigger for updated_at
CREATE TRIGGER update_admin_roles_updated_at
BEFORE UPDATE ON public.admin_roles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_staff_updated_at
BEFORE UPDATE ON public.staff
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();