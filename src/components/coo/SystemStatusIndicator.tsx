import { cn } from "@/lib/utils";

interface SystemStatusIndicatorProps {
  name: string;
  status: "operational" | "degraded" | "down";
  lastChecked?: string;
}

export function SystemStatusIndicator({
  name,
  status,
  lastChecked,
}: SystemStatusIndicatorProps) {
  const statusConfig = {
    operational: {
      color: "bg-green-500",
      text: "Operational",
      textColor: "text-green-500",
    },
    degraded: {
      color: "bg-yellow-500",
      text: "Degraded",
      textColor: "text-yellow-500",
    },
    down: {
      color: "bg-red-500",
      text: "Down",
      textColor: "text-red-500",
    },
  };

  const { color, text, textColor } = statusConfig[status];

  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div className="flex items-center gap-2">
        <span className={cn("w-2 h-2 rounded-full", color)} />
        <span className="text-sm">{name}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn("text-xs font-medium", textColor)}>{text}</span>
        {lastChecked && (
          <span className="text-xs text-muted-foreground">{lastChecked}</span>
        )}
      </div>
    </div>
  );
}
