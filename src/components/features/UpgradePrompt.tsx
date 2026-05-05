/**
 * UpgradePrompt - Beautiful upgrade CTA component
 *
 * Shows when a user doesn't have access to a feature,
 * encouraging them to upgrade their plan.
 */

import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FeatureKey, FEATURES, PLAN_NAMES } from '@/config/features';

interface UpgradePromptProps {
  feature: FeatureKey;
  message?: string;
  cta?: string;
  compact?: boolean;
}

export function UpgradePrompt({
  feature,
  message,
  cta,
  compact = false,
}: UpgradePromptProps) {
  const navigate = useNavigate();
  const featureConfig = FEATURES[feature];

  const handleUpgrade = () => {
    navigate('/app/upgrade');
  };

  const requiredPlan = featureConfig?.plans[0];
  const planName = requiredPlan ? PLAN_NAMES[requiredPlan] : 'Starter';

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-lg border border-amber-200/50 dark:border-amber-800/30">
        <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg">
          <Lock className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {featureConfig?.name} locked
          </p>
          <p className="text-xs text-muted-foreground">
            Upgrade to {planName}
          </p>
        </div>
        <Button size="sm" onClick={handleUpgrade} className="shrink-0">
          Upgrade
        </Button>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden border-amber-200/50 dark:border-amber-800/30">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Icon */}
          <div className="p-3 bg-gradient-to-br from-amber-400 via-orange-400 to-red-400 rounded-xl shadow-lg shadow-orange-500/20">
            <Sparkles className="h-6 w-6 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 space-y-1">
            <h3 className="font-semibold text-foreground">
              {message || `${featureConfig?.name} requires ${planName} plan`}
            </h3>
            <p className="text-sm text-muted-foreground">
              {cta || featureConfig?.upgradeMessage || `Upgrade to unlock this premium feature`}
            </p>
          </div>

          {/* CTA */}
          <Button
            onClick={handleUpgrade}
            className="shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-orange-500/25"
          >
            Upgrade Now
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Plan badges */}
        <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground">Available on:</span>
          {featureConfig?.plans.map((plan) => (
            <span
              key={plan}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 text-amber-700 dark:text-amber-300"
            >
              {PLAN_NAMES[plan]}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
