/**
 * YUNIX Role & Permission Configuration
 * 
 * Single source of truth for:
 * - Role definitions
 * - Tier mappings
 * - Route access requirements
 * - Route-to-role mappings
 */

// Tier levels (higher = more access)
export type Tier = 1 | 2 | 3 | 4 | 5;

// Role names (standardized)
export type StaffRole =
  | 'CEO'
  | 'COO'
  | 'CTO'
  | 'CFO'
  | 'Course Manager'
  | 'Marketing'
  | 'Marketing Agent'
  | 'Social Media Manager'
  | 'Data Analyst'
  | 'Support'
  | 'Support Agent'
  | 'Support Specialist'
  | 'QA'
  | 'QA Tester'
  | 'Plaque Order Manager'
  | 'Order Manager'
  | 'Backend Developer'
  | 'Frontend Developer'
  | 'Loyalty Operations'
  | 'Partner Operations';

// Tier mapping
export const ROLE_TIERS: Record<StaffRole | 'user', Tier> = {
  'CEO': 5,
  'COO': 4,
  'CTO': 4,
  'CFO': 4,
  'Course Manager': 3,
  'Marketing': 3,
  'Marketing Agent': 3,
  'Social Media Manager': 2,
  'Data Analyst': 3,
  'Support': 2,
  'Support Agent': 2,
  'Support Specialist': 2,
  'QA': 2,
  'QA Tester': 2,
  'Plaque Order Manager': 3,
  'Order Manager': 3,
  'Backend Developer': 4,
  'Frontend Developer': 4,
  'Loyalty Operations': 2,
  'Partner Operations': 2,
  'user': 1,
};

// Route access requirements (minimum tier needed)
export const ROUTE_TIERS: Record<string, Tier> = {
  // Overview
  'overview': 4,

  // Management
  'staff-management': 4,
  'role-management': 5,

  // Executive dashboards
  'staff/coo': 4,
  'staff/cto': 4,
  'staff/cfo': 4,

  // Manager dashboards
  'staff/course-manager': 3,
  'staff/marketing': 3,
  'staff/analytics': 3,
  'staff/plaque-orders': 3,

  // Operational dashboards
  'staff/support': 2,
  'staff/qa': 2,
  'staff/social-media': 2,

  // Operations
  'telegram-bot': 4,
  'loyalty-operations': 2,
  'partner-operations': 2,
  'discount-rules': 4,

  // System
  'settings': 5,
  'ceo-bot': 5,
  'delivery-bot': 4,
  'finance': 4,
  'telegram-updates': 5,
};

// Role-specific section access (overrides tier-based access)
export const ROLE_SECTION_ACCESS: Record<string, string[]> = {
  'CEO': [
    'overview',
    'staff-management',
    'role-management',
    'staff/coo',
    'staff/cto',
    'staff/cfo',
    'staff/course-manager',
    'staff/support',
    'staff/analytics',
    'staff/qa',
    'staff/plaque-orders',
    'staff/marketing',
    'telegram-bot',
    'loyalty-operations',
    'partner-operations',
    'discount-rules',
    'settings',
  ],
  'COO': [
    'overview',
    'staff-management',
    'role-management',
    'staff/coo',
    'staff/cto',
    'staff/cfo',
    'staff/course-manager',
    'staff/support',
    'staff/analytics',
    'staff/qa',
    'staff/plaque-orders',
    'staff/marketing',
    'telegram-bot',
    'loyalty-operations',
    'partner-operations',
    'discount-rules',
  ],
  'CTO': [
    'overview',
    'staff-management',
    'role-management',
    'staff/coo',
    'staff/cto',
    'staff/cfo',
    'staff/course-manager',
    'staff/support',
    'staff/analytics',
    'staff/qa',
    'staff/plaque-orders',
    'staff/marketing',
    'telegram-bot',
    'loyalty-operations',
    'partner-operations',
    'discount-rules',
    'settings',
  ],
  'CFO': [
    'staff/cfo',
    'staff/analytics',
    'staff/qa',
    'staff/plaque-orders',
    'staff/marketing',
  ],
  'Course Manager': [
    'staff/course-manager',
    'staff/analytics',
  ],
  'Marketing Agent': [
    'staff/marketing',
  ],
  'Social Media Manager': [
    'staff/marketing',
  ],
  'Data Analyst': [
    'staff/analytics',
  ],
  'Support Agent': [
    'staff/support',
  ],
  'Support Specialist': [
    'staff/support',
  ],
  'QA Tester': [
    'staff/qa',
  ],
  'Order Manager': [
    'staff/plaque-orders',
  ],
  'Plaque Order Manager': [
    'staff/plaque-orders',
  ],
};

// Role to default route mapping (post-auth redirect)
export const ROLE_ROUTES: Record<StaffRole | 'user', string> = {
  'CEO': '/app/admin/ceo',
  'COO': '/app/admin/staff/coo',
  'CTO': '/app/admin/staff/cto',
  'CFO': '/app/admin/staff/cfo',
  'Course Manager': '/app/admin/staff/course-manager',
  'Marketing': '/app/admin/staff/marketing',
  'Marketing Agent': '/app/admin/staff/marketing',
  'Social Media Manager': '/app/admin/staff/marketing',
  'Data Analyst': '/app/admin/staff/analytics',
  'Support': '/app/admin/staff/support',
  'Support Agent': '/app/admin/staff/support',
  'Support Specialist': '/app/admin/staff/support',
  'QA': '/app/admin/staff/qa',
  'QA Tester': '/app/admin/staff/qa',
  'Plaque Order Manager': '/app/admin/staff/plaque-orders',
  'Order Manager': '/app/admin/staff/plaque-orders',
  'Backend Developer': '/app/admin/staff/cto',
  'Frontend Developer': '/app/admin/staff/cto',
  'Loyalty Operations': '/app/admin/loyalty-operations',
  'Partner Operations': '/app/admin/partner-operations',
  'user': '/app/dashboard',
};

// Check if user has access to a section
export function hasAccessToSection(userTier: Tier, section: string): boolean {
  const requiredTier = ROUTE_TIERS[section] || 5; // Default to CEO-only if not defined
  return userTier >= requiredTier;
}

// Get tier for a role
export function getTierForRole(role: string): Tier {
  return ROLE_TIERS[role as StaffRole] || 1;
}

// Get default route for a role
export function getRouteForRole(role: string): string {
  return ROLE_ROUTES[role as StaffRole] || '/app/dashboard';
}

// Check if role is a staff role
export function isStaffRole(role: string): boolean {
  return role !== 'user' && role in ROLE_TIERS && ROLE_TIERS[role as StaffRole] >= 2;
}

// Read-only access configuration
export const READ_ONLY_ROLES: Record<string, string[]> = {
  'CTO': [
    'overview',
    'staff-management',
    'role-management',
    'staff/coo',
    'staff/cto',
    'staff/cfo',
    'staff/course-manager',
    'staff/support',
    'staff/analytics',
    'staff/qa',
    'staff/plaque-orders',
    'staff/marketing',
    'telegram-bot',
    'loyalty-operations',
    'partner-operations',
    'discount-rules',
    'settings',
  ],
  'CFO': [
    'staff/plaque-orders', // Read-only access to plaque orders list
  ],
};

// Check if role has read-only access to a section
export function hasReadOnlyAccess(role: string, section: string): boolean {
  const readOnlySections = READ_ONLY_ROLES[role];
  return readOnlySections ? readOnlySections.includes(section) : false;
}

// Check if role has write access to a section
export function hasWriteAccess(role: string, section: string): boolean {
  if (hasReadOnlyAccess(role, section)) {
    return false;
  }
  const userTier = getTierForRole(role);
  return hasAccessToSection(userTier, section);
}
