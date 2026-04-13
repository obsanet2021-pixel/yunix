import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SeverityBadge } from "./SeverityBadge";
import { ReactNode } from "react";

interface DepartmentCardProps {
  name: string;
  icon: ReactNode;
  performanceScore: number;
  activeIssues: number;
  resourceUsage: number;
}

export function DepartmentCard({
  name,
  icon,
  performanceScore,
  activeIssues,
  resourceUsage,
}: DepartmentCardProps) {
  const getSeverity = (issues: number): "critical" | "warning" | "normal" => {
    if (issues > 5) return "critical";
    if (issues > 2) return "warning";
    return "normal";
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-sm font-medium">{name}</CardTitle>
          </div>
          <SeverityBadge
            severity={getSeverity(activeIssues)}
            label={`${activeIssues} issues`}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Performance</span>
            <span className="font-medium">{performanceScore}%</span>
          </div>
          <Progress value={performanceScore} className="h-1.5" />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Resource Usage</span>
            <span className="font-medium">{resourceUsage}%</span>
          </div>
          <Progress value={resourceUsage} className="h-1.5" />
        </div>
      </CardContent>
    </Card>
  );
}
