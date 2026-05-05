/**
 * PlanBadge - Visual indicator of plan requirements
 *
 * Shows which plan is required for a feature.
 */

import { Crown, Star, Zap } from 'lucide-react';
import { Plan, PLAN_NAMES } from '@/config/features';

interface PlanBadgeProps {
  plan: Plan;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'subtle' | 'gradient';
}

const planIcons = {
  free: Zap,
  starter: Star,
  pro: Crown,
};

const planStyles = {
  free: {
    default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    subtle: 'bg-slate-50/50 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400',
    gradient: 'bg-gradient-to-r from-slate-400 to-slate-500 text-white',
  },
  starter: {
    default: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    subtle: 'bg-amber-50/50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400',
    gradient: 'bg-gradient-to-r from-amber-400 to-orange-500 text-white',
  },
  pro: {
    default: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    subtle: 'bg-purple-50/50 text-purple-600 dark:bg-purple-950/20 dark:text-purple-400',
    gradient: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
  },
};

const sizeStyles = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
};

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export function PlanBadge({
  plan,
  showIcon = true,
  size = 'md',
  variant = 'default',
}: PlanBadgeProps) {
  const Icon = planIcons[plan];
  const style = planStyles[plan][variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-medium ${sizeStyles[size]} ${style}`}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {PLAN_NAMES[plan]}
    </span>
  );
}

/**
 * FeaturePlanBadge - Shows the minimum plan required for a feature
 */
import { FeatureKey, FEATURES } from '@/config/features';

interface FeaturePlanBadgeProps {
  feature: FeatureKey;
  userPlan?: Plan;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function FeaturePlanBadge({
  feature,
  userPlan,
  showIcon = true,
  size = 'sm',
}: FeaturePlanBadgeProps) {
  const featureConfig = FEATURES[feature];
  if (!featureConfig) return null;

  const minPlan = featureConfig.plans[0];
  const hasAccess = userPlan ? featureConfig.plans.includes(userPlan) : false;

  if (hasAccess) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        Available
      </span>
    );
  }

  return (
    <PlanBadge
      plan={minPlan}
      showIcon={showIcon}
      size={size}
      variant="subtle"
    />
  );
}
