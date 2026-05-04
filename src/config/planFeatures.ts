/**
 * YUNIX Plan-Based Feature Gating Configuration
 * 
 * Defines which features are available per subscription plan.
 * Staff/CEO roles bypass all plan restrictions (get everything).
 */

export type Plan = 'free' | 'starter' | 'pro';
export type UserRole = 'user' | 'staff' | 'admin';

// Feature definitions
export type Feature =
  | 'dashboard_access'
  | 'basic_trade_journal'
  | 'economic_calendar'
  | 'course_library'
  | 'text_ai_chat'
  | 'analytics'
  | 'analytics_screenshot'
  | 'advanced_analytics'
  | 'prop_firm_tracking'
  | 'ai_trading_coach'
  | 'certificate_gallery'
  | 'priority_support';

// Plan hierarchy (higher = more access)
export const PLAN_HIERARCHY: Record<Plan, number> = {
  free: 1,
  starter: 2,
  pro: 3,
};

// Feature requirements - minimum plan needed
export const FEATURE_REQUIREMENTS: Record<Feature, Plan> = {
  // Free plan features
  dashboard_access: 'free',
  basic_trade_journal: 'free',
  economic_calendar: 'free',
  course_library: 'free',
  text_ai_chat: 'free',
  analytics: 'free',

  // Starter plan features
  analytics_screenshot: 'starter',
  advanced_analytics: 'starter',
  prop_firm_tracking: 'starter',

  // Pro plan features
  ai_trading_coach: 'pro',
  certificate_gallery: 'pro',
  priority_support: 'pro',
};

// Human-readable feature names
export const FEATURE_NAMES: Record<Feature, string> = {
  dashboard_access: 'Dashboard Access',
  basic_trade_journal: 'Basic Trade Journal',
  economic_calendar: 'Economic Calendar',
  course_library: 'Course Library',
  text_ai_chat: 'AI Chat',
  analytics: 'Analytics',
  analytics_screenshot: 'Screenshot Sharing',
  advanced_analytics: 'Advanced Analytics',
  prop_firm_tracking: 'Prop Firm Tracking',
  ai_trading_coach: 'AI Trading Coach',
  certificate_gallery: 'Certificate Gallery',
  priority_support: 'Priority Support',
};

// Feature descriptions for upsell messaging
export const FEATURE_DESCRIPTIONS: Record<Feature, string> = {
  dashboard_access: 'Access your trading dashboard',
  basic_trade_journal: 'Track your trades with basic features',
  economic_calendar: 'View economic events and market calendar',
  course_library: 'Access all trading courses',
  text_ai_chat: 'Chat with our AI assistant',
  analytics: 'View your trading performance analytics',
  analytics_screenshot: 'Share your trading performance with screenshots',
  advanced_analytics: 'Deep dive analytics with advanced metrics',
  prop_firm_tracking: 'Track your prop firm challenges and payouts',
  ai_trading_coach: 'Get personalized AI trading coaching',
  certificate_gallery: 'Display your trading certificates',
  priority_support: 'Get priority customer support',
};

// Check if a feature is available for a given plan
export function hasFeatureAccess(
  feature: Feature,
  userPlan: Plan,
  userRole: UserRole = 'user'
): boolean {
  // Staff and admin always have access to everything
  if (userRole === 'staff' || userRole === 'admin') {
    return true;
  }

  const requiredPlan = FEATURE_REQUIREMENTS[feature];
  const userPlanLevel = PLAN_HIERARCHY[userPlan];
  const requiredPlanLevel = PLAN_HIERARCHY[requiredPlan];

  return userPlanLevel >= requiredPlanLevel;
}

// Get all features available for a plan
export function getFeaturesForPlan(plan: Plan, role: UserRole = 'user'): Feature[] {
  if (role === 'staff' || role === 'admin') {
    return Object.keys(FEATURE_REQUIREMENTS) as Feature[];
  }

  const userPlanLevel = PLAN_HIERARCHY[plan];

  return (Object.keys(FEATURE_REQUIREMENTS) as Feature[]).filter((feature) => {
    const requiredPlanLevel = PLAN_HIERARCHY[FEATURE_REQUIREMENTS[feature]];
    return userPlanLevel >= requiredPlanLevel;
  });
}

// Get the next plan tier for upsell messaging
export function getNextPlan(currentPlan: Plan): Plan | null {
  const plans: Plan[] = ['free', 'starter', 'pro'];
  const currentIndex = plans.indexOf(currentPlan);
  return currentIndex < plans.length - 1 ? plans[currentIndex + 1] : null;
}

// Plan pricing for upsell messaging
export const PLAN_PRICES: Record<Plan, { monthly: number; yearly: number }> = {
  free: { monthly: 0, yearly: 0 },
  starter: { monthly: 13, yearly: 10 },
  pro: { monthly: 20, yearly: 16 },
};
