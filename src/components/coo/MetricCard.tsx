import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  severity?: "normal" | "warning" | "critical";
  subtitle?: string;
  className?: string;
}

export function MetricCard({
  title,
  value,
  icon,
  trend,
  severity = "normal",
  subtitle,
  className,
}: MetricCardProps) {
  const severityColors = {
    normal: "border-l-green-500",
    warning: "border-l-yellow-500",
    critical: "border-l-red-500",
  };

  return (
    <Card className={cn("border-l-4", severityColors[severity], className)}>
      <CardContent className="p-4">
        <div className="flex flex-col space-y-3">
          {/* Header with icon and title */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="p-2 rounded-lg bg-muted shrink-0">{icon}</div>
          </div>
          
          {/* Value and trend */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold leading-none">{value}</p>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
              )}
            </div>
            {trend && (
              <div
                className={cn(
                  "text-sm font-medium flex items-center gap-1",
                  trend.isPositive ? "text-green-500" : "text-red-500"
                )}
              >
                <span>{trend.isPositive ? "↑" : "↓"}</span>
                <span>{Math.abs(trend.value)}%</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
