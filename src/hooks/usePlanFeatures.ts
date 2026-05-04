import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useStaffPermissions } from '@/hooks/useStaffPermissions';
import {
  type Plan,
  type Feature,
  type UserRole,
  hasFeatureAccess,
  getFeaturesForPlan,
  FEATURE_NAMES,
  FEATURE_DESCRIPTIONS,
  getNextPlan,
  PLAN_PRICES,
} from '@/config/planFeatures';

interface PlanFeatures {
  plan: Plan;
  role: UserRole;
  isStaff: boolean;
  isAdmin: boolean;
  hasFeature: (feature: Feature) => boolean;
  availableFeatures: Feature[];
  isLoading: boolean;
  nextPlan: Plan | null;
  getFeatureName: (feature: Feature) => string;
  getFeatureDescription: (feature: Feature) => string;
  planPrices: typeof PLAN_PRICES;
  canAccessScreenshot: boolean;
}

export function usePlanFeatures(): PlanFeatures {
  const { user } = useAuth();
  const { isStaff, isAdmin, loading: staffLoading } = useStaffPermissions();
  const [plan, setPlan] = useState<Plan>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPlan('free');
      setLoading(false);
      return;
    }

    const fetchUserPlan = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('plan')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user plan:', error);
          setPlan('free');
        } else if (data && (data as { plan?: string }).plan) {
          setPlan((data as { plan: Plan }).plan);
        } else {
          setPlan('free');
        }
      } catch (error) {
        console.error('Error in fetchUserPlan:', error);
        setPlan('free');
      } finally {
        setLoading(false);
      }
    };

    fetchUserPlan();
  }, [user]);

  const role: UserRole = isAdmin ? 'admin' : isStaff ? 'staff' : 'user';

  const hasFeature = (feature: Feature): boolean => {
    return hasFeatureAccess(feature, plan, role);
  };

  const availableFeatures = getFeaturesForPlan(plan, role);

  const nextPlan = getNextPlan(plan);

  const canAccessScreenshot = hasFeature('analytics_screenshot');

  return {
    plan,
    role,
    isStaff,
    isAdmin,
    hasFeature,
    availableFeatures,
    isLoading: loading || staffLoading,
    nextPlan,
    getFeatureName: (feature: Feature) => FEATURE_NAMES[feature],
    getFeatureDescription: (feature: Feature) => FEATURE_DESCRIPTIONS[feature],
    planPrices: PLAN_PRICES,
    canAccessScreenshot,
  };
}

// Helper hook specifically for screenshot feature (most common use case)
export function useScreenshotFeature(): {
  canAccess: boolean;
  isLoading: boolean;
  upsellMessage: string;
} {
  const { canAccessScreenshot, isLoading, nextPlan, planPrices } = usePlanFeatures();

  const upsellMessage = nextPlan
    ? `Upgrade to ${nextPlan.charAt(0).toUpperCase() + nextPlan.slice(1)} ($${planPrices[nextPlan].monthly}/mo) to unlock screenshot sharing`
    : 'Screenshot sharing is available on paid plans';

  return {
    canAccess: canAccessScreenshot,
    isLoading,
    upsellMessage,
  };
}
