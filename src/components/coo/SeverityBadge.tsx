import { cn } from "@/lib/utils";

interface SeverityBadgeProps {
  severity: "critical" | "warning" | "normal";
  label?: string;
}

export function SeverityBadge({ severity, label }: SeverityBadgeProps) {
  const config = {
    critical: {
      bg: "bg-red-500/20",
      text: "text-red-500",
      dot: "bg-red-500",
      defaultLabel: "Critical",
    },
    warning: {
      bg: "bg-yellow-500/20",
      text: "text-yellow-500",
      dot: "bg-yellow-500",
      defaultLabel: "Warning",
    },
    normal: {
      bg: "bg-green-500/20",
      text: "text-green-500",
      dot: "bg-green-500",
      defaultLabel: "Normal",
    },
  };

  const { bg, text, dot, defaultLabel } = config[severity];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
        bg,
        text
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", dot)} />
      {label || defaultLabel}
    </span>
  );
}
