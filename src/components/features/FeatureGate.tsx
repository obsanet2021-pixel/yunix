/**
 * FeatureGate - Component for conditionally rendering features based on access
 *
 * Usage:
 * <FeatureGate feature="backtesting">
 *   <BacktestingTool />
 * </FeatureGate>
 *
 * <FeatureGate
 *   feature="backtesting"
 *   fallback={<UpgradePrompt feature="backtesting" />}
 * >
 *   <BacktestingTool />
 * </FeatureGate>
 */

import { ReactNode } from 'react';
import { useFeatureAccess, FeatureKey } from '@/config/features';
import { UpgradePrompt } from './UpgradePrompt';
import { LockedFeature } from './LockedFeature';

interface FeatureGateProps {
  feature: FeatureKey;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
  showLocked?: boolean;
}

export function FeatureGate({
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
  showLocked = true,
}: FeatureGateProps) {
  const { canAccess, isLocked, getLockReason, upgradeCTA, isVisible, isLoading } = useFeatureAccess();

  // Loading state
  if (isLoading) {
    return (
      <div className="animate-pulse bg-muted rounded-lg h-32 flex items-center justify-center">
        <span className="text-muted-foreground text-sm">Loading...</span>
      </div>
    );
  }

  // Feature not visible (hidden for free users)
  if (!isVisible(feature)) {
    return null;
  }

  // Has access - render children
  if (canAccess(feature)) {
    return <>{children}</>;
  }

  // Locked - show appropriate fallback
  if (fallback) {
    return <>{fallback}</>;
  }

  const lockReason = getLockReason(feature);

  // Toggle-based lock (feature disabled by CEO)
  if (lockReason.type === 'toggle' && showLocked) {
    return (
      <LockedFeature
        title="Feature Unavailable"
        description={lockReason.message}
        icon="off"
      />
    );
  }

  // Plan-based lock - show upgrade prompt or locked state
  if (lockReason.type === 'plan') {
    if (showUpgradePrompt) {
      return (
        <UpgradePrompt
          feature={feature}
          message={lockReason.message}
          cta={upgradeCTA(feature)}
        />
      );
    }

    if (showLocked) {
      return (
        <LockedFeature
          title="Premium Feature"
          description={lockReason.message}
          cta={upgradeCTA(feature)}
        />
      );
    }
  }

  return null;
}
