import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface PropFirm {
  id: string;
  name: string;
  account_type?: string;
  balance?: number | null;
  current_profit?: number | null;
  account_status?: string;
}

interface PropFirmFilterProps {
  propFirms: PropFirm[];
  selectedFirm: string;
  selectedAccount: string;
  onFirmChange: (value: string) => void;
  onAccountChange: (value: string) => void;
  showAccountFilter?: boolean;
}

const getAccountTypeColor = (type: string) => {
  switch (type) {
    case 'Funded':
      return 'bg-green-500/20 text-green-400 border-green-500/50';
    case 'Evaluation 1':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
    case 'Evaluation 2':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
    case 'Personal':
    default:
      return 'bg-slate-500/20 text-slate-400 border-slate-500/50';
  }
};

// Normalize prop firm names for case-insensitive comparison
const normalizeCase = (name: string) => name.trim().toLowerCase();

export default function PropFirmFilter({
  propFirms,
  selectedFirm,
  selectedAccount,
  onFirmChange,
  onAccountChange,
  showAccountFilter = true,
}: PropFirmFilterProps) {
  // Get unique prop firm names (case-insensitive, keep first occurrence casing)
  const uniqueFirmNamesMap = new Map<string, string>();
  propFirms.forEach(f => {
    const key = normalizeCase(f.name);
    if (!uniqueFirmNamesMap.has(key)) {
      uniqueFirmNamesMap.set(key, f.name);
    }
  });
  const uniqueFirmNames = Array.from(uniqueFirmNamesMap.values());
  
  // Get accounts for selected firm (sub-accounts) - case-insensitive
  const accountsForSelectedFirm = selectedFirm === "all" 
    ? propFirms 
    : propFirms.filter(f => normalizeCase(f.name) === normalizeCase(selectedFirm));

  return (
    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
      {/* Prop Firm Profile Filter - Shows unique names only */}
      <Select value={selectedFirm} onValueChange={(val) => {
        onFirmChange(val);
        // Reset account when firm changes
        if (val !== selectedFirm) {
          onAccountChange("all");
        }
      }}>
        <SelectTrigger className="w-full sm:w-[160px] min-w-0">
          <SelectValue placeholder="All Prop Firms" className="truncate" />
        </SelectTrigger>
        <SelectContent className="z-50">
          <SelectItem value="all">All Prop Firms</SelectItem>
          {uniqueFirmNames.map((name) => (
            <SelectItem key={name} value={name}>
              <span className="truncate">{name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Account Filter - Shows individual accounts with phase badges */}
      {showAccountFilter && (
        <Select value={selectedAccount} onValueChange={onAccountChange}>
          <SelectTrigger className="w-full sm:w-[200px] min-w-0">
            <SelectValue placeholder="All Accounts" className="truncate" />
          </SelectTrigger>
          <SelectContent className="z-50">
            <SelectItem value="all">All Accounts</SelectItem>
            {accountsForSelectedFirm.map((acc) => (
              <SelectItem key={acc.id} value={acc.id}>
                <div className="flex items-center gap-2 min-w-0">
                  <Badge 
                    variant="outline" 
                    className={`text-xs shrink-0 ${getAccountTypeColor(acc.account_type || 'Personal')}`}
                  >
                    {acc.account_type || 'Personal'}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono truncate">
                    ${(acc.balance || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
