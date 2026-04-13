import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw } from "lucide-react";

interface AccountCycle {
  id: string;
  cycle_number: number;
  status: 'active' | 'closed';
  start_date: string;
}

interface CycleFilterProps {
  cycles: AccountCycle[];
  selectedCycleId: string;
  onCycleChange: (cycleId: string) => void;
  showAllOption?: boolean;
  className?: string;
}

export function CycleFilter({
  cycles,
  selectedCycleId,
  onCycleChange,
  showAllOption = true,
  className = ""
}: CycleFilterProps) {
  if (cycles.length === 0) return null;

  return (
    <Select value={selectedCycleId} onValueChange={onCycleChange}>
      <SelectTrigger className={`w-[160px] ${className}`}>
        <div className="flex items-center gap-2">
          <RefreshCw className="h-3 w-3" />
          <SelectValue placeholder="Select Cycle" />
        </div>
      </SelectTrigger>
      <SelectContent className="z-50">
        {showAllOption && (
          <SelectItem value="all">All Cycles (Lifetime)</SelectItem>
        )}
        {cycles.map((cycle) => (
          <SelectItem key={cycle.id} value={cycle.id}>
            <span className="flex items-center gap-2">
              Cycle #{cycle.cycle_number}
              {cycle.status === 'active' && (
                <span className="text-xs text-green-500">(Active)</span>
              )}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
