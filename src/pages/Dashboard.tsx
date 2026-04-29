import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, DollarSign, Target, Award, Plus, Minus, Folder, Wallet } from "lucide-react";
import { useStaffPermissions } from "@/hooks/useStaffPermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// Recharts replaced with custom SVG chart
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import EconomicCalendarWidget from "@/components/EconomicCalendarWidget";
import MotivationalBar from "@/components/MotivationalBar";
import ForexTicker from "@/components/ForexTicker";
import PropFirmFilter from "@/components/PropFirmFilter";
import DailyCheckinModal from "@/components/DailyCheckinModal";

interface PropFirm {
  id: string;
  name: string;
  balance: number | null;
  equity: number | null;
  current_profit: number | null;
  profit_target: number | null;
  account_type?: string;
  account_status?: string | null;
}

interface Trade {
  id: string;
  profit: number;
  trade_date: string;
  prop_firm_id: string | null;
  net_profit?: number;
}

// PNL color utility
const getPnLStyles = (profit: number) => {
  if (profit > 0) return { color: 'text-green-500', icon: TrendingUp };
  if (profit < 0) return { color: 'text-red-500', icon: TrendingDown };
  return { color: 'text-muted-foreground', icon: Minus };
};

// Helper functions for SVG chart
function generateChartPath(data: { date: string; profit: number }[]): string {
  if (data.length === 0) return "";
  
  const maxProfit = Math.max(...data.map(d => d.profit), 0);
  const minProfit = Math.min(...data.map(d => d.profit), 0);
  const range = maxProfit - minProfit || 1;
  
  return data.map((d, i) => {
    const x = (i / (data.length - 1)) * 400;
    const y = 100 - ((d.profit - minProfit) / range) * 80 - 10;
    return `${i === 0 ? 'M' : 'L'}${x} ${y}`;
  }).join(' ');
}

function getLastPointY(data: { date: string; profit: number }[]): number {
  if (data.length === 0) return 50;
  
  const maxProfit = Math.max(...data.map(d => d.profit), 0);
  const minProfit = Math.min(...data.map(d => d.profit), 0);
  const range = maxProfit - minProfit || 1;
  
  return 100 - ((data[data.length - 1].profit - minProfit) / range) * 80 - 10;
}

const STATUS_TABS = ["All", "Active", "Passed", "Blocked", "Failed"] as const;

export default function Dashboard() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isCEO } = useStaffPermissions();
  const [propFirms, setPropFirms] = useState<PropFirm[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedFirm, setSelectedFirm] = useState<string>("all");
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [showCheckin, setShowCheckin] = useState(false);
  const [hasShownCheckin, setHasShownCheckin] = useState(false);
  const [statusTab, setStatusTab] = useState<string>("All");
  const [userName, setUserName] = useState<string>("Trader");
  const [totalPayoutAmount, setTotalPayoutAmount] = useState(0);
  const [chartPeriod, setChartPeriod] = useState<7 | 30 | 90>(7);

  useEffect(() => {
    fetchData();
    // Check if check-in should be triggered (from sign-in or session restore)
    const shouldTrigger = localStorage.getItem('trigger_daily_checkin');
    if (shouldTrigger === 'true') {
      checkDailyCheckin();
      localStorage.removeItem('trigger_daily_checkin');
    }
    fetchUserName();
    fetchPayoutTotal();
  }, []);

  const fetchUserName = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
    if (data?.name) setUserName(data.name);
  };

  const fetchPayoutTotal = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("payouts").select("amount").eq("user_id", user.id);
    if (data) {
      setTotalPayoutAmount(data.reduce((sum, p) => sum + (p.amount || 0), 0));
    }
  };

  const checkDailyCheckin = async () => {
    // Prevent showing multiple times in same session
    if (hasShownCheckin) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from("daily_checkins")
      .select("id")
      .eq("user_id", user.id)
      .gte("created_at", today.toISOString())
      .maybeSingle();

    if (!data) {
      setShowCheckin(true);
      setHasShownCheckin(true);
    }
  };

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: tradesData } = await supabase
      .from("trades")
      .select("id, user_id, prop_firm_id, profit, trade_date")
      .eq("user_id", user.id)
      .order("trade_date", { ascending: true });

    const { data: propFirmsData } = await supabase
      .from("prop_firms")
      .select("id, name, account_type, profit_target, balance, current_profit, account_status")
      .eq("user_id", user.id);

    const mergedPropFirms = (propFirmsData || []).map(pf => ({
      ...pf,
      balance: pf.balance || 0,
      equity: (pf.balance || 0) + (pf.current_profit || 0),
      current_profit: pf.current_profit || 0,
    }));

    setPropFirms(mergedPropFirms);
    setTrades(tradesData || []);
  };

  const normalizeCase = (name: string) => name.trim().toLowerCase();

  const getMatchingFirmIds = () => {
    if (selectedAccount !== "all") return [selectedAccount];
    if (selectedFirm !== "all") return propFirms.filter(f => normalizeCase(f.name) === normalizeCase(selectedFirm)).map(f => f.id);
    return null;
  };

  const matchingIds = getMatchingFirmIds();
  const filteredTrades = matchingIds ? trades.filter(t => matchingIds.includes(t.prop_firm_id || '')) : trades;
  const filteredPropFirms = matchingIds ? propFirms.filter(f => matchingIds.includes(f.id)) : propFirms;

  // Status-filtered accounts for mobile
  const statusFilteredAccounts = statusTab === "All"
    ? filteredPropFirms
    : filteredPropFirms.filter(f => (f.account_status || "").toLowerCase() === statusTab.toLowerCase());

  const fundedAccounts = filteredPropFirms.filter(f => f.account_type === 'Funded');
  const totalBalance = fundedAccounts.reduce((sum, firm) => sum + (firm.balance || 0), 0);
  const totalEquity = fundedAccounts.reduce((sum, firm) => sum + ((firm.balance || 0) + (firm.current_profit || 0)), 0);
  const hasFundedAccounts = fundedAccounts.length > 0;
  const totalProfit = filteredTrades.reduce((sum, trade) => sum + Number(trade.profit), 0);
  const winningTrades = filteredTrades.filter(t => Number(t.profit) > 0).length;
  const winRate = filteredTrades.length > 0 ? winningTrades / filteredTrades.length * 100 : 0;
  const bestDay = filteredTrades.length > 0
    ? filteredTrades.reduce((best, trade) => Number(trade.profit) > Number(best.profit) ? trade : best)
    : null;

  const passedCount = propFirms.filter(f => (f.account_status || "").toLowerCase() === "passed").length;
  const fundedCount = propFirms.filter(f => f.account_type === "Funded").length;

  const chartData = filteredTrades
    .filter(trade => new Date(trade.trade_date) >= subDays(new Date(), chartPeriod))
    .reduce((acc: any[], trade) => {
      const date = format(new Date(trade.trade_date), "MMM d");
      const existing = acc.find(item => item.date === date);
      if (existing) { existing.profit += Number(trade.profit); }
      else { acc.push({ date, profit: Number(trade.profit) }); }
      return acc;
    }, []);

  const pnlStyles = getPnLStyles(totalProfit);
  const PnLIcon = pnlStyles.icon;

  const stats = [
    { title: "Total PnL", value: `$${totalProfit.toFixed(2)}`, change: hasFundedAccounts ? `Funded Balance: $${totalBalance.toFixed(2)}` : "No funded capital yet", trend: totalProfit >= 0 ? "up" : "down", icon: DollarSign, pnlColor: pnlStyles.color },
    { title: "Best Trade", value: bestDay ? `$${Number(bestDay.profit).toFixed(2)}` : "$0.00", change: bestDay ? format(new Date(bestDay.trade_date), "MMM d, yyyy") : "No trades", trend: "up", icon: Award },
    { title: "Win Rate", value: `${winRate.toFixed(1)}%`, change: `${winningTrades}/${filteredTrades.length} wins`, trend: winRate >= 50 ? "up" : "down", icon: Target }
  ];

  // =========== MOBILE LAYOUT ===========
  if (isMobile) {
    return (
      <>
        <DailyCheckinModal open={showCheckin} onClose={() => setShowCheckin(false)} />
        <div className="space-y-4 pb-20">
          {/* Welcome */}
          <div>
            <h1 className="text-xl font-bold">Welcome Back, {userName}</h1>
            <p className="text-xs text-muted-foreground">Your trading overview</p>
          </div>

          {/* Total Payout Summary */}
          <Card className="glow-card border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Payout</p>
                  <p className="text-2xl font-bold font-mono text-primary">${totalPayoutAmount.toLocaleString()}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-muted/20 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold">{propFirms.length}</p>
                  <p className="text-[10px] text-muted-foreground">Total</p>
                </div>
                <div className="bg-muted/20 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold">{passedCount}</p>
                  <p className="text-[10px] text-muted-foreground">Passed</p>
                </div>
                <div className="bg-muted/20 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold">{fundedCount}</p>
                  <p className="text-[10px] text-muted-foreground">Funded</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {STATUS_TABS.map(tab => (
              <Badge
                key={tab}
                variant={statusTab === tab ? "default" : "outline"}
                className="cursor-pointer whitespace-nowrap px-3 py-1.5 text-xs shrink-0"
                onClick={() => setStatusTab(tab)}
              >
                {tab}
              </Badge>
            ))}
          </div>

          {/* Account List */}
          <div>
            <p className="text-sm font-semibold mb-2">
              {statusTab === "All" ? "All" : statusTab} Accounts ({statusFilteredAccounts.length})
            </p>
            {statusFilteredAccounts.length === 0 ? (
              <Card className="glow-card">
                <CardContent className="p-6 text-center">
                  <Folder className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No accounts found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {statusFilteredAccounts.map(firm => {
                  const profitStyles = getPnLStyles(firm.current_profit || 0);
                  return (
                    <Card
                      key={firm.id}
                      className="glow-card cursor-pointer"
                      onClick={() => navigate(`/app/prop-firms/${firm.id}`)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-sm truncate">{firm.name}</p>
                          <Badge variant="outline" className="text-[10px]">{firm.account_type || "N/A"}</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground block">Balance</span>
                            <span className="font-mono font-medium">${(firm.balance || 0).toFixed(0)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Equity</span>
                            <span className="font-mono font-medium text-primary">${((firm.balance || 0) + (firm.current_profit || 0)).toFixed(0)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">P&L</span>
                            <span className={`font-mono font-medium ${profitStyles.color}`}>${(firm.current_profit || 0).toFixed(0)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title} className="glow-card">
                  <CardContent className="p-2.5 text-center">
                    <Icon className="h-4 w-4 mx-auto mb-1 text-primary" />
                    <p className={`text-sm font-bold ${stat.title === "Total PnL" ? stat.pnlColor : ""}`}>{stat.value}</p>
                    <p className="text-[9px] text-muted-foreground truncate">{stat.title}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </>
    );
  }

  // =========== DESKTOP LAYOUT (unchanged) ===========
  return (
    <>
    <DailyCheckinModal open={showCheckin} onClose={() => setShowCheckin(false)} />
    <div className="space-y-4 sm:space-y-6">
      {isCEO && <Card className="border-primary/20 bg-primary/5" />}

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">Welcome Back, {userName}</h1>
          <p className="text-sm text-muted-foreground">Your trading performance overview</p>
        </div>
        <div className="flex flex-col gap-2 w-full lg:w-auto">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <PropFirmFilter propFirms={propFirms} selectedFirm={selectedFirm} selectedAccount={selectedAccount} onFirmChange={setSelectedFirm} onAccountChange={setSelectedAccount} />
          </div>
          <Button onClick={() => navigate("/app/prop-firms")} className="gap-2 h-9 w-full sm:w-auto shrink-0">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Manage Accounts</span>
            <span className="sm:hidden">Manage</span>
          </Button>
        </div>
      </div>

      <MotivationalBar />
      <ForexTicker />

      <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend === "up" ? TrendingUp : TrendingDown;
          const trendColor = stat.trend === "up" ? "text-green-500" : "text-red-500";
          return (
            <Card key={stat.title} className="glow-card">
              <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 px-3 sm:px-4">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="px-3 sm:px-4 pb-3">
                <div className={`text-xl sm:text-2xl font-bold ${stat.title === "Total PnL" ? stat.pnlColor : ''}`}>{stat.value}</div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendIcon className={`h-3 w-3 ${trendColor}`} />
                  <span className="text-xs text-muted-foreground">{stat.change}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3 w-full max-w-full overflow-hidden">
        <Card className="glow-card lg:col-span-2 w-full min-w-0">
          <CardHeader className="py-3 px-3 sm:px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm sm:text-base">Recent Performance</CardTitle>
            <div className="flex gap-1">
              {[7, 30, 90].map((days) => (
                <Button
                  key={days}
                  variant={chartPeriod === days ? "default" : "outline"}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setChartPeriod(days as 7 | 30 | 90)}
                >
                  {days}D
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-4 pb-3 overflow-x-auto">
            {chartData.length > 0 ? (
              <div className="h-[200px] sm:h-[250px] min-w-[280px] relative">
                <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2"/>
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <path d={`${generateChartPath(chartData)} L400 100 L0 100 Z`} fill="url(#chartGradient)"/>
                  <path d={generateChartPath(chartData)} fill="none" stroke="hsl(var(--primary))" strokeWidth="2"/>
                  <circle cx="400" cy={getLastPointY(chartData)} r="4" fill="hsl(var(--primary))" />
                </svg>
                <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-muted-foreground px-2">
                  {chartData.map((d, i) => (
                    <span key={i}>{d.date}</span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No trade data available yet</div>
            )}
          </CardContent>
        </Card>
        <div className="lg:col-span-1 w-full min-w-0">
          <EconomicCalendarWidget />
        </div>
      </div>

      {filteredPropFirms.length > 0 && (
        <Card className="glow-card">
          <CardHeader className="py-3 px-3 sm:px-4">
            <CardTitle className="text-sm sm:text-base">Prop Firms Overview</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3">
            <div className="grid gap-2 sm:gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {filteredPropFirms.map(firm => {
                const profitStyles = getPnLStyles(firm.current_profit || 0);
                return (
                  <Card key={firm.id} className="bg-muted/30 border-border/50 cursor-pointer hover:bg-muted/50 hover:border-primary/30 transition-all" onClick={() => navigate(`/app/prop-firms/${firm.id}`)}>
                    <CardContent className="p-3 space-y-1.5">
                      <p className="font-semibold text-sm truncate">{firm.name}</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div><span className="text-muted-foreground block">Balance</span><span className="font-mono font-medium">${(firm.balance || 0).toFixed(0)}</span></div>
                        <div><span className="text-muted-foreground block">Equity</span><span className="font-mono font-medium text-primary">${((firm.balance || 0) + (firm.current_profit || 0)).toFixed(0)}</span></div>
                        <div><span className="text-muted-foreground block">P&L</span><span className={`font-mono font-medium ${profitStyles.color}`}>${(firm.current_profit || 0).toFixed(0)}</span></div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="glow-card border-primary/20">
        <CardHeader className="py-3 px-3 sm:px-4">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <span className="text-primary font-bold">YUNIX</span>
            <span className="text-muted-foreground font-normal">says:</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-4 pb-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {filteredTrades.length > 0
              ? `You're tracking ${filteredPropFirms.length} account${filteredPropFirms.length !== 1 ? 's' : ''} with ${hasFundedAccounts ? `$${totalEquity.toFixed(2)} funded equity` : 'no funded capital yet'}. Your win rate is ${winRate.toFixed(1)}% across ${filteredTrades.length} trade${filteredTrades.length !== 1 ? 's' : ''}. ${bestDay ? `Best trade: $${Number(bestDay.profit).toFixed(2)} on ${format(new Date(bestDay.trade_date), "MMM d")}.` : ''} Keep following your strategy!`
              : "Welcome! Start by adding your prop firms and logging trades to track your progress."}
          </p>
        </CardContent>
      </Card>
    </div>
    </>
  );
}
