/**
 * LockedFeature - Display component for locked/toggle-disabled features
 *
 * Shows a visually distinct locked state without the upgrade CTA.
 * Used when features are disabled via toggle or user has no upgrade path.
 */

import { Lock, Power, EyeOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface LockedFeatureProps {
  title: string;
  description: string;
  icon?: 'lock' | 'off' | 'hidden';
  cta?: string;
}

export function LockedFeature({
  title,
  description,
  icon = 'lock',
  cta,
}: LockedFeatureProps) {
  const icons = {
    lock: Lock,
    off: Power,
    hidden: EyeOff,
  };

  const Icon = icons[icon];

  return (
    <Card className="overflow-hidden border-muted-foreground/20 opacity-75">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Icon */}
          <div className="p-3 bg-muted rounded-xl">
            <Icon className="h-6 w-6 text-muted-foreground" />
          </div>

          {/* Content */}
          <div className="flex-1 space-y-1">
            <h3 className="font-medium text-muted-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground/70">{description}</p>
            {cta && (
              <p className="text-sm text-muted-foreground/50 mt-2">{cta}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
