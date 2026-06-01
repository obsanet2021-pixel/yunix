import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Edit, Plus, TrendingUp, TrendingDown, Target, DollarSign, Trash2, RefreshCw, Link2, Eye, EyeOff, Check, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { OpenPositions } from "@/components/propfirms/OpenPositions";
import TradeParser, { type ParsedTradeImport } from "@/components/TradeParser";
import TradeForm from "@/components/TradeForm";

/** Values safe for Postgres timestamptz; rejects prices like "$4,729.72". */
function normalizeDbTimestamp(value: string | null | undefined): string | null {
  if (value == null || typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;
  if (v.startsWith("$") || v.includes("$")) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) return v;
  const m1 = v.match(/^(\d{4})\.(\d{2})\.(\d{2}),\s*(\d{2}):(\d{2}):(\d{2})$/);
  if (m1) return `${m1[1]}-${m1[2]}-${m1[3]}T${m1[4]}:${m1[5]}:${m1[6]}`;
  const m2 = v.match(/^(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}T${m2[4]}:${m2[5]}:${m2[6]}`;
  return null;
}

function normalizeImportedTradeDate(d: string): string {
  return d.replace(/\./g, "-").trim().slice(0, 10);
}

function normalizeImportedTradeType(tt: string | undefined): "buy" | "sell" {
  const x = (tt || "buy").toLowerCase();
  return x === "sell" ? "sell" : "buy";
}

const ACCOUNT_TYPES = ['Personal', 'Funded', 'Evaluation 1', 'Evaluation 2', 'Evaluation 3'] as const;
const ACCOUNT_STATUS = ['In Progress', 'Passed', 'Failed'] as const;

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
  account_type: 'Personal' | 'Funded' | 'Evaluation 1' | 'Evaluation 2' | 'Evaluation 3';
  account_status: AccountStatus;
  investor_password: string | null;
  investor_password_encrypted: string | null;
  encryption_iv: string | null;
  mt5_server: string | null;
  mt5_login: string | null;
  last_sync_at: string | null;
  sync_status: string | null;
}

interface Trade {
  id: string;
  pair: string;
  profit: number;
  session: string | null;
  emotion: string | null;
  notes: string | null;
  trade_date: string;
  trade_type: string | null;
  volume: number | null;
  entry_price: number | null;
  close_price: number | null;
  open_time: string | null;
  close_time: string | null;
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

// Safe time display function to prevent Invalid Date errors
const formatTimeDisplay = (timeStr: string | null): string => {
  if (!timeStr) return "N/A";
  
  // If it looks like just a time (HH:mm:ss), return as-is
  if (/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) {
    return timeStr;
  }
  
  // Try to extract time from "DD/MM/YYYY, HH:mm:ss" format
  const timeMatch = timeStr.match(/(\d{2}:\d{2}:\d{2})/);
  if (timeMatch) {
    return timeMatch[1];
  }
  
  // Try parsing as ISO date
  const date = new Date(timeStr);
  if (!isNaN(date.getTime())) {
    return date.toLocaleTimeString();
  }
  
  // Fallback: return the raw string
  return timeStr;
};

export default function PropFirmDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isEnabled } = useFeatureToggles();
  const [propFirm, setPropFirm] = useState<PropFirm | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddTradeOpen, setIsAddTradeOpen] = useState(false);
  const [targetWarningAcknowledged, setTargetWarningAcknowledged] = useState(false);

  // Profit target hit detection
  const isTargetHit = !!(
    propFirm?.profit_target &&
    propFirm.profit_target > 0 &&
    propFirm?.current_profit !== null &&
    propFirm?.current_profit !== undefined &&
    propFirm.current_profit >= propFirm.profit_target
  );
  const [isLoading, setIsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // MT5 Connection state
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mt5FormData, setMt5FormData] = useState({
    mt5_login: "",
    investor_password: "",
    mt5_server: ""
  });

  const [editData, setEditData] = useState({
    balance: "",
    profit_target: "",
    current_profit: "",
    consistency_percentage: "",
    account_type: "Personal" as typeof ACCOUNT_TYPES[number],
    account_status: "In Progress" as AccountStatus,
  });

  const [tradeData, setTradeData] = useState({
    pair: "",
    profit: "",
    session: "",
    emotion: "",
    notes: "",
    trade_date: new Date().toISOString().split("T")[0],
  });
  const [addTradeMode, setAddTradeMode] = useState<"manual" | "parser">("manual");
  const [parsedTradesToImport, setParsedTradesToImport] = useState<ParsedTradeImport[]>([]);

  useEffect(() => {
    fetchPropFirm();
    fetchTrades();
    
    // Set up real-time subscription for trades
    if (id) {
      const channel = supabase
        .channel(`trades-${id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'trades',
            filter: `prop_firm_id=eq.${id}`
          },
          () => {
            fetchTrades();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [id]);

  const fetchPropFirm = async () => {
    if (!id) return;
    
    const { data, error } = await supabase
      .from("prop_firms")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load prop firm details",
        variant: "destructive",
      });
      navigate("/app/prop-firms");
      return;
    }

    if (!data) {
      toast({
        title: "Prop Firm Not Found",
        description: "This prop firm doesn't exist or has been deleted",
        variant: "destructive",
      });
      navigate("/app/prop-firms");
      return;
    }

    setPropFirm(data);
    setEditData({
      balance: data.balance?.toString() || "",
      profit_target: data.profit_target?.toString() || "",
      current_profit: data.current_profit?.toString() || "",
      consistency_percentage: data.consistency_percentage?.toString() || "",
      account_type: data.account_type || "Personal",
      account_status: data.account_status || "In Progress",
    });
    
    // Pre-fill MT5 form with existing data
    setMt5FormData({
      mt5_login: data.mt5_login || "",
      investor_password: "", // Never pre-fill password
      mt5_server: data.mt5_server || ""
    });
  };

  const fetchTrades = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from("trades")
      .select("id, pair, profit, session, emotion, notes, trade_date, trade_type, volume, entry_price, close_price, open_time, close_time")
      .eq("prop_firm_id", id)
      .order("trade_date", { ascending: false });

    if (error) {
      console.error("Error fetching trades:", error);
      return;
    }

    setTrades(data || []);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const balance = editData.balance ? parseFloat(editData.balance) : 0;
      const currentProfit = editData.current_profit ? parseFloat(editData.current_profit) : 0;
      const calculatedEquity = balance + currentProfit;

      const { error } = await supabase
        .from("prop_firms")
        .update({
          balance: balance,
          equity: calculatedEquity,
          profit_target: editData.profit_target ? parseFloat(editData.profit_target) : null,
          current_profit: currentProfit,
          consistency_percentage: editData.consistency_percentage ? parseFloat(editData.consistency_percentage) : null,
          account_type: editData.account_type as string,
          account_status: editData.account_status,
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Prop firm updated successfully",
      });

      setIsEditOpen(false);
      fetchPropFirm();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update prop firm",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("trades").insert({
        user_id: user.id,
        prop_firm_id: id,
        pair: tradeData.pair,
        profit: parseFloat(tradeData.profit),
        session: tradeData.session || null,
        emotion: tradeData.emotion || null,
        notes: tradeData.notes || null,
        trade_date: tradeData.trade_date,
      });

      if (error) throw error;

      // Note: current_profit and equity are auto-calculated by database triggers
      // No manual update needed — just refetch the prop firm data

      toast({
        title: "Success",
        description: "Trade added successfully",
      });

      setIsAddTradeOpen(false);
      setTradeData({
        pair: "",
        profit: "",
        session: "",
        emotion: "",
        notes: "",
        trade_date: new Date().toISOString().split("T")[0],
      });
      fetchTrades();
      fetchPropFirm();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add trade",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportParsedTrades = async () => {
    if (!id || parsedTradesToImport.length === 0) return;

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const tradesToInsert = parsedTradesToImport.map((trade) => ({
        user_id: user.id,
        prop_firm_id: id,
        pair: (trade.pair || "UNKNOWN").trim(),
        profit: Number.isFinite(trade.profit) ? trade.profit : 0,
        session: trade.session || null,
        notes: trade.notes || "Imported from Trade Parser",
        trade_date: normalizeImportedTradeDate(trade.trade_date),
        trade_type: normalizeImportedTradeType(trade.trade_type),
        volume: trade.volume != null && Number.isFinite(trade.volume) ? trade.volume : null,
        entry_price: trade.entry_price != null && Number.isFinite(trade.entry_price) ? trade.entry_price : null,
        close_price: trade.close_price != null && Number.isFinite(trade.close_price) ? trade.close_price : null,
        open_time: normalizeDbTimestamp(trade.open_time ?? undefined),
        close_time: normalizeDbTimestamp(trade.close_time ?? undefined),
      }));

      const { error } = await supabase.from("trades").insert(tradesToInsert);
      if (error) {
        console.error("Import parsed trades:", error);
        throw new Error(error.message);
      }

      toast({
        title: "Success",
        description: `${parsedTradesToImport.length} trade${parsedTradesToImport.length > 1 ? "s" : ""} imported successfully`,
      });

      setParsedTradesToImport([]);
      setAddTradeMode("manual");
      setIsAddTradeOpen(false);
      fetchTrades();
      fetchPropFirm();
    } catch (error: unknown) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : "Failed to import parsed trades";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectMT5 = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mt5FormData.mt5_login || !mt5FormData.investor_password || !mt5FormData.mt5_server) {
      toast({
        title: "Missing fields",
        description: "Please fill in all MT5 connection fields",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Encrypt the password
      const { data: encryptedData, error: encryptError } = await supabase.functions.invoke('encrypt-password', {
        body: { password: mt5FormData.investor_password }
      });

      if (encryptError) {
        throw new Error("Failed to secure password");
      }

      // Save MT5 credentials directly to prop_firms table
      // This is where sync functions look for credentials
      const { error } = await supabase
        .from("prop_firms")
        .update({
          mt5_login: mt5FormData.mt5_login,
          mt5_server: mt5FormData.mt5_server,
          investor_password_encrypted: encryptedData?.encrypted,
          encryption_iv: encryptedData?.iv,
          investor_password: null, // Clear plain password for security
          auto_sync_enabled: true // Enable auto-sync by default
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "MT5 Connected",
        description: "Your MT5 credentials have been saved to this account. Click Sync to fetch trades."
      });

      setIsConnectOpen(false);
      // Keep login and server filled for reference, only clear password
      setMt5FormData(prev => ({ ...prev, investor_password: "" }));
      fetchPropFirm();
    } catch (error: unknown) {
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to save MT5 credentials",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateProgress = () => {
    if (!propFirm?.current_profit || !propFirm?.profit_target || propFirm.profit_target === 0) return 0;
    return Math.min((propFirm.current_profit / propFirm.profit_target) * 100, 100);
  };

  const totalProfit = trades.reduce((sum, trade) => sum + Number(trade.profit), 0);
  const winningTrades = trades.filter(t => Number(t.profit) > 0).length;
  const losingTrades = trades.filter(t => Number(t.profit) < 0).length;
  const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;
  const bestTrade = trades.length > 0 ? Math.max(...trades.map(t => Number(t.profit))) : 0;
  const worstTrade = trades.length > 0 ? Math.min(...trades.map(t => Number(t.profit))) : 0;
  const avgProfit = trades.length > 0 ? totalProfit / trades.length : 0;

  const hasMT5Credentials = propFirm?.mt5_login && propFirm?.mt5_server && (propFirm?.investor_password || propFirm?.investor_password_encrypted);

  const handleSync = async () => {
    if (!hasMT5Credentials) {
      toast({
        title: "Error",
        description: "MT5 credentials not configured for this account",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("mt5-sync", {
        body: { prop_firm_id: id },
      });

      if (error) {
        const errorMessage = data?.details || data?.error || error.message;
        toast({
          title: "Sync Failed",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      if (data?.error) {
        toast({
          title: "Sync Failed",
          description: data.details || data.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sync Completed",
        description: `Synced ${data?.trades_synced || 0} trades and ${data?.positions_synced || 0} positions`,
      });

      // Refresh data
      fetchPropFirm();
      fetchTrades();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Sync failed",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const [isSyncingExternal, setIsSyncingExternal] = useState(false);

  const handleSyncExternal = async () => {
    setIsSyncingExternal(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Error",
          description: "Please log in to sync trades",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke("sync-external-trades", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        toast({
          title: "Sync Failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (data?.error) {
        toast({
          title: "Sync Failed",
          description: data.details || data.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "External Sync Completed",
        description: data?.message || `Synced ${data?.synced || 0} trades`,
      });

      // Refresh data
      fetchPropFirm();
      fetchTrades();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "External sync failed",
        variant: "destructive",
      });
    } finally {
      setIsSyncingExternal(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      // Delete all trades associated with this prop firm
      await supabase
        .from("trades")
        .delete()
        .eq("prop_firm_id", id);

      // Delete the prop firm
      const { error } = await supabase
        .from("prop_firms")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Prop firm deleted successfully",
      });

      navigate("/app/prop-firms");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete prop firm",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  if (!propFirm) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <TrendingUp className="h-16 w-16 text-muted-foreground" />
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Prop Firm Not Found</h2>
          <p className="text-muted-foreground mb-4">
            This prop firm doesn't exist or you don't have access to it.
          </p>
          <Button onClick={() => navigate("/app/prop-firms")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Prop Firms
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/app/prop-firms")}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="break-words text-2xl font-bold sm:text-3xl">{propFirm.name}</h1>
              <Badge className={`${getAccountTypeColor(propFirm.account_type)} px-3 py-1 rounded-full border`}>
                {propFirm.account_type}
              </Badge>
              <Badge className={`${getAccountStatusColor(propFirm.account_status)} px-3 py-1 rounded-full border`}>
                {propFirm.account_status}
              </Badge>
            </div>
            {propFirm.account_number && (
              <p className="break-words text-muted-foreground">Account #{propFirm.account_number}</p>
            )}
          </div>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 lg:w-auto lg:flex">
          <Button onClick={() => setIsEditOpen(true)} variant="outline" className="w-full lg:w-auto">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            onClick={() => setIsAddTradeOpen(true)}
            className={`w-full lg:w-auto ${isTargetHit ? "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20" : ""}`}
            variant={isTargetHit ? "outline" : "default"}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Trade
            {isTargetHit && <span className="ml-1.5 text-xs">⚠️</span>}
          </Button>
          <Button onClick={() => setDeleteDialogOpen(true)} variant="destructive" className="w-full lg:w-auto">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* MT5 Connection Card - Only show if feature is enabled */}
      {isEnabled('mt5_connection') && (
        <Card className="glow-card border-primary/20 overflow-hidden">
          <CardHeader className="flex flex-col gap-3 pb-2 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              MT5 Connection
            </CardTitle>
            {hasMT5Credentials ? (
              <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:w-auto lg:flex-wrap lg:justify-end">
                <Badge className="justify-center border bg-accent text-accent-foreground lg:justify-start">
                  <Check className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="w-full lg:w-auto"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync MT5'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSyncExternal}
                  disabled={isSyncingExternal}
                  className="w-full lg:w-auto"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isSyncingExternal ? 'animate-spin' : ''}`} />
                  {isSyncingExternal ? 'Syncing...' : 'Sync External DB'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setIsConnectOpen(true)} className="w-full lg:w-auto">
                  <Edit className="h-4 w-4 lg:mr-0 mr-2" />
                  <span className="lg:sr-only">Edit MT5</span>
                  <span className="lg:hidden">Edit Connection</span>
                </Button>
              </div>
            ) : (
              <Button onClick={() => setIsConnectOpen(true)} className="w-full lg:w-auto">
                <Link2 className="h-4 w-4 mr-2" />
                Connect MT5
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {hasMT5Credentials ? (
              <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div className="min-w-0">
                  <p className="text-muted-foreground">Login</p>
                  <p className="font-mono break-all">{propFirm.mt5_login}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-muted-foreground">Server</p>
                  <p className="font-mono break-words">{propFirm.mt5_server}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-muted-foreground">Last Sync</p>
                  <p className="font-mono break-words">
                    {propFirm.last_sync_at
                      ? new Date(propFirm.last_sync_at).toLocaleString()
                      : 'Never'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Connect your MT5 account to automatically sync trades and positions.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono text-primary">
              ${propFirm.balance?.toFixed(2) || "0.00"}
            </div>
          </CardContent>
        </Card>

        <Card className="glow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Equity</CardTitle>
            <TrendingUp className={`h-4 w-4 ${(propFirm.current_profit || 0) >= 0 ? "text-green-500" : "text-red-500"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold font-mono ${
              (propFirm.current_profit || 0) > 0
                ? "text-green-600 dark:text-green-400"
                : (propFirm.current_profit || 0) < 0
                ? "text-red-600 dark:text-red-400"
                : "text-foreground"
            }`}>
              ${((propFirm.balance || 0) + (propFirm.current_profit || 0)).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="glow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Current Profit</CardTitle>
            <Target className={`h-4 w-4 ${(propFirm.current_profit || 0) >= 0 ? "text-green-500" : "text-red-500"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold font-mono ${
              (propFirm.current_profit || 0) > 0
                ? "text-green-600 dark:text-green-400"
                : (propFirm.current_profit || 0) < 0
                ? "text-red-600 dark:text-red-400"
                : "text-foreground"
            }`}>
              {(propFirm.current_profit || 0) > 0 ? "+" : ""}${propFirm.current_profit?.toFixed(2) || "0.00"}
            </div>
          </CardContent>
        </Card>

        <Card className="glow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <TrendingUp className={`h-4 w-4 ${winRate >= 50 ? "text-green-500" : "text-red-500"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold font-mono ${
              winRate >= 60 ? "text-green-600 dark:text-green-400"
              : winRate >= 40 ? "text-amber-600 dark:text-amber-400"
              : "text-red-600 dark:text-red-400"
            }`}>
              {winRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profit Progress */}
      {propFirm.profit_target && (
        <Card className="glow-card">
          <CardHeader>
            <CardTitle>Profit Target Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                ${propFirm.current_profit?.toFixed(2) || "0.00"} / ${propFirm.profit_target.toFixed(2)}
              </span>
              <span className="text-sm font-mono text-foreground font-medium">
                {calculateProgress().toFixed(1)}%
              </span>
            </div>
            <Progress value={calculateProgress()} />
          </CardContent>
        </Card>
      )}

      {/* Open Positions - only show if MT5 credentials exist */}
      {hasMT5Credentials && (
        <OpenPositions 
          propFirmId={propFirm.id} 
          onSync={handleSync}
        />
      )}

      <Card className="glow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Performance Statistics</CardTitle>
          {hasMT5Credentials && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSync}
              disabled={isSyncing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync'}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Trades</p>
              <p className="text-2xl font-bold font-mono">{trades.length}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Winning Trades</p>
              <p className="text-2xl font-bold font-mono text-green-600 dark:text-green-400">{winningTrades}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Losing Trades</p>
              <p className="text-2xl font-bold font-mono text-destructive">{losingTrades}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Best Trade</p>
              <p className="text-2xl font-bold font-mono text-green-600 dark:text-green-400">
                +${bestTrade.toFixed(2)}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Worst Trade</p>
              <p className="text-2xl font-bold font-mono text-destructive">
                ${worstTrade.toFixed(2)}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Avg Profit/Loss</p>
              <p className={`text-2xl font-bold font-mono ${avgProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {avgProfit >= 0 ? '+' : ''}${avgProfit.toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trades */}
      <Card className="glow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Trade History</CardTitle>
          {hasMT5Credentials && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSync}
              disabled={isSyncing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync'}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {trades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No trades yet. {hasMT5Credentials ? 'Click Sync to fetch trades from MT5.' : 'Connect your MT5 account to sync trades automatically.'}
            </div>
          ) : (
            <div className="space-y-4">
              {trades.map((trade) => {
                const isProfit = Number(trade.profit) > 0;
                const Icon = isProfit ? TrendingUp : TrendingDown;
                return (
                  <Card key={trade.id} className="bg-muted/50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{trade.pair}</CardTitle>
                          {trade.trade_type && (
                            <Badge variant={trade.trade_type.toLowerCase() === 'buy' ? 'default' : 'secondary'} className="text-xs">
                              {trade.trade_type}
                            </Badge>
                          )}
                        </div>
                        <div className={`flex items-center gap-2 ${isProfit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          <Icon className="h-5 w-5" />
                          <span className="font-mono text-lg font-bold">
                            {isProfit ? '+' : ''}{Number(trade.profit).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Open Time</p>
                          <p className="font-medium font-mono text-xs">{formatTimeDisplay(trade.open_time)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Close Time</p>
                          <p className="font-medium font-mono text-xs">{formatTimeDisplay(trade.close_time)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Entry Price</p>
                          <p className="font-medium font-mono text-xs">{trade.entry_price?.toFixed(trade.entry_price > 100 ? 2 : 5) || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Exit Price</p>
                          <p className="font-medium font-mono text-xs">{trade.close_price?.toFixed(trade.close_price > 100 ? 2 : 5) || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Volume</p>
                          <p className="font-medium font-mono text-xs">{trade.volume?.toFixed(2) || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Session</p>
                          <p className="font-medium text-xs">{trade.session || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Date</p>
                          <p className="font-medium font-mono text-xs">{trade.trade_date}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Notes</p>
                          <p className="font-medium text-xs truncate" title={trade.notes || ""}>{trade.notes || "N/A"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* MT5 Connect Dialog */}
      <Dialog open={isConnectOpen} onOpenChange={setIsConnectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              {hasMT5Credentials ? 'Update MT5 Connection' : 'Connect MT5 Account'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleConnectMT5} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mt5_login">MT5 Login *</Label>
              <Input
                id="mt5_login"
                placeholder="e.g., 12345678"
                value={mt5FormData.mt5_login}
                onChange={(e) => setMt5FormData(prev => ({ ...prev, mt5_login: e.target.value }))}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="investor_password">Investor Password *</Label>
              <div className="relative">
                <Input
                  id="investor_password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Read-only investor password"
                  value={mt5FormData.investor_password}
                  onChange={(e) => setMt5FormData(prev => ({ ...prev, investor_password: e.target.value }))}
                  disabled={isLoading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use your read-only investor password for security
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mt5_server">MT5 Server *</Label>
              <Input
                id="mt5_server"
                placeholder="e.g., FTMO-Demo"
                value={mt5FormData.mt5_server}
                onChange={(e) => setMt5FormData(prev => ({ ...prev, mt5_server: e.target.value }))}
                disabled={isLoading}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsConnectOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Connection"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit {propFirm.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="balance">Balance ($)</Label>
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  value={editData.balance}
                  onChange={(e) => setEditData({ ...editData, balance: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="equity-display">Equity (Auto-calculated)</Label>
                <Input
                  id="equity-display"
                  type="text"
                  value={`$${((parseFloat(editData.balance) || 0) + (parseFloat(editData.current_profit) || 0)).toFixed(2)}`}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Balance + Current Profit</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="profit_target">Profit Target ($)</Label>
                <Input
                  id="profit_target"
                  type="number"
                  step="0.01"
                  value={editData.profit_target}
                  onChange={(e) => setEditData({ ...editData, profit_target: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="current_profit">Current Profit ($)</Label>
                <Input
                  id="current_profit"
                  type="number"
                  step="0.01"
                  value={editData.current_profit}
                  onChange={(e) => setEditData({ ...editData, current_profit: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="consistency_percentage">Consistency (%)</Label>
              <Input
                id="consistency_percentage"
                type="number"
                step="0.01"
                max="100"
                value={editData.consistency_percentage}
                onChange={(e) => setEditData({ ...editData, consistency_percentage: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="account_type">Account Type</Label>
                <Select
                  value={editData.account_type}
                  onValueChange={(value) => setEditData({ ...editData, account_type: value as typeof ACCOUNT_TYPES[number] })}
                >
                  <SelectTrigger id="account_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border z-50">
                    {ACCOUNT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_status">Account Status</Label>
                <Select
                  value={editData.account_status}
                  onValueChange={(value) => setEditData({ ...editData, account_status: value as AccountStatus })}
                >
                  <SelectTrigger id="account_status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border z-50">
                    {ACCOUNT_STATUS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Updating..." : "Update Prop Firm"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Trade Dialog */}
      <Dialog open={isAddTradeOpen} onOpenChange={(open) => {
        setIsAddTradeOpen(open);
        if (!open) {
          setAddTradeMode("manual");
          setParsedTradesToImport([]);
          setTargetWarningAcknowledged(false);
        }
      }}>
        <DialogContent className="max-h-[88vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
            <DialogTitle>Add Trade</DialogTitle>
          </DialogHeader>

          {/* Profit target warning banner */}
          {isTargetHit && (
            <div className="mx-6 mb-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-2 shrink-0">
              <div className="flex items-start gap-2">
                <span className="text-amber-500 text-base leading-none mt-0.5">⚠️</span>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Profit target reached</p>
                  <p className="text-xs text-muted-foreground">
                    Adding more trades may violate your prop firm rules. Make sure you understand the risk before continuing.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="target-ack"
                  checked={targetWarningAcknowledged}
                  onChange={e => setTargetWarningAcknowledged(e.target.checked)}
                  className="h-3.5 w-3.5 accent-amber-500 cursor-pointer"
                />
                <label htmlFor="target-ack" className="text-xs cursor-pointer text-muted-foreground">
                  I understand — proceed anyway
                </label>
              </div>
            </div>
          )}

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <Tabs value={addTradeMode} onValueChange={(value) => setAddTradeMode(value as "manual" | "parser")} className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 sticky top-0 z-10 bg-background pt-1">
                <TabsTrigger value="manual">Manual</TabsTrigger>
                <TabsTrigger value="parser">Trade Parser</TabsTrigger>
              </TabsList>

              <TabsContent value="manual">
                <form onSubmit={handleAddTrade} className="space-y-4">
                  <TradeForm
                    formData={tradeData}
                    setFormData={setTradeData}
                    onSubmitLabel={isLoading ? "Adding..." : "Add Trade"}
                    onSubmitDisabled={isLoading || (isTargetHit && !targetWarningAcknowledged)}
                  />
                </form>
              </TabsContent>

              <TabsContent value="parser" className="space-y-4">
                <TradeParser onTradesExtracted={setParsedTradesToImport} />
                {parsedTradesToImport.length > 0 && (
                  <Button
                    onClick={handleImportParsedTrades}
                    disabled={isLoading || (isTargetHit && !targetWarningAcknowledged)}
                    className="w-full"
                  >
                    {isLoading ? "Importing..." : `Import ${parsedTradesToImport.length} Parsed Trade${parsedTradesToImport.length > 1 ? "s" : ""}`}
                  </Button>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this prop firm and all associated trades. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
