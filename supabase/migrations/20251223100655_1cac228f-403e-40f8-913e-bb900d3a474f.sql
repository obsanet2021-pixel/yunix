-- Update admin_roles permissions JSON structure to use 3-tier model
-- This preserves existing roles but updates the permissions to use the new granular structure

-- Update all existing roles with the new 3-tier permission structure
-- We'll set reasonable defaults based on the old permissions

UPDATE admin_roles
SET permissions = jsonb_build_object(
  -- Dashboard permissions
  'view_dashboard', COALESCE((permissions->>'view_dashboard')::boolean, true),
  'edit_own_dashboard', COALESCE((permissions->>'view_dashboard')::boolean, true),
  'manage_dashboard', COALESCE((permissions->>'manage_settings')::boolean, false),
  
  -- User permissions
  'view_users', COALESCE((permissions->>'manage_users')::boolean, false),
  'edit_users', COALESCE((permissions->>'manage_users')::boolean, false),
  'manage_users', COALESCE((permissions->>'manage_users')::boolean, false),
  
  -- Role permissions
  'view_roles', COALESCE((permissions->>'manage_roles')::boolean, false),
  'manage_roles', COALESCE((permissions->>'manage_roles')::boolean, false),
  
  -- Finance permissions
  'view_finance', COALESCE((permissions->>'manage_finance')::boolean OR (permissions->>'view_invoices')::boolean, false),
  'edit_invoices', COALESCE((permissions->>'manage_finance')::boolean, false),
  'approve_payments', COALESCE((permissions->>'manage_finance')::boolean, false),
  'manage_finance', COALESCE((permissions->>'manage_finance')::boolean, false),
  
  -- Course permissions
  'view_courses', COALESCE((permissions->>'manage_courses')::boolean, true),
  'edit_courses', COALESCE((permissions->>'manage_courses')::boolean, false),
  'publish_courses', COALESCE((permissions->>'manage_courses')::boolean, false),
  'manage_courses', COALESCE((permissions->>'manage_courses')::boolean, false),
  
  -- Analytics permissions
  'view_analytics', COALESCE((permissions->>'manage_analytics')::boolean OR (permissions->>'view_reports')::boolean, false),
  'create_reports', COALESCE((permissions->>'manage_analytics')::boolean, false),
  'edit_reports', COALESCE((permissions->>'manage_analytics')::boolean, false),
  'manage_analytics', COALESCE((permissions->>'manage_analytics')::boolean, false),
  
  -- Support permissions
  'view_support', COALESCE((permissions->>'manage_support')::boolean, false),
  'reply_tickets', COALESCE((permissions->>'manage_support')::boolean, false),
  'close_tickets', COALESCE((permissions->>'manage_support')::boolean, false),
  'manage_support', COALESCE((permissions->>'manage_support')::boolean, false),
  
  -- Order permissions
  'view_orders', COALESCE((permissions->>'manage_plaque_orders')::boolean, false),
  'update_orders', COALESCE((permissions->>'manage_plaque_orders')::boolean, false),
  'approve_orders', COALESCE((permissions->>'manage_plaque_orders')::boolean, false),
  'manage_plaque_orders', COALESCE((permissions->>'manage_plaque_orders')::boolean, false),
  
  -- Settings permissions
  'view_settings', COALESCE((permissions->>'manage_settings')::boolean, false),
  'edit_settings', COALESCE((permissions->>'manage_settings')::boolean, false),
  'manage_settings', COALESCE((permissions->>'manage_settings')::boolean, false),
  
  -- Social Media permissions (new module)
  'view_social_media', COALESCE((permissions->>'manage_analytics')::boolean, false),
  'edit_social_media', COALESCE((permissions->>'manage_analytics')::boolean, false),
  'manage_social_media', COALESCE((permissions->>'manage_analytics')::boolean, false)
)
WHERE name != 'CEO';

-- Set CEO role to have all permissions as true
UPDATE admin_roles
SET permissions = jsonb_build_object(
  'view_dashboard', true,
  'edit_own_dashboard', true,
  'manage_dashboard', true,
  'view_users', true,
  'edit_users', true,
  'manage_users', true,
  'view_roles', true,
  'manage_roles', true,
  'view_finance', true,
  'edit_invoices', true,
  'approve_payments', true,
  'manage_finance', true,
  'view_courses', true,
  'edit_courses', true,
  'publish_courses', true,
  'manage_courses', true,
  'view_analytics', true,
  'create_reports', true,
  'edit_reports', true,
  'manage_analytics', true,
  'view_support', true,
  'reply_tickets', true,
  'close_tickets', true,
  'manage_support', true,
  'view_orders', true,
  'update_orders', true,
  'approve_orders', true,
  'manage_plaque_orders', true,
  'view_settings', true,
  'edit_settings', true,
  'manage_settings', true,
  'view_social_media', true,
  'edit_social_media', true,
  'manage_social_media', true
)
WHERE name = 'CEO';