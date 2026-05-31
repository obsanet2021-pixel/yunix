import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, Upload, TrendingUp, Target, Pencil, Trash2, ChevronDown, ChevronRight, Building2, RefreshCw, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CycleViewModal } from "@/components/propfirms/CycleViewModal";
import { PayoutModal } from "@/components/propfirms/PayoutModal";
import { useAllCyclesForUser } from "@/hooks/useAccountCycles";


const PERSONAL_TYPES = ['Personal'] as const;
const PROP_FIRM_TYPES = ['Funded', 'Evaluation 1', 'Evaluation 2', 'Evaluation 3'] as const;
const ACCOUNT_STATUS = ['In Progress', 'Passed', 'Failed'] as const;

type AccountType = typeof PERSONAL_TYPES[number] | typeof PROP_FIRM_TYPES[number];
type AccountStatus = typeof ACCOUNT_STATUS[number];

interface PropFirm {
  id: string;
  name: string;
  account_number: string | null;
  balance: number | null;
  equity: number | null;
  profit_target: number | null;
  current_profit: number | null;
  consistency_percentage: number | null;
  dashboard_screenshot_url: string | null;
  account_type: AccountType;
  account_status: AccountStatus;
  funded_balance: number | null;
  // MT5 fields
  investor_password: string | null;
  mt5_server: string | null;
  mt5_login: string | null;
}

interface GroupedPropFirm {
  name: string;
  accounts: PropFirm[];
  totalBalance: number;
  totalEquity: number;
  accountTypes: string[];
}

const getAccountTypeColor = (type: string) => {
  switch (type) {
    case 'Funded':
      return 'bg-green-500/20 text-green-400 border-green-500/50';
    case 'Evaluation 1':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
    case 'Evaluation 2':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
    case 'Evaluation 3':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
    case 'Personal':
    default:
      return 'bg-slate-500/20 text-slate-400 border-slate-500/50';
  }
};

const getAccountStatusColor = (status: string) => {
  switch (status) {
    case 'Passed':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
    case 'Failed':
      return 'bg-red-500/20 text-red-400 border-red-500/50';
    case 'In Progress':
    default:
      return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
  }
};

export default function PropFirms() {
  const navigate = useNavigate();
  const location = useLocation();
  const [propFirms, setPropFirms] = useState<PropFirm[]>([]);
  const [isPersonalDialogOpen, setIsPersonalDialogOpen] = useState(false);
  const [isPropFirmDialogOpen, setIsPropFirmDialogOpen] = useState(false);
  // Connect modal moved to PropFirmDetail page
  const [isLoading, setIsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [firmToDelete, setFirmToDelete] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  
  // Cycle modals state
  const [cycleViewFirm, setCycleViewFirm] = useState<PropFirm | null>(null);
  const [payoutFirm, setPayoutFirm] = useState<PropFirm | null>(null);
  
  // Fetch all cycles for the user
  const { cyclesByFirm, getActiveCycleForFirm, getCyclesForFirm, refresh: refreshCycles } = useAllCyclesForUser();

  const [personalFormData, setPersonalFormData] = useState({
    name: "",
    account_number: "",
    balance: "",
    equity: "",
    profit_target: "",
    current_profit: "",
    consistency_percentage: "",
    account_status: "In Progress" as AccountStatus,
    // MT5 fields
    investor_password: "",
    mt5_server: "",
    mt5_login: ""
  });

  const [propFirmFormData, setPropFirmFormData] = useState({
    name: "",
    account_number: "",
    balance: "",
    equity: "",
    profit_target: "",
    current_profit: "",
    consistency_percentage: "",
    account_type: "Funded" as typeof PROP_FIRM_TYPES[number],
    account_status: "In Progress" as AccountStatus,
    // MT5 fields
    investor_password: "",
    mt5_server: "",
    mt5_login: ""
  });

  const [personalScreenshot, setPersonalScreenshot] = useState<File | null>(null);
  const [propFirmScreenshot, setPropFirmScreenshot] = useState<File | null>(null);

  useEffect(() => {
    fetchPropFirms();
  }, []);

  // Group prop firms by name
  // CRITICAL: Only Funded accounts contribute to totalBalance/totalEquity
  // Evaluations are phases, not separate capital - they must never be summed
  const groupedPropFirms = useMemo(() => {
    const groups: Record<string, GroupedPropFirm & { fundedBalance: number; fundedEquity: number; evaluationCount: number }> = {};
    
    propFirms.forEach(firm => {
      const normalizedName = firm.name.trim().toLowerCase();
      
      if (!groups[normalizedName]) {
        groups[normalizedName] = {
          name: firm.name,
          accounts: [],
          totalBalance: 0, // All accounts (for reference only)
          totalEquity: 0,  // All accounts (for reference only)
          fundedBalance: 0, // Only funded accounts - this is the REAL capital
          fundedEquity: 0,  // Only funded accounts - this is the REAL equity
          evaluationCount: 0,
          accountTypes: []
        };
      }
      
      groups[normalizedName].accounts.push(firm);
      
      // Only Funded accounts contribute to real balance/equity totals
      if (firm.account_type === 'Funded') {
        groups[normalizedName].fundedBalance += firm.balance || 0;
        groups[normalizedName].fundedEquity += (firm.balance || 0) + (firm.current_profit || 0);
      } else if (firm.account_type === 'Evaluation 1' || firm.account_type === 'Evaluation 2' || firm.account_type === 'Evaluation 3') {
        groups[normalizedName].evaluationCount += 1;
      }
      
      // Keep tracking all balances for reference (but not display as capital)
      groups[normalizedName].totalBalance += firm.balance || 0;
      groups[normalizedName].totalEquity += (firm.balance || 0) + (firm.current_profit || 0);
      
      if (!groups[normalizedName].accountTypes.includes(firm.account_type)) {
        groups[normalizedName].accountTypes.push(firm.account_type);
      }
    });
    
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [propFirms]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  };

  // Auto-open add dialogs from URL params (e.g., /app/prop-firms?add=personal)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const addParam = params.get('add');
    if (addParam === 'personal') {
      setIsPersonalDialogOpen(true);
      navigate(location.pathname, { replace: true });
    } else if (addParam === 'propfirm') {
      setIsPropFirmDialogOpen(true);
      navigate(location.pathname, { replace: true });
    }
  }, [location.search]);

  const fetchPropFirms = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("prop_firms")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load prop firms",
        variant: "destructive"
      });
      return;
    }
    setPropFirms(data || []);
  };

  const handlePersonalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Error", description: "You must be logged in", variant: "destructive" });
        return;
      }

      let screenshotUrl = null;
      if (personalScreenshot) {
        const fileExt = personalScreenshot.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("prop-firm-screenshots").upload(fileName, personalScreenshot);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("prop-firm-screenshots").getPublicUrl(fileName);
        screenshotUrl = publicUrl;
      }

      const balance = personalFormData.balance ? parseFloat(personalFormData.balance) : 0;
      const currentProfit = personalFormData.current_profit ? parseFloat(personalFormData.current_profit) : 0;
      const calculatedEquity = balance + currentProfit;

      // Encrypt investor password if provided
      let encryptedPassword = null;
      let encryptionIv = null;
      if (personalFormData.investor_password) {
        try {
          const { data: encryptData, error: encryptError } = await supabase.functions.invoke('encrypt-password', {
            body: { password: personalFormData.investor_password }
          });
          if (encryptError) throw encryptError;
          encryptedPassword = encryptData.encrypted;
          encryptionIv = encryptData.iv;
        } catch (encryptErr) {
          console.error('Encryption failed, storing plain password:', encryptErr);
        }
      }

      const { error } = await supabase.from("prop_firms").insert({
        user_id: user.id,
        name: personalFormData.name,
        account_number: personalFormData.account_number || null,
        balance: balance,
        equity: calculatedEquity,
        profit_target: personalFormData.profit_target ? parseFloat(personalFormData.profit_target) : null,
        current_profit: currentProfit,
        consistency_percentage: personalFormData.consistency_percentage ? parseFloat(personalFormData.consistency_percentage) : null,
        dashboard_screenshot_url: screenshotUrl,
        account_type: "Personal",
        account_status: personalFormData.account_status,
        // MT5 fields
        investor_password: encryptedPassword ? null : (personalFormData.investor_password || null),
        investor_password_encrypted: encryptedPassword,
        encryption_iv: encryptionIv,
        mt5_server: personalFormData.mt5_server || null,
        mt5_login: personalFormData.mt5_login || null
      });

      if (error) throw error;
      toast({ title: "Success", description: "Personal account added successfully" });
      setIsPersonalDialogOpen(false);
      setPersonalFormData({
        name: "", account_number: "", balance: "", equity: "", profit_target: "",
        current_profit: "", consistency_percentage: "", account_status: "In Progress",
        investor_password: "", mt5_server: "", mt5_login: ""
      });
      setPersonalScreenshot(null);
      fetchPropFirms();
    } catch (error) {
      toast({ title: "Error", description: "Failed to add personal account", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePropFirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Error", description: "You must be logged in", variant: "destructive" });
        return;
      }

      let screenshotUrl = null;
      if (propFirmScreenshot) {
        const fileExt = propFirmScreenshot.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("prop-firm-screenshots").upload(fileName, propFirmScreenshot);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("prop-firm-screenshots").getPublicUrl(fileName);
        screenshotUrl = publicUrl;
      }

      const balance = propFirmFormData.balance ? parseFloat(propFirmFormData.balance) : 0;
      const currentProfit = propFirmFormData.current_profit ? parseFloat(propFirmFormData.current_profit) : 0;
      const calculatedEquity = balance + currentProfit;

      // For Funded accounts, set funded_balance = balance (immutable original funded amount)
      const isFunded = propFirmFormData.account_type === 'Funded';

      // Encrypt investor password if provided
      let encryptedPassword = null;
      let encryptionIv = null;
      if (propFirmFormData.investor_password) {
        try {
          const { data: encryptData, error: encryptError } = await supabase.functions.invoke('encrypt-password', {
            body: { password: propFirmFormData.investor_password }
          });
          if (encryptError) throw encryptError;
          encryptedPassword = encryptData.encrypted;
          encryptionIv = encryptData.iv;
        } catch (encryptErr) {
          console.error('Encryption failed, storing plain password:', encryptErr);
        }
      }

      const { error } = await supabase.from("prop_firms").insert({
        user_id: user.id,
        name: propFirmFormData.name,
        account_number: propFirmFormData.account_number || null,
        balance: balance,
        equity: calculatedEquity,
        profit_target: propFirmFormData.profit_target ? parseFloat(propFirmFormData.profit_target) : null,
        current_profit: currentProfit,
        consistency_percentage: propFirmFormData.consistency_percentage ? parseFloat(propFirmFormData.consistency_percentage) : null,
        dashboard_screenshot_url: screenshotUrl,
        account_type: propFirmFormData.account_type as any,
        account_status: propFirmFormData.account_status,
        funded_balance: isFunded ? balance : null,
        // MT5 fields
        investor_password: encryptedPassword ? null : (propFirmFormData.investor_password || null),
        investor_password_encrypted: encryptedPassword,
        encryption_iv: encryptionIv,
        mt5_server: propFirmFormData.mt5_server || null,
        mt5_login: propFirmFormData.mt5_login || null
      } as any);

      if (error) throw error;
      toast({ title: "Success", description: "Prop firm added successfully" });
      setIsPropFirmDialogOpen(false);
      setPropFirmFormData({
        name: "", account_number: "", balance: "", equity: "", profit_target: "",
        current_profit: "", consistency_percentage: "", account_type: "Funded", account_status: "In Progress",
        investor_password: "", mt5_server: "", mt5_login: ""
      });
      setPropFirmScreenshot(null);
      fetchPropFirms();
      refreshCycles(); // Refresh cycles after adding a new funded account
    } catch (error) {
      toast({ title: "Error", description: "Failed to add prop firm", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateProgress = (current: number | null, target: number | null) => {
    if (!current || !target || target === 0) return 0;
    return Math.min((current / target) * 100, 100);
  };

  const handleDeleteClick = (firmId: string) => {
    setFirmToDelete(firmId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!firmToDelete) return;
    setIsLoading(true);
    try {
      await supabase.from("trades").delete().eq("prop_firm_id", firmToDelete);
      const { error } = await supabase.from("prop_firms").delete().eq("id", firmToDelete);
      if (error) throw error;
      toast({ title: "Success", description: "Prop firm deleted successfully" });
      fetchPropFirms();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete prop firm", variant: "destructive" });
    } finally {
      setIsLoading(false);
      setDeleteDialogOpen(false);
      setFirmToDelete(null);
    }
  };

  // Helper for PNL color
  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return 'text-green-600 dark:text-green-400 font-semibold';
    if (pnl < 0) return 'text-red-600 dark:text-red-400 font-semibold';
    return 'text-muted-foreground';
  };

  // Render compact table header - extra column for funded accounts
  const renderTableHeader = () => (
    <div className="hidden sm:grid sm:grid-cols-[1fr_100px_100px_100px_90px_100px] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border/30">
      <span>Account</span>
      <span className="text-right">Balance</span>
      <span className="text-right">PNL</span>
      <span className="text-right">Progress</span>
      <span className="text-center">Status</span>
      <span className="text-right">Actions</span>
    </div>
  );

  // Render individual account row - compact table design
  const renderAccountRow = (firm: PropFirm) => {
    const pnl = firm.current_profit || 0;
    const progress = calculateProgress(firm.current_profit, firm.profit_target);
    const isFunded = firm.account_type === 'Funded';
    const activeCycle = isFunded ? getActiveCycleForFirm(firm.id) : null;
    const cycles = isFunded ? getCyclesForFirm(firm.id) : [];
    const totalWithdrawn = cycles.reduce((sum, c) => sum + (c.withdrawn_amount || 0), 0);
    
    return (
      <div 
        key={firm.id} 
        className="group grid grid-cols-1 sm:grid-cols-[1fr_100px_100px_100px_90px_100px] gap-2 sm:gap-2 items-center px-3 py-2 hover:bg-muted/30 transition-colors border-b border-border/20 last:border-b-0"
      >
        {/* Account info - mobile: full width, desktop: first column */}
        <div className="flex items-center gap-2 min-w-0">
          <Badge className={`${getAccountTypeColor(firm.account_type)} px-1.5 py-0 text-[10px] rounded border shrink-0`}>
            {firm.account_type}
          </Badge>
          {firm.account_number && (
            <span className="text-xs font-mono text-muted-foreground truncate">#{firm.account_number}</span>
          )}
          {/* Show cycle badge for funded accounts */}
          {isFunded && activeCycle && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/50 text-primary">
              Cycle #{activeCycle.cycle_number}
            </Badge>
          )}
        </div>

        {/* Mobile: Stats row */}
        <div className="sm:hidden grid grid-cols-4 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Bal:</span>
            <span className="font-mono ml-1">${(firm.balance || 0).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-muted-foreground">PNL:</span>
            <span className={`font-mono ml-1 ${getPnLColor(pnl)}`}>
              {pnl >= 0 ? '+' : ''}${pnl.toLocaleString()}
            </span>
          </div>
          <Badge className={`${getAccountStatusColor(firm.account_status)} px-1.5 py-0 text-[10px] rounded border w-fit`}>
            {firm.account_status}
          </Badge>
          <div className="flex justify-end gap-1">
            {isFunded && (
              <>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setCycleViewFirm(firm)} title="View Cycles">
                  <RefreshCw className="h-3 w-3" />
                </Button>
                {activeCycle && pnl > 0 && (
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setPayoutFirm(firm)} title="Request Payout">
                    <DollarSign className="h-3 w-3 text-green-500" />
                  </Button>
                )}
              </>
            )}
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => navigate(`/app/prop-firms/${firm.id}`)}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); handleDeleteClick(firm.id); }}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        </div>

        {/* Mobile: Show total withdrawn for funded */}
        {isFunded && totalWithdrawn > 0 && (
          <div className="sm:hidden text-xs text-green-500">
            Total withdrawn: ${totalWithdrawn.toLocaleString()}
          </div>
        )}
        
        {/* Desktop columns */}
        <span className="hidden sm:block text-right font-mono text-sm">
          ${(firm.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
        
        <span className={`hidden sm:block text-right font-mono text-sm ${getPnLColor(pnl)}`}>
          {pnl >= 0 ? '+' : ''}${pnl.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
        
        <div className="hidden sm:flex items-center justify-end gap-1.5">
          {firm.profit_target ? (
            <>
              <Progress value={progress} className="h-1.5 w-12" />
              <span className="text-[10px] font-mono text-muted-foreground">{progress.toFixed(0)}%</span>
            </>
          ) : (
            <span className="text-[10px] text-muted-foreground">—</span>
          )}
        </div>
        
        <div className="hidden sm:flex justify-center">
          <Badge className={`${getAccountStatusColor(firm.account_status)} px-1.5 py-0 text-[10px] rounded border`}>
            {firm.account_status}
          </Badge>
        </div>
        
        <div className="hidden sm:flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {isFunded && (
            <>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setCycleViewFirm(firm)} title="View Cycles">
                <RefreshCw className="h-3 w-3" />
              </Button>
              {activeCycle && pnl > 0 && (
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setPayoutFirm(firm)} title="Request Payout">
                  <DollarSign className="h-3 w-3 text-green-500" />
                </Button>
              )}
            </>
          )}
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => navigate(`/app/prop-firms/${firm.id}`)}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); handleDeleteClick(firm.id); }}>
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2">Accounts</h1>
          <p className="text-muted-foreground text-xs sm:text-sm md:text-base">Manage your trading accounts</p>
        </div>
        <div className="flex flex-row gap-2 shrink-0">
          
          {/* Personal Account Dialog */}
          <Dialog open={isPersonalDialogOpen} onOpenChange={setIsPersonalDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm" variant="outline">
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Personal</span>
                <span className="sm:hidden">Personal</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Personal Account</DialogTitle>
              </DialogHeader>
              <form onSubmit={handlePersonalSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="personal-name">Account Name *</Label>
                  <Input id="personal-name" value={personalFormData.name} onChange={e => setPersonalFormData({ ...personalFormData, name: e.target.value })} placeholder="e.g., Personal Trading, Demo Account" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="personal-account-number">Account Number / MT5 Login</Label>
                  <Input id="personal-account-number" value={personalFormData.account_number} onChange={e => setPersonalFormData({ ...personalFormData, account_number: e.target.value })} placeholder="e.g., 12345678" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="personal-investor-password">Investor Password</Label>
                    <Input id="personal-investor-password" type="password" value={personalFormData.investor_password} onChange={e => setPersonalFormData({ ...personalFormData, investor_password: e.target.value })} placeholder="MT5 investor password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="personal-mt5-server">MT5 Server</Label>
                    <Input id="personal-mt5-server" value={personalFormData.mt5_server} onChange={e => setPersonalFormData({ ...personalFormData, mt5_server: e.target.value })} placeholder="e.g., ICMarkets-MT5" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="personal-balance">Balance ($)</Label>
                    <Input id="personal-balance" type="number" step="0.01" value={personalFormData.balance} onChange={e => setPersonalFormData({ ...personalFormData, balance: e.target.value })} placeholder="10000.00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="personal-current-profit">Current Profit ($)</Label>
                    <Input id="personal-current-profit" type="number" step="0.01" value={personalFormData.current_profit} onChange={e => setPersonalFormData({ ...personalFormData, current_profit: e.target.value })} placeholder="450.00" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="personal-profit-target">Profit Target ($)</Label>
                    <Input id="personal-profit-target" type="number" step="0.01" value={personalFormData.profit_target} onChange={e => setPersonalFormData({ ...personalFormData, profit_target: e.target.value })} placeholder="1000.00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="personal-consistency">Consistency (%)</Label>
                    <Input id="personal-consistency" type="number" step="0.01" max="100" value={personalFormData.consistency_percentage} onChange={e => setPersonalFormData({ ...personalFormData, consistency_percentage: e.target.value })} placeholder="85.5" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="personal-status">Account Status</Label>
                  <Select value={personalFormData.account_status} onValueChange={value => setPersonalFormData({ ...personalFormData, account_status: value as AccountStatus })}>
                    <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_STATUS.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? "Adding..." : "Add Personal Account"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Prop Firm Dialog */}
          <Dialog open={isPropFirmDialogOpen} onOpenChange={setIsPropFirmDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm">
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Prop Firm</span>
                <span className="sm:hidden">Prop</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Prop Firm Account</DialogTitle>
              </DialogHeader>
              <form onSubmit={handlePropFirmSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="prop-name">Prop Firm Name *</Label>
                  <Input id="prop-name" value={propFirmFormData.name} onChange={e => setPropFirmFormData({ ...propFirmFormData, name: e.target.value })} placeholder="e.g., FTMO, Nostro, The5ers" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prop-account-number">Account Number / MT5 Login</Label>
                  <Input id="prop-account-number" value={propFirmFormData.account_number} onChange={e => setPropFirmFormData({ ...propFirmFormData, account_number: e.target.value })} placeholder="e.g., 12345678" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prop-investor-password">Investor Password</Label>
                    <Input id="prop-investor-password" type="password" value={propFirmFormData.investor_password} onChange={e => setPropFirmFormData({ ...propFirmFormData, investor_password: e.target.value })} placeholder="MT5 investor password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prop-mt5-server">MT5 Server</Label>
                    <Input id="prop-mt5-server" value={propFirmFormData.mt5_server} onChange={e => setPropFirmFormData({ ...propFirmFormData, mt5_server: e.target.value })} placeholder="e.g., ICMarkets-MT5" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prop-balance">Balance ($)</Label>
                    <Input id="prop-balance" type="number" step="0.01" value={propFirmFormData.balance} onChange={e => setPropFirmFormData({ ...propFirmFormData, balance: e.target.value })} placeholder="10000.00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prop-current-profit">Current Profit ($)</Label>
                    <Input id="prop-current-profit" type="number" step="0.01" value={propFirmFormData.current_profit} onChange={e => setPropFirmFormData({ ...propFirmFormData, current_profit: e.target.value })} placeholder="450.00" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prop-profit-target">Profit Target ($)</Label>
                    <Input id="prop-profit-target" type="number" step="0.01" value={propFirmFormData.profit_target} onChange={e => setPropFirmFormData({ ...propFirmFormData, profit_target: e.target.value })} placeholder="1000.00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prop-consistency">Consistency (%)</Label>
                    <Input id="prop-consistency" type="number" step="0.01" max="100" value={propFirmFormData.consistency_percentage} onChange={e => setPropFirmFormData({ ...propFirmFormData, consistency_percentage: e.target.value })} placeholder="85.5" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prop-account-type">Account Type</Label>
                    <Select value={propFirmFormData.account_type} onValueChange={value => setPropFirmFormData({ ...propFirmFormData, account_type: value as typeof PROP_FIRM_TYPES[number] })}>
                      <SelectTrigger id="prop-account-type"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-card border-border z-50">
                        {PROP_FIRM_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prop-account-status">Account Status</Label>
                    <Select value={propFirmFormData.account_status} onValueChange={value => setPropFirmFormData({ ...propFirmFormData, account_status: value as AccountStatus })}>
                      <SelectTrigger id="prop-account-status"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-card border-border z-50">
                        {ACCOUNT_STATUS.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? "Adding..." : "Add Prop Firm"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {propFirms.length === 0 ? (
        <Card className="glow-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Accounts Yet</h3>
            <p className="text-muted-foreground mb-4">Add your first trading account to get started</p>
            <Button onClick={() => setIsPersonalDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groupedPropFirms.map(group => (
            <Collapsible
              key={group.name}
              open={expandedGroups.has(group.name)}
              onOpenChange={() => toggleGroup(group.name)}
            >
              <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
                <CollapsibleTrigger asChild>
                  <div className="cursor-pointer hover:bg-muted/30 transition-colors p-4">
                    {/* Mobile layout - stacked */}
                    <div className="sm:hidden">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold truncate">{group.name}</h3>
                            <span className="text-xs text-muted-foreground">
                              {group.accounts.length} {group.accounts.length === 1 ? 'account' : 'accounts'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <p className="text-[10px] text-muted-foreground">Bal</p>
                            <p className="text-sm font-mono font-bold text-foreground">
                              {(group as any).fundedBalance > 0
                                ? `$${(group as any).fundedBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                                : '$0.00'}
                            </p>
                            {(group as any).fundedBalance > 0 && (
                              <>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Eq</p>
                                <p className={`text-sm font-mono font-bold ${
                                  (group as any).fundedEquity > (group as any).fundedBalance
                                    ? 'text-green-600 dark:text-green-400'
                                    : (group as any).fundedEquity < (group as any).fundedBalance
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-foreground'
                                }`}>
                                  ${(group as any).fundedEquity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </p>
                              </>
                            )}
                          </div>
                          {expandedGroups.has(group.name) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1 mt-2 ml-12">
                        {group.accountTypes.map(type => (
                          <Badge key={type} variant="outline" className={`${getAccountTypeColor(type)} text-[10px] px-1.5 py-0`}>
                            {type}
                          </Badge>
                        ))}
                        <span className="text-xs text-muted-foreground ml-1">
                          {(group as any).fundedBalance > 0 ? 'Funded Balance' : 'No funded capital'}
                          {(group as any).evaluationCount > 0 && ` • ${(group as any).evaluationCount} eval${(group as any).evaluationCount !== 1 ? 's' : ''}`}
                        </span>
                      </div>
                    </div>
                    
                    {/* Desktop layout - side by side */}
                    <div className="hidden sm:flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">{group.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">
                              {group.accounts.length} {group.accounts.length === 1 ? 'account' : 'accounts'}
                            </span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <div className="flex gap-1">
                              {group.accountTypes.map(type => (
                                <Badge key={type} variant="outline" className={`${getAccountTypeColor(type)} text-[10px] px-1.5 py-0`}>
                                  {type}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right space-y-0.5">
                          {(group as any).fundedBalance > 0 ? (
                            <>
                              <p className="text-xs text-muted-foreground">Balance</p>
                              <p className="text-base font-mono font-bold text-foreground">
                                ${(group as any).fundedBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">Equity</p>
                              <p className={`text-base font-mono font-bold ${
                                (group as any).fundedEquity > (group as any).fundedBalance
                                  ? 'text-green-600 dark:text-green-400'
                                  : (group as any).fundedEquity < (group as any).fundedBalance
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-foreground'
                              }`}>
                                ${(group as any).fundedEquity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-base font-mono font-bold text-muted-foreground">$0.00</p>
                              <p className="text-xs text-muted-foreground">No funded capital</p>
                            </>
                          )}
                          {(group as any).evaluationCount > 0 && (
                            <p className="text-[10px] text-muted-foreground">
                              {(group as any).evaluationCount} eval{(group as any).evaluationCount !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                        {expandedGroups.has(group.name) ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="border-t border-border/30">
                    {renderTableHeader()}
                    <div>
                      {group.accounts.map(firm => renderAccountRow(firm))}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this account and all associated trades. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cycle View Modal */}
      {cycleViewFirm && (
        <CycleViewModal
          open={!!cycleViewFirm}
          onOpenChange={(open) => !open && setCycleViewFirm(null)}
          propFirmId={cycleViewFirm.id}
          propFirmName={cycleViewFirm.name}
          fundedBalance={cycleViewFirm.funded_balance || cycleViewFirm.balance || 0}
        />
      )}

      {/* Payout Modal */}
      {payoutFirm && (
        <PayoutModal
          open={!!payoutFirm}
          onOpenChange={(open) => !open && setPayoutFirm(null)}
          propFirmId={payoutFirm.id}
          propFirmName={payoutFirm.name}
          currentCyclePnl={payoutFirm.current_profit || 0}
          fundedBalance={payoutFirm.funded_balance || payoutFirm.balance || 0}
          onPayoutComplete={() => {
            fetchPropFirms();
            refreshCycles();
          }}
        />
      )}

    </div>
  );
}
