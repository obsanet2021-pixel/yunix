/**
 * Feature Management - CEO Dashboard for controlling feature toggles
 *
 * Only CEO can access this page.
 * Allows enabling/disabling toggleable features globally.
 */

import { useState } from 'react';
import { useFeatureToggles } from '@/hooks/useFeatureToggles';
import { useStaffPermissions } from '@/hooks/useStaffPermissions';
import {
  FEATURES,
  FeatureKey,
  PLAN_NAMES,
  Plan,
} from '@/config/features';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Settings,
  Crown,
  Lock,
  ToggleLeft,
  Users,
  Shield,
  AlertTriangle,
  Save,
  RotateCcw,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function FeatureManagement() {
  const { toggles, updateToggles, loading, refetch } = useFeatureToggles();
  const { isCEO, loading: permissionsLoading } = useStaffPermissions();
  const [pendingChanges, setPendingChanges] = useState<Partial<typeof toggles>>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Only CEO can access this page
  if (!permissionsLoading && !isCEO) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-500" />
              Access Denied
            </CardTitle>
            <CardDescription>
              Only the CEO can manage feature toggles.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleToggleChange = (featureKey: string, enabled: boolean) => {
    setPendingChanges((prev) => ({ ...prev, [featureKey]: enabled }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (Object.keys(pendingChanges).length === 0) return;

    try {
      await updateToggles(pendingChanges);
      setPendingChanges({});
      setHasChanges(false);
      toast({
        title: 'Changes saved',
        description: 'Feature toggles have been updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save changes. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleReset = () => {
    if (hasChanges) {
      setShowConfirmDialog(true);
    } else {
      refetch();
      toast({
        title: 'Refreshed',
        description: 'Feature toggles have been refreshed from the server.',
      });
    }
  };

  const confirmReset = () => {
    setPendingChanges({});
    setHasChanges(false);
    refetch();
    setShowConfirmDialog(false);
    toast({
      title: 'Changes discarded',
      description: 'All pending changes have been discarded.',
    });
  };

  // Group features by category
  const groupedFeatures = Object.entries(FEATURES).reduce(
    (acc, [key, feature]) => {
      if (feature.toggleable) {
        const category = getCategory(key as FeatureKey);
        if (!acc[category]) acc[category] = [];
        acc[category].push({ key: key as FeatureKey, ...feature });
      }
      return acc;
    },
    {} as Record<string, Array<{ key: FeatureKey } & typeof FEATURES[FeatureKey]>>
  );

  if (loading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Crown className="h-6 w-6 text-amber-500" />
            Feature Management
          </h1>
          <p className="text-muted-foreground">
            Control which features are available to users. CEO-only access.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="secondary" className="animate-pulse">
              Unsaved changes
            </Badge>
          )}
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={loading}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || loading}
          >
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Legend */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <ToggleLeft className="h-4 w-4 text-blue-500" />
              <span>Toggleable features can be enabled/disabled globally</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-slate-500" />
              <span>Non-toggleable features are always on (plan-restricted only)</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              <span>Staff/CEO always bypass all restrictions</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Groups */}
      <div className="space-y-6">
        {Object.entries(groupedFeatures).map(([category, features]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 capitalize">
                {getCategoryIcon(category)}
                {category.replace('_', ' ')}
              </CardTitle>
              <CardDescription>
                {getCategoryDescription(category)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {features.map((feature) => {
                const currentValue = toggles[feature.key as keyof typeof toggles] ?? true;
                const pendingValue = pendingChanges[feature.key as keyof typeof toggles];
                const displayValue = pendingValue !== undefined ? pendingValue : currentValue;
                const isChanged = pendingValue !== undefined && pendingValue !== currentValue;

                return (
                  <div
                    key={feature.key}
                    className={`flex items-start justify-between p-4 rounded-lg border ${
                      isChanged
                        ? 'border-amber-500/50 bg-amber-50/30 dark:bg-amber-950/10'
                        : 'border-border'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{feature.name}</span>
                        {isChanged && (
                          <Badge variant="outline" className="text-amber-600 border-amber-600">
                            Modified
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-xs text-muted-foreground">Available on:</span>
                        {feature.plans.map((plan) => (
                          <Badge
                            key={plan}
                            variant="secondary"
                            className="text-xs"
                          >
                            {PLAN_NAMES[plan as Plan]}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-sm ${
                          displayValue ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {displayValue ? 'Enabled' : 'Disabled'}
                      </span>
                      <Switch
                        checked={displayValue}
                        onCheckedChange={(checked) =>
                          handleToggleChange(feature.key, checked)
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}

        {Object.keys(groupedFeatures).length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No toggleable features configured yet.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Discard Changes?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to discard them?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReset}
              className="bg-red-600 hover:bg-red-700"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Helper functions
function getCategory(featureKey: FeatureKey): string {
  const categories: Record<string, string> = {
    certificate_size_guide: 'certificates',
    loyalty_program: 'programs',
    partner_program: 'programs',
    google_signin: 'authentication',
    invitation_contest: 'engagement',
  };
  return categories[featureKey] || 'other';
}

function getCategoryIcon(category: string) {
  const icons: Record<string, React.ReactNode> = {
    certificates: <Lock className="h-5 w-5" />,
    programs: <Users className="h-5 w-5" />,
    authentication: <Shield className="h-5 w-5" />,
    engagement: <ToggleLeft className="h-5 w-5" />,
    other: <Settings className="h-5 w-5" />,
  };
  return icons[category] || <Settings className="h-5 w-5" />;
}

function getCategoryDescription(category: string): string {
  const descriptions: Record<string, string> = {
    certificates: 'Certificate-related features and add-ons',
    programs: 'Loyalty and partner program features',
    authentication: 'Sign-in methods and authentication options',
    engagement: 'User engagement and gamification features',
    other: 'Miscellaneous toggleable features',
  };
  return descriptions[category] || 'Feature toggles for this category';
}
