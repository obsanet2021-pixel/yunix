// ✅ GOOD - Server-side role checking
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

export type UserRole = 'admin' | 'staff' | 'user' | null;

export type StaffPermissions = {
  manage_users: boolean;
  manage_finance: boolean;
  view_reports: boolean;
  manage_courses: boolean;
  manage_staff: boolean;
  view_analytics: boolean;
};

export const permissionLabels: Record<keyof StaffPermissions, string> = {
  manage_users: 'Manage Users',
  manage_finance: 'Manage Finance',
  view_reports: 'View Reports',
  manage_courses: 'Manage Courses',
  manage_staff: 'Manage Staff',
  view_analytics: 'View Analytics',
};

export const permissionGroups = {
  administration: ['manage_users', 'manage_staff'],
  finance: ['manage_finance'],
  reporting: ['view_reports', 'view_analytics'],
  content: ['manage_courses'],
};

export function useStaffPermissions() {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    // ✅ Use server-side RPC to check role (can't be bypassed)
    const checkRole = async () => {
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'  // Check for admin first
      });
      
      if (data) {
        setRole('admin');
      } else {
        // Check for staff
        const { data: isStaff } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'staff'
        });
        setRole(isStaff ? 'staff' : 'user');
      }
      setLoading(false);
    };

    checkRole();
  }, [user]);

  const isAdmin = role === 'admin';
  const isStaff = role === 'staff' || role === 'admin';
  const isUser = role === 'user';

  return { role, isAdmin, isStaff, isUser, loading };
}
