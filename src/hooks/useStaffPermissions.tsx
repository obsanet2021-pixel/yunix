import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// 3-Tier Permission Structure: View -> Edit/Operate -> Manage
export interface StaffPermissions {
  // Dashboard
  view_dashboard: boolean;
  edit_own_dashboard: boolean;
  manage_dashboard: boolean;
  
  // Users
  view_users: boolean;
  edit_users: boolean;
  manage_users: boolean;
  
  // Roles
  view_roles: boolean;
  manage_roles: boolean;
  
  // Finance
  view_finance: boolean;
  edit_invoices: boolean;
  approve_payments: boolean;
  manage_finance: boolean;
  
  // Courses
  view_courses: boolean;
  edit_courses: boolean;
  publish_courses: boolean;
  manage_courses: boolean;
  
  // Analytics
  view_analytics: boolean;
  create_reports: boolean;
  edit_reports: boolean;
  manage_analytics: boolean;
  
  // Support
  view_support: boolean;
  reply_tickets: boolean;
  close_tickets: boolean;
  manage_support: boolean;
  
  // Orders
  view_orders: boolean;
  update_orders: boolean;
  approve_orders: boolean;
  manage_plaque_orders: boolean;
  
  // Settings
  view_settings: boolean;
  edit_settings: boolean;
  manage_settings: boolean;
  
  // Social Media
  view_social_media: boolean;
  edit_social_media: boolean;
  manage_social_media: boolean;
}

// Permission groups for UI organization
export const permissionGroups = {
  dashboard: {
    label: 'Dashboard',
    permissions: ['view_dashboard', 'edit_own_dashboard', 'manage_dashboard'] as const,
  },
  users: {
    label: 'Users',
    permissions: ['view_users', 'edit_users', 'manage_users'] as const,
  },
  roles: {
    label: 'Roles',
    permissions: ['view_roles', 'manage_roles'] as const,
  },
  finance: {
    label: 'Finance',
    permissions: ['view_finance', 'edit_invoices', 'approve_payments', 'manage_finance'] as const,
  },
  courses: {
    label: 'Courses',
    permissions: ['view_courses', 'edit_courses', 'publish_courses', 'manage_courses'] as const,
  },
  analytics: {
    label: 'Analytics',
    permissions: ['view_analytics', 'create_reports', 'edit_reports', 'manage_analytics'] as const,
  },
  support: {
    label: 'Support',
    permissions: ['view_support', 'reply_tickets', 'close_tickets', 'manage_support'] as const,
  },
  orders: {
    label: 'Orders',
    permissions: ['view_orders', 'update_orders', 'approve_orders', 'manage_plaque_orders'] as const,
  },
  settings: {
    label: 'Settings',
    permissions: ['view_settings', 'edit_settings', 'manage_settings'] as const,
  },
  socialMedia: {
    label: 'Social Media',
    permissions: ['view_social_media', 'edit_social_media', 'manage_social_media'] as const,
  },
};

// Human-readable labels for all permissions
export const permissionLabels: Record<keyof StaffPermissions, string> = {
  // Dashboard
  view_dashboard: 'View Dashboard',
  edit_own_dashboard: 'Edit Own Dashboard',
  manage_dashboard: 'Manage All Dashboards',
  
  // Users
  view_users: 'View Users',
  edit_users: 'Edit Users',
  manage_users: 'Manage Users',
  
  // Roles
  view_roles: 'View Roles',
  manage_roles: 'Manage Roles',
  
  // Finance
  view_finance: 'View Finance',
  edit_invoices: 'Edit Invoices',
  approve_payments: 'Approve Payments',
  manage_finance: 'Manage Finance',
  
  // Courses
  view_courses: 'View Courses',
  edit_courses: 'Edit Courses',
  publish_courses: 'Publish Courses',
  manage_courses: 'Manage Courses',
  
  // Analytics
  view_analytics: 'View Analytics',
  create_reports: 'Create Reports',
  edit_reports: 'Edit Reports',
  manage_analytics: 'Manage Analytics',
  
  // Support
  view_support: 'View Support',
  reply_tickets: 'Reply to Tickets',
  close_tickets: 'Close Tickets',
  manage_support: 'Manage Support',
  
  // Orders
  view_orders: 'View Orders',
  update_orders: 'Update Orders',
  approve_orders: 'Approve Orders',
  manage_plaque_orders: 'Manage All Orders',
  
  // Settings
  view_settings: 'View Settings',
  edit_settings: 'Edit Settings',
  manage_settings: 'Manage Settings',
  
  // Social Media
  view_social_media: 'View Social Media',
  edit_social_media: 'Edit Social Media',
  manage_social_media: 'Manage Social Media',
};

// Map role names to their dashboard routes
export const roleRoutes: Record<string, string> = {
  'CEO': '/app/admin/ceo',
  'COO': '/app/admin/staff/coo',
  'CTO': '/app/admin/staff/cto',
  'CFO': '/app/admin/staff/cfo',
  'Course Manager': '/app/admin/staff/course-manager',
  'Support Specialist': '/app/admin/staff/support',
  'Support Agent': '/app/admin/staff/support',
  'Support': '/app/admin/staff/support',
  'QA & Support': '/app/admin/staff/support',
  'QA Tester': '/app/admin/staff/qa',
  'QA': '/app/admin/staff/qa',
  'Data Analyst': '/app/admin/staff/analytics',
  'Data Analyts': '/app/admin/staff/analytics',
  'Plaque Order Manager': '/app/admin/staff/plaque-orders',
  'order Manager': '/app/admin/staff/plaque-orders',
  'Order Manager': '/app/admin/staff/plaque-orders',
  'Social Media Manager': '/app/admin/staff/social-media',
  'Marketing': '/app/admin/staff/marketing',
  'Marketing Agent': '/app/admin/staff/marketing',
  'Backend Developer': '/app/admin/staff/cto',
  'Frontend Developer': '/app/admin/staff/cto',
  'Staff': '/app/admin/staff',
};

export interface StaffData {
  id: string;
  name: string;
  email: string;
  status: string;
  role: {
    id: string;
    name: string;
    permissions: StaffPermissions;
  } | null;
}

export function useStaffPermissions() {
  const [staffData, setStaffData] = useState<StaffData | null>(null);
  const [isCEO, setIsCEO] = useState(false);
  const [permissions, setPermissions] = useState<StaffPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStaffData();
  }, []);

  const loadStaffData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // First try to find staff by user_id
      let { data: staff, error } = await supabase
        .from('staff')
        .select(`
          id,
          name,
          email,
          status,
          user_id,
          role:admin_roles(id, name, permissions)
        `)
        .eq('user_id', user.id)
        .maybeSingle();
      
      // Log for debugging
      if (error) {
        console.error('Error fetching staff by user_id:', error);
      }

      // If not found by user_id, try finding by email
      if (!staff) {
        const { data: staffByEmail, error: emailError } = await supabase
          .from('staff')
          .select(`
            id,
            name,
            email,
            status,
            user_id,
            role:admin_roles(id, name, permissions)
          `)
          .eq('email', user.email?.toLowerCase())
          .maybeSingle();
        
        if (emailError) {
          console.error('Error fetching staff by email:', emailError);
        }

        if (staffByEmail) {
          // Update the staff record with the user_id and set status to active
          const { data: updatedStaff, error: updateError } = await supabase
            .from('staff')
            .update({ 
              user_id: user.id, 
              status: 'active' 
            })
            .eq('id', staffByEmail.id)
            .select(`
              id,
              name,
              email,
              status,
              user_id,
              role:admin_roles(id, name, permissions)
            `)
            .single();

          if (!updateError && updatedStaff) {
            staff = updatedStaff;
          } else {
            // If update failed (likely RLS), still use the email-found staff
            staff = staffByEmail;
          }
        }
      }

      if (staff) {
        const roleData = Array.isArray(staff.role) ? staff.role[0] : staff.role;
        const formattedStaff: StaffData = {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          status: staff.status,
          role: roleData ? {
            id: roleData.id,
            name: roleData.name,
            permissions: roleData.permissions as StaffPermissions
          } : null
        };
        
        setStaffData(formattedStaff);
        setIsCEO(formattedStaff.role?.name === 'CEO');
        setPermissions(formattedStaff.role?.permissions || null);
      }
    } catch (error) {
      console.error('Error loading staff data:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission: keyof StaffPermissions): boolean => {
    if (isCEO) return true;
    return permissions?.[permission] || false;
  };

  const canAccessPage = (requiredPermission: keyof StaffPermissions): boolean => {
    if (isCEO) return true;
    return hasPermission(requiredPermission);
  };

  const getStaffDashboardRoute = (): string => {
    if (!staffData?.role?.name) return '/app/admin/staff';
    return roleRoutes[staffData.role.name] || '/app/admin/staff';
  };

  return {
    staffData,
    isCEO,
    permissions,
    loading,
    hasPermission,
    canAccessPage,
    refreshData: loadStaffData,
    getStaffDashboardRoute,
    roleRoutes
  };
}
