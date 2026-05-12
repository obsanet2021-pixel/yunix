// ✅ GOOD - Server-side role checking
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import {
  ROLE_TIERS,
  ROUTE_TIERS,
  hasReadOnlyAccess,
  hasWriteAccess,
  type Tier,
  type StaffRole
} from '@/config/roles';

export type UserRole = 'admin' | 'staff' | 'user' | null;

export type AccessLevel = 'tier1' | 'tier2' | 'tier3' | 'tier4' | 'tier5' | null;

// Re-export from centralized config for consistency
export { ROLE_TIERS, ROUTE_TIERS, type Tier, type StaffRole };

export type StaffPermissions = {
  manage_users: boolean;
  manage_finance: boolean;
  view_reports: boolean;
  manage_courses: boolean;
  manage_staff: boolean;
  view_analytics: boolean;
};

// Access level definitions
export const ACCESS_LEVELS = {
  tier1: { name: 'User', access: 'No admin access' },
  tier2: { name: 'Operational Staff', access: 'Functional areas only' },
  tier3: { name: 'Managers', access: 'Domain-specific tools' },
  tier4: { name: 'Executives', access: 'Overview + dashboards + analytics' },
  tier5: { name: 'CEO', access: 'Full system control' },
} as const;

// Role to access level mapping - derived from centralized config
export const ROLE_TO_ACCESS_LEVEL: Record<string, AccessLevel> = {
  'CEO': 'tier5',
  'COO': 'tier4',
  'CTO': 'tier4',
  'CFO': 'tier4',
  'Course Manager': 'tier3',
  'Marketing': 'tier3',
  'Marketing Agent': 'tier3',
  'Social Media Manager': 'tier2',
  'Support': 'tier2',
  'Support Agent': 'tier2',
  'Support Specialist': 'tier2',
  'QA': 'tier2',
  'QA Tester': 'tier2',
  'Analytics': 'tier3',
  'Data Analyst': 'tier3',
  'Social Media': 'tier2',
  'Loyalty Ops': 'tier2',
  'Loyalty Operations': 'tier2',
  'Partner Ops': 'tier2',
  'Partner Operations': 'tier2',
  'Plaque Order Manager': 'tier3',
  'Order Manager': 'tier3',
  'Backend Developer': 'tier4',
  'Frontend Developer': 'tier4',
};

// Section access requirements - derived from centralized config
export const SECTION_ACCESS_LEVELS: Record<string, AccessLevel> = {
  'overview': 'tier4',
  'staff-management': 'tier4',
  'role-management': 'tier5',
  'staff/coo': 'tier4',
  'staff/cto': 'tier4',
  'staff/cfo': 'tier4',
  'staff/course-manager': 'tier3',
  'staff/support': 'tier2',
  'staff/qa': 'tier2',
  'staff/analytics': 'tier3',
  'staff/data-analyst': 'tier3',
  'staff/marketing': 'tier3',
  'staff/social-media': 'tier2',
  'staff/plaque-orders': 'tier3',
  'telegram-bot': 'tier4',
  'loyalty-operations': 'tier2',
  'partner-operations': 'tier2',
  'discount-rules': 'tier4',
  'settings': 'tier5',
  'finance': 'tier4',
  'ceo-bot': 'tier5',
  'delivery-bot': 'tier4',
  'telegram-updates': 'tier5',
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

// CEO email for fallback access
const CEO_EMAIL = 'obsanet2021@gmail.com';

export function useStaffPermissions() {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>(null);
  const [accessLevel, setAccessLevel] = useState<AccessLevel>(null);
  const [staffRoleName, setStaffRoleName] = useState<string | null>(null);
  const [staffData, setStaffData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setAccessLevel(null);
      setStaffRoleName(null);
      setStaffData(null);
      setLoading(false);
      return;
    }

    const checkPermissions = async () => {
      // CEO email fallback - ensures CEO always has access even if DB role is missing
      const isCEOByEmail = user.email?.toLowerCase() === CEO_EMAIL.toLowerCase();

      // Check for admin role
      // @ts-ignore - Supabase RPC type issue
      const { data: isAdmin } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });
      
      if (isAdmin || isCEOByEmail) {
        setRole('admin');
        setAccessLevel('tier5'); // CEO gets tier5
        setStaffRoleName('CEO');
        setLoading(false);
        return;
      }

      // Check for staff role and fetch staff details
      // @ts-ignore - Supabase RPC type issue
      const { data: isStaff } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'staff'
      });

      if (isStaff) {
        setRole('staff');
        // Fetch staff role name from staff table (join with admin_roles to get name)
        const { data: staffRecord } = await supabase
          .from('staff')
          .select(`role:admin_roles(name)`)
          .eq('user_id', user.id)
          .single();

        if (staffRecord) {
          setStaffData(staffRecord);
          const staffInfo = staffRecord as any;
          const roleName = staffInfo.role?.name || staffInfo.role;
          if (roleName) {
            setStaffRoleName(roleName);
            setAccessLevel(ROLE_TO_ACCESS_LEVEL[roleName] || 'tier2');
          } else {
            setAccessLevel('tier2');
          }
        } else {
          setAccessLevel('tier2'); // Default to tier2 if no role found
        }
      } else {
        setRole('user');
        setAccessLevel('tier1');
      }
      setLoading(false);
    };

    checkPermissions();
  }, [user]);

  const isAdmin = role === 'admin';
  const isStaff = role === 'staff' || role === 'admin';
  const isUser = role === 'user';
  const isCEO = accessLevel === 'tier5';

  // Permission check function
  const hasAccessToSection = (section: string): boolean => {
    if (!accessLevel) return false;
    const requiredLevel = SECTION_ACCESS_LEVELS[section];
    if (!requiredLevel) return false;

    // Tier 5 (CEO) has access to everything
    if (accessLevel === 'tier5') return true;

    // Compare access levels numerically
    const levelMap: Record<AccessLevel, number> = {
      tier1: 1,
      tier2: 2,
      tier3: 3,
      tier4: 4,
      tier5: 5,
    };

    return levelMap[accessLevel] >= levelMap[requiredLevel];
  };

  // Check if user has read-only access to a section
  const checkReadOnlyAccess = (section: string): boolean => {
    if (!staffRoleName) return false;
    return hasReadOnlyAccess(staffRoleName, section);
  };

  // Check if user has write access to a section
  const checkWriteAccess = (section: string): boolean => {
    if (!staffRoleName) return false;
    return hasWriteAccess(staffRoleName, section);
  };

  return {
    role,
    isAdmin,
    isStaff,
    isUser,
    isCEO,
    accessLevel,
    staffRoleName,
    staffData,
    hasAccessToSection,
    hasReadOnlyAccess: checkReadOnlyAccess,
    hasWriteAccess: checkWriteAccess,
    loading
  };
}
