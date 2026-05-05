/**
 * YUNIX Complete Feature Access System
 *
 * Combines:
 * - Subscription plans (free, starter, pro)
 * - User roles (user, staff, ceo)
 * - Feature toggles (CEO-controlled on/off switches)
 *
 * Core Access Logic:
 * - CEO/STAFF → ALWAYS ALLOW (bypass everything)
 * - Otherwise:
 *   - User plan must be in feature.plans
 *   - AND if feature.toggleable → feature.enabled must be true
 */

import { useFeatureToggles } from '@/hooks/useFeatureToggles';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
import { useStaffPermissions } from '@/hooks/useStaffPermissions';

// ==================== TYPES ====================

export type Plan = 'free' | 'starter' | 'pro';
export type Role = 'user' | 'staff' | 'ceo';

export type FeatureKey =
  // Core features (non-toggleable)
  | 'dashboard'
  | 'trade_management'
  | 'trade_journal'
  | 'analytics'
  | 'analytics_screenshot'
  | 'accounts'
  | 'economic_calendar'
  | 'backtesting'
  | 'mt5_connection'
  // Certificate features
  | 'certificate_view'
  | 'certificate_print'
  | 'certificate_size_guide'
  // Order features
  | 'plug_orders'
  // Program features (toggleable)
  | 'loyalty_program'
  | 'partner_program'
  // Auth features (toggleable)
  | 'google_signin'
  | 'invitation_contest'
  // AI features
  | 'text_ai'
  | 'image_upload';

export interface FeatureConfig {
  key: FeatureKey;
  name: string;
  description: string;
  plans: Plan[];
  toggleable: boolean;
  enabled?: boolean; // Only used for toggleable features
  upgradeMessage?: string; // Custom upsell message
  lockedVisibility: 'visible' | 'hidden'; // Show locked features or hide them
}

// ==================== PLAN HIERARCHY ====================

export const PLAN_HIERARCHY: Record<Plan, number> = {
  free: 1,
  starter: 2,
  pro: 3,
};

export const PLAN_NAMES: Record<Plan, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
};

export const PLAN_PRICES: Record<Plan, { monthly: number; yearly: number }> = {
  free: { monthly: 0, yearly: 0 },
  starter: { monthly: 13, yearly: 10 },
  pro: { monthly: 20, yearly: 16 },
};

// ==================== FEATURE CONFIGURATION ====================

export const FEATURES: Record<FeatureKey, FeatureConfig> = {
  // ============== CORE FEATURES (Non-toggleable) ==============
  dashboard: {
    key: 'dashboard',
    name: 'Dashboard',
    description: 'Access your trading dashboard',
    plans: ['free', 'starter', 'pro'],
    toggleable: false,
    lockedVisibility: 'visible',
  },
  trade_management: {
    key: 'trade_management',
    name: 'Trade Management',
    description: 'Manage your trades and positions',
    plans: ['free', 'starter', 'pro'],
    toggleable: false,
    lockedVisibility: 'visible',
  },
  trade_journal: {
    key: 'trade_journal',
    name: 'Trade Journal',
    description: 'Track and analyze your trades',
    plans: ['free', 'starter', 'pro'],
    toggleable: false,
    lockedVisibility: 'visible',
  },
  analytics: {
    key: 'analytics',
    name: 'Analytics',
    description: 'View your trading performance analytics',
    plans: ['free', 'starter', 'pro'],
    toggleable: false,
    lockedVisibility: 'visible',
  },
  analytics_screenshot: {
    key: 'analytics_screenshot',
    name: 'Screenshot Sharing',
    description: 'Share your trading performance with screenshots',
    plans: ['starter', 'pro'],
    toggleable: false,
    lockedVisibility: 'visible',
    upgradeMessage: 'Share your wins with beautiful screenshot cards',
  },
  accounts: {
    key: 'accounts',
    name: 'Accounts',
    description: 'Manage your trading accounts',
    plans: ['free', 'starter', 'pro'],
    toggleable: false,
    lockedVisibility: 'visible',
  },
  economic_calendar: {
    key: 'economic_calendar',
    name: 'Economic Calendar',
    description: 'View economic events and market calendar',
    plans: ['free', 'starter', 'pro'],
    toggleable: false,
    lockedVisibility: 'visible',
  },
  backtesting: {
    key: 'backtesting',
    name: 'Backtesting',
    description: 'Backtest your trading strategies',
    plans: ['starter', 'pro'],
    toggleable: false,
    lockedVisibility: 'visible',
    upgradeMessage: 'Test your strategies with historical data',
  },
  mt5_connection: {
    key: 'mt5_connection',
    name: 'MT5 Connection',
    description: 'Connect to MetaTrader 5 for live trading',
    plans: ['pro'],
    toggleable: false,
    lockedVisibility: 'visible',
    upgradeMessage: 'Connect your MT5 account for automated trading',
  },

  // ============== CERTIFICATE FEATURES ==============
  certificate_view: {
    key: 'certificate_view',
    name: 'Certificate Gallery',
    description: 'View your trading certificates',
    plans: ['free', 'starter', 'pro'],
    toggleable: false,
    lockedVisibility: 'visible',
  },
  certificate_print: {
    key: 'certificate_print',
    name: 'Certificate Printing',
    description: 'Print your certificates as physical plaques',
    plans: ['starter', 'pro'],
    toggleable: false,
    lockedVisibility: 'visible',
    upgradeMessage: 'Print your achievements as beautiful plaques',
  },
  certificate_size_guide: {
    key: 'certificate_size_guide',
    name: 'Size Guide',
    description: 'Certificate size and pricing guide',
    plans: ['starter', 'pro'],
    toggleable: true,
    lockedVisibility: 'visible',
    upgradeMessage: 'View certificate sizing and pricing options',
  },

  // ============== ORDER FEATURES ==============
  plug_orders: {
    key: 'plug_orders',
    name: 'Plug Orders',
    description: 'Order certificate plugs',
    plans: ['starter', 'pro'],
    toggleable: false,
    lockedVisibility: 'visible',
  },

  // ============== PROGRAM FEATURES (Toggleable) ==============
  loyalty_program: {
    key: 'loyalty_program',
    name: 'Loyalty Program',
    description: 'Earn rewards for your trading activity',
    plans: ['starter', 'pro'],
    toggleable: true,
    lockedVisibility: 'hidden', // Hide from free users
  },
  partner_program: {
    key: 'partner_program',
    name: 'Partner Program',
    description: 'Refer friends and earn commissions',
    plans: ['starter', 'pro'],
    toggleable: true,
    lockedVisibility: 'hidden', // Hide from free users
  },

  // ============== AUTH FEATURES (Toggleable) ==============
  google_signin: {
    key: 'google_signin',
    name: 'Google Sign In',
    description: 'Sign in with your Google account',
    plans: ['free', 'starter', 'pro'],
    toggleable: true,
    lockedVisibility: 'visible',
  },
  invitation_contest: {
    key: 'invitation_contest',
    name: 'Invitation Contest',
    description: 'Invite friends and climb the leaderboard',
    plans: ['free', 'starter', 'pro'],
    toggleable: true,
    lockedVisibility: 'visible',
  },

  // ============== AI FEATURES ==============
  text_ai: {
    key: 'text_ai',
    name: 'AI Assistant',
    description: 'Chat with our AI trading assistant',
    plans: ['free', 'starter', 'pro'],
    toggleable: false,
    lockedVisibility: 'visible',
  },
  image_upload: {
    key: 'image_upload',
    name: 'AI Image Analysis',
    description: 'Upload charts for AI analysis',
    plans: ['starter', 'pro'],
    toggleable: false,
    lockedVisibility: 'visible',
    upgradeMessage: 'Get AI analysis on your chart screenshots',
  },
};

// ==================== ACCESS LOGIC ====================

/**
 * Check if a user can access a feature
 * CORE LOGIC:
 * - CEO/STAFF → ALWAYS true (bypass everything)
 * - Otherwise:
 *   - Plan must be in feature.plans
 *   - AND if toggleable → must be enabled
 */
export function canAccess(
  featureKey: FeatureKey,
  userPlan: Plan,
  userRole: Role,
  toggles?: Record<string, boolean>
): boolean {
  // CEO and STAFF always have access
  if (userRole === 'ceo' || userRole === 'staff') {
    return true;
  }

  const feature = FEATURES[featureKey];
  if (!feature) return false;

  // Check plan access
  const hasPlanAccess = feature.plans.includes(userPlan);
  if (!hasPlanAccess) return false;

  // Check toggle for toggleable features
  if (feature.toggleable) {
    const isEnabled = toggles?.[featureKey] ?? feature.enabled ?? true;
    return isEnabled;
  }

  return true;
}

/**
 * Get the reason why a feature is locked
 */
export function getLockReason(
  featureKey: FeatureKey,
  userPlan: Plan,
  toggles?: Record<string, boolean>
): { type: 'plan' | 'toggle' | 'none'; message: string; upgradePlan?: Plan } {
  const feature = FEATURES[featureKey];
  if (!feature) return { type: 'none', message: '' };

  // Check plan first
  const hasPlanAccess = feature.plans.includes(userPlan);
  if (!hasPlanAccess) {
    // Find the minimum required plan
    const requiredPlan = feature.plans[0];
    return {
      type: 'plan',
      message: feature.upgradeMessage || `${feature.name} requires ${PLAN_NAMES[requiredPlan]} plan`,
      upgradePlan: requiredPlan,
    };
  }

  // Check toggle
  if (feature.toggleable) {
    const isEnabled = toggles?.[featureKey] ?? feature.enabled ?? true;
    if (!isEnabled) {
      return {
        type: 'toggle',
        message: `${feature.name} is currently disabled`,
      };
    }
  }

  return { type: 'none', message: '' };
}

/**
 * Get all accessible features for a user
 */
export function getAccessibleFeatures(
  userPlan: Plan,
  userRole: Role,
  toggles?: Record<string, boolean>
): FeatureKey[] {
  return (Object.keys(FEATURES) as FeatureKey[]).filter((key) =>
    canAccess(key, userPlan, userRole, toggles)
  );
}

/**
 * Get all visible features (including locked ones that should be shown)
 */
export function getVisibleFeatures(
  userPlan: Plan,
  userRole: Role,
  toggles?: Record<string, boolean>
): FeatureKey[] {
  if (userRole === 'ceo' || userRole === 'staff') {
    return Object.keys(FEATURES) as FeatureKey[];
  }

  return (Object.keys(FEATURES) as FeatureKey[]).filter((key) => {
    const feature = FEATURES[key];
    // Show if:
    // 1. User has plan access
    // 2. OR feature is visible when locked AND user could potentially upgrade to access it
    const hasPlanAccess = feature.plans.includes(userPlan);
    const isLockedButVisible =
      feature.lockedVisibility === 'visible' && feature.plans.some((p) => PLAN_HIERARCHY[p] > PLAN_HIERARCHY[userPlan]);

    return hasPlanAccess || isLockedButVisible;
  });
}

/**
 * Get next plan tier for upsell
 */
export function getNextPlan(currentPlan: Plan): Plan | null {
  const plans: Plan[] = ['free', 'starter', 'pro'];
  const currentIndex = plans.indexOf(currentPlan);
  return currentIndex < plans.length - 1 ? plans[currentIndex + 1] : null;
}

/**
 * Get upgrade CTA message
 */
export function getUpgradeCTA(featureKey: FeatureKey, currentPlan: Plan): string {
  const feature = FEATURES[featureKey];
  if (!feature) return '';

  const nextPlan = getNextPlan(currentPlan);
  if (!nextPlan) return '';

  // Check if next tier would unlock this feature
  const nextTierUnlocks = feature.plans.includes(nextPlan);
  if (!nextTierUnlocks) {
    // Find which plan unlocks it
    const unlockingPlan = feature.plans[0];
    return `Upgrade to ${PLAN_NAMES[unlockingPlan]} to unlock ${feature.name}`;
  }

  return `Upgrade to ${PLAN_NAMES[nextPlan]} ($${PLAN_PRICES[nextPlan].monthly}/mo) to unlock ${feature.name}`;
}

// ==================== HOOK COMPOSER ====================

/**
 * Combined hook that provides complete feature access checking
 * Usage:
 *   const { canAccess, isLocked, upgradeCTA } = useFeatureAccess();
 *   if (canAccess('backtesting')) { ... }
 */
export function useFeatureAccess() {
  const { plan, role, isStaff, isAdmin, isLoading: planLoading } = usePlanFeatures();
  const { toggles, loading: togglesLoading } = useFeatureToggles();

  const normalizedRole: Role = isAdmin ? 'ceo' : isStaff ? 'staff' : 'user';
  const isLoading = planLoading || togglesLoading;

  const togglesRecord = toggles as unknown as Record<string, boolean>;

  const checkAccess = (featureKey: FeatureKey): boolean => {
    if (isLoading) return false;
    return canAccess(featureKey, plan, normalizedRole, togglesRecord);
  };

  const getLockStatus = (featureKey: FeatureKey) => {
    return getLockReason(featureKey, plan, togglesRecord);
  };

  const getCTA = (featureKey: FeatureKey): string => {
    return getUpgradeCTA(featureKey, plan);
  };

  const isFeatureVisible = (featureKey: FeatureKey): boolean => {
    if (normalizedRole === 'ceo' || normalizedRole === 'staff') return true;
    const feature = FEATURES[featureKey];
    if (!feature) return false;

    const hasAccess = feature.plans.includes(plan);
    const canUpgradeToAccess = feature.plans.some((p) => PLAN_HIERARCHY[p] > PLAN_HIERARCHY[plan]);

    return hasAccess || (feature.lockedVisibility === 'visible' && canUpgradeToAccess);
  };

  return {
    // Core check
    canAccess: checkAccess,

    // Lock status
    isLocked: (featureKey: FeatureKey) => !checkAccess(featureKey),
    getLockReason: getLockStatus,

    // Upgrade info
    upgradeCTA: getCTA,
    currentPlan: plan,
    userRole: normalizedRole,
    nextPlan: getNextPlan(plan),
    planPrices: PLAN_PRICES,

    // Visibility
    isVisible: isFeatureVisible,

    // Loading
    isLoading,

    // Raw data
    features: FEATURES,
    toggles,
  };
}

// ==================== LEGACY COMPATIBILITY ====================

// Re-export for backwards compatibility with existing code
export { usePlanFeatures } from '@/hooks/usePlanFeatures';
export { useStaffPermissions } from '@/hooks/useStaffPermissions';
