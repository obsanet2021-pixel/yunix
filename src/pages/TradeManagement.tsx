import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, TrendingUp, TrendingDown, Minus, Download, Calendar, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import PropFirmFilter from "@/components/PropFirmFilter";
import { useToast } from "@/hooks/use-toast";

interface Trade {
  id: string;
  pair: string;
  profit: number;
  session: string | null;
  emotion: string | null;
  notes: string | null;
  trade_date: string;
  prop_firm_id: string | null;
  // MT5 fields
  trade_type: string | null;
  volume: number | null;
  entry_price: number | null;
  take_profit: number | null;
  stop_loss: number | null;
  close_price: number | null;
  open_time: string | null;
}

// Helper to extract time from open_time string
const formatOpenTime = (timeStr: string | null): string => {
  if (!timeStr) return "—";
  
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
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  
  // Fallback: return the raw string (truncated)
  return timeStr.length > 10 ? timeStr.substring(0, 10) + '...' : timeStr;
};

interface PropFirm {
  id: string;
  name: string;
  account_type?: string;
  balance?: number | null;
  current_profit?: number | null;
}

// PNL color utility function
const getPnLStyles = (profit: number) => {
  if (profit > 0) return { 
    text: 'text-green-500', 
    bg: 'bg-green-500/10', 
    border: 'border-green-500/30',
    icon: TrendingUp
  };
  if (profit < 0) return { 
    text: 'text-red-500', 
    bg: 'bg-red-500/10', 
    border: 'border-red-500/30',
    icon: TrendingDown
  };
  return { 
    text: 'text-muted-foreground', 
    bg: 'bg-muted/10', 
    border: 'border-muted/30',
    icon: Minus
  };
};

export default function TradeManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [propFirms, setPropFirms] = useState<PropFirm[]>([]);
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPropFirm, setFilterPropFirm] = useState<string>("all");
  const [filterAccount, setFilterAccount] = useState<string>("all");
  const [filterOutcome, setFilterOutcome] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [isRealtime, setIsRealtime] = useState(true);

  // Get user ID on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, []);

  useEffect(() => {
    fetchTrades();
    fetchPropFirms();
  }, []);

  // Real-time subscription for trades
  useEffect(() => {
    if (!userId || !isRealtime) return;

    const channel = supabase
      .channel('trades-realtime-management')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('New trade received:', payload);
          setTrades(prev => [payload.new as Trade, ...prev]);
          toast({
            title: "New Trade Synced",
            description: `${(payload.new as Trade).pair} trade has been added`,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          setTrades(prev => 
            prev.map(trade => 
              trade.id === payload.new.id ? payload.new as Trade : trade
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          setTrades(prev => prev.filter(trade => trade.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isRealtime, toast]);

  useEffect(() => {
    applyFilters();
  }, [trades, searchTerm, filterPropFirm, filterAccount, filterOutcome, dateFrom, dateTo, propFirms]);

  const fetchTrades = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch trades directly from trades table
    const { data, error } = await supabase
      .from("trades")
      .select("*, open_time")
      .eq("user_id", user.id)
      .order("trade_date", { ascending: false });

    if (error) {
      console.error("Error fetching trades:", error);
      return;
    }

    setTrades(data || []);
  };

  const fetchPropFirms = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("prop_firms")
      .select("id, name, account_type, balance, current_profit")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching prop firms:", error);
      return;
    }

    setPropFirms(data || []);
  };

  const applyFilters = () => {
    let filtered = [...trades];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (trade) =>
          trade.pair.toLowerCase().includes(searchTerm.toLowerCase()) ||
          trade.session?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          trade.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Normalize prop firm names for case-insensitive comparison
    const normalizeCase = (name: string) => name.trim().toLowerCase();

    // Two-level prop firm filter
    if (filterAccount !== "all") {
      // If a specific account is selected, filter by that account ID
      filtered = filtered.filter((trade) => trade.prop_firm_id === filterAccount);
    } else if (filterPropFirm !== "all") {
      // If only firm is selected, filter by all accounts under that firm (case-insensitive)
      const matchingFirmIds = propFirms
        .filter(f => normalizeCase(f.name) === normalizeCase(filterPropFirm))
        .map(f => f.id);
      filtered = filtered.filter((trade) => matchingFirmIds.includes(trade.prop_firm_id || ''));
    }

    // Outcome filter
    if (filterOutcome === "wins") {
      filtered = filtered.filter((trade) => trade.profit > 0);
    } else if (filterOutcome === "losses") {
      filtered = filtered.filter((trade) => trade.profit < 0);
    }

    // Date filters
    if (dateFrom) {
      filtered = filtered.filter((trade) => trade.trade_date >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter((trade) => trade.trade_date <= dateTo);
    }

    setFilteredTrades(filtered);
  };

  const exportToCSV = () => {
    const headers = ["Date", "Pair", "Type", "Volume", "Entry", "TP", "SL", "Close", "P&L", "Session", "Emotion", "Prop Firm", "Notes"];
    const rows = filteredTrades.map((trade) => [
      trade.trade_date,
      trade.pair,
      trade.trade_type || "",
      trade.volume?.toString() || "",
      trade.entry_price?.toString() || "",
      trade.take_profit?.toString() || "",
      trade.stop_loss?.toString() || "",
      trade.close_price?.toString() || "",
      trade.profit.toString(),
      trade.session || "",
      trade.emotion || "",
      propFirms.find((f) => f.id === trade.prop_firm_id)?.name || "",
      trade.notes || "",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `trades_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  // Calculate statistics
  const totalTrades = filteredTrades.length;
  const winningTrades = filteredTrades.filter((t) => t.profit > 0).length;
  const losingTrades = filteredTrades.filter((t) => t.profit < 0).length;
  const winRate = totalTrades > 0 ? ((winningTrades / totalTrades) * 100).toFixed(1) : "0.0";
  const totalProfit = filteredTrades.reduce((sum, t) => sum + t.profit, 0);
  const avgWin = winningTrades > 0
    ? filteredTrades.filter((t) => t.profit > 0).reduce((sum, t) => sum + t.profit, 0) / winningTrades
    : 0;
  const avgLoss = losingTrades > 0
    ? Math.abs(filteredTrades.filter((t) => t.profit < 0).reduce((sum, t) => sum + t.profit, 0) / losingTrades)
    : 0;
  const profitFactor = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : "N/A";

  const pnlStyles = getPnLStyles(totalProfit);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Trade Management</h1>
        <p className="text-sm text-muted-foreground">Advanced filtering and analysis of your trades</p>
      </div>

      {/* Statistics Cards - Compact Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        <Card className="glow-card">
          <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Trades</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3">
            <div className="text-xl sm:text-2xl font-bold">{totalTrades}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
              {winningTrades}W / {losingTrades}L
            </p>
          </CardContent>
        </Card>

        <Card className="glow-card">
          <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3">
            <div className="text-xl sm:text-2xl font-bold">{winRate}%</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Success ratio</p>
          </CardContent>
        </Card>

        <Card className="glow-card">
          <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total P&L</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3">
            <div className={`text-xl sm:text-2xl font-bold ${pnlStyles.text}`}>
              ${totalProfit.toFixed(2)}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Net profit/loss</p>
          </CardContent>
        </Card>

        <Card className="glow-card">
          <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Profit Factor</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3">
            <div className="text-xl sm:text-2xl font-bold">{profitFactor}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Avg W / Avg L</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters - Compact */}
      <Card className="glow-card">
        <CardHeader className="py-3 px-3 sm:px-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
            <Button onClick={exportToCSV} variant="outline" size="sm" className="gap-2 h-8">
              <Download className="h-3 w-3" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-4 pb-3">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search trades..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>

              <PropFirmFilter
                propFirms={propFirms}
                selectedFirm={filterPropFirm}
                selectedAccount={filterAccount}
                onFirmChange={setFilterPropFirm}
                onAccountChange={setFilterAccount}
              />

              <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-9 text-xs min-w-0"
                  />
                </div>
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-9 text-xs min-w-0"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trades Table */}
      <Card className="glow-card">
        <CardHeader className="py-3 px-3 sm:px-4">
          <CardTitle className="text-sm sm:text-base">Trades ({filteredTrades.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-2 sm:px-4 pb-3">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Time</TableHead>
                  <TableHead className="text-xs">Pair</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Type</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Vol</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">Entry</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">TP</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">SL</TableHead>
                  <TableHead className="text-xs hidden xl:table-cell">Close</TableHead>
                  <TableHead className="text-xs">P&L</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Session</TableHead>
                  <TableHead className="text-xs hidden xl:table-cell">Account</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrades.map((trade) => {
                  const styles = getPnLStyles(trade.profit);
                  const Icon = styles.icon;
                  const propFirmName = propFirms.find((f) => f.id === trade.prop_firm_id)?.name;
                  
                  const propFirm = propFirms.find((f) => f.id === trade.prop_firm_id);
                  const accountType = propFirm?.account_type;
                  
                  return (
                    <TableRow 
                      key={trade.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/app/journal/${trade.id}`)}
                    >
                      <TableCell className="font-mono text-xs">{trade.trade_date}</TableCell>
                      <TableCell className="font-mono text-xs">{formatOpenTime(trade.open_time)}</TableCell>
                      <TableCell className="font-medium text-xs">{trade.pair}</TableCell>
                      <TableCell className="text-xs hidden sm:table-cell">
                        {trade.trade_type ? (
                          <Badge variant="outline" className={trade.trade_type === 'Buy' ? 'bg-green-500/10 text-green-500 border-green-500/30' : 'bg-red-500/10 text-red-500 border-red-500/30'}>
                            {trade.trade_type}
                          </Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs hidden md:table-cell">{trade.volume?.toFixed(2) || "—"}</TableCell>
                      <TableCell className="font-mono text-xs hidden lg:table-cell">{trade.entry_price?.toFixed(2) || "—"}</TableCell>
                      <TableCell className="font-mono text-xs hidden lg:table-cell">{trade.take_profit?.toFixed(2) || "—"}</TableCell>
                      <TableCell className="font-mono text-xs hidden lg:table-cell">{trade.stop_loss?.toFixed(2) || "—"}</TableCell>
                      <TableCell className="font-mono text-xs hidden xl:table-cell">{trade.close_price?.toFixed(2) || "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`gap-1 text-xs ${styles.bg} ${styles.text} ${styles.border}`}
                        >
                          <Icon className="h-3 w-3" />
                          ${Math.abs(trade.profit).toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs hidden sm:table-cell">
                        {trade.session ? (
                          <Badge variant="outline" className={`text-xs ${
                            trade.session === 'London' ? 'bg-blue-500/10 text-blue-500 border-blue-500/30' :
                            trade.session === 'New York' ? 'bg-green-500/10 text-green-500 border-green-500/30' :
                            trade.session === 'Asia' ? 'bg-purple-500/10 text-purple-500 border-purple-500/30' :
                            ''
                          }`}>
                            {trade.session}
                          </Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-xs hidden xl:table-cell">
                        {propFirm ? (
                          <div className="flex flex-col gap-0.5">
                            <span>{propFirm.name}</span>
                            <Badge 
                              variant="outline" 
                              className={`text-[10px] w-fit ${
                                accountType === 'Funded' 
                                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' 
                                  : accountType === 'Challenge'
                                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                                  : 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                              }`}
                            >
                              {accountType || 'Personal'}
                            </Badge>
                          </div>
                        ) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {filteredTrades.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No trades found matching your filters
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
