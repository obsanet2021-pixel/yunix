import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Target, Percent, Calendar as CalendarIcon, ChevronLeft, ChevronRight, RotateCcw, Radio, Zap, AlertTriangle, DollarSign, Camera, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import PropFirmFilter from "@/components/PropFirmFilter";
import { CycleFilter } from "@/components/propfirms/CycleFilter";
import { useAllCyclesForUser } from "@/hooks/useAccountCycles";
import { useToast } from "@/hooks/use-toast";
import { usePlaybooks } from "@/hooks/usePlaybooks";
import { 
  calculateExpectancy, calculateAverageR, calculateAverageRiskReward,
  calculateMistakeCost, countMistakesByType, getLossByMistakeType, getMistakeTagLabel,
  type TradeWithPricing 
} from "@/lib/tradeCalculations";
import { MonthlyCardScreenshot } from "@/components/MonthlyCardScreenshot";
import { useScreenshotFeature } from "@/hooks/usePlanFeatures";

interface Trade {
  id: string; pair: string; profit: number; session: string | null; emotion: string | null;
  trade_date: string; prop_firm_id: string | null; cycle_id: string | null;
  entry_price: number | null; stop_loss: number | null; take_profit: number | null;
  close_price: number | null; volume: number | null; trade_type: string | null;
  rule_broken: boolean | null; mistake_tags: string[] | null; emotion_tag: string | null;
}

interface PropFirm {
  id: string; name: string; account_type?: string; balance?: number | null; current_profit?: number | null;
}

interface DailyStat {
  day: Date; hasTrades: boolean; winRate: number; totalProfit: number; tradeCount: number;
}

const getPnLColor = (profit: number) => {
  if (profit > 0) return 'text-green-500';
  if (profit < 0) return 'text-red-500';
  return 'text-muted-foreground';
};

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--destructive))"];

// Semi-circular gauge component for mobile
function WinLossGauge({ wins, losses }: { wins: number; losses: number }) {
  const total = wins + losses;
  const winPct = total > 0 ? wins / total : 0;
  const radius = 70;
  const cx = 90;
  const cy = 85;
  const startAngle = Math.PI;
  const endAngle = 0;
  const winAngle = startAngle - winPct * Math.PI;

  const polarToCartesian = (angle: number) => ({
    x: cx + radius * Math.cos(angle),
    y: cy - radius * Math.sin(angle),
  });

  const bgStart = polarToCartesian(startAngle);
  const bgEnd = polarToCartesian(endAngle);
  const winEnd = polarToCartesian(winAngle);

  const bgPath = `M ${bgStart.x} ${bgStart.y} A ${radius} ${radius} 0 1 1 ${bgEnd.x} ${bgEnd.y}`;
  const winPath = total > 0
    ? `M ${bgStart.x} ${bgStart.y} A ${radius} ${radius} 0 ${winPct > 0.5 ? 1 : 0} 1 ${winEnd.x} ${winEnd.y}`
    : "";

  return (
    <div className="flex flex-col items-center">
      <svg width="180" height="100" viewBox="0 0 180 100">
        <path d={bgPath} fill="none" stroke="hsl(var(--destructive))" strokeWidth="14" strokeLinecap="round" />
        {winPath && <path d={winPath} fill="none" stroke="hsl(var(--success))" strokeWidth="14" strokeLinecap="round" />}
        <text x={cx} y={cy - 10} textAnchor="middle" className="fill-foreground text-2xl font-bold" fontSize="24">{total}</text>
        <text x={cx} y={cy + 8} textAnchor="middle" className="fill-muted-foreground" fontSize="10">Total Trades</text>
      </svg>
      <div className="flex items-center gap-6 mt-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-success" />
          <span className="text-xs font-medium">{wins} Wins</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-destructive" />
          <span className="text-xs font-medium">{losses} Losses</span>
        </div>
      </div>
    </div>
  );
}

export default function Analytics() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { canAccess: canAccessScreenshot, upsellMessage } = useScreenshotFeature();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [propFirms, setPropFirms] = useState<PropFirm[]>([]);
  const [timeRange, setTimeRange] = useState("30");
  const [filterPlaybookId, setFilterPlaybookId] = useState("all");
  const { playbooks } = usePlaybooks();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedPropFirm, setSelectedPropFirm] = useState<string>("all");
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [selectedCycleId, setSelectedCycleId] = useState<string>("current");
  const [analyticsMode, setAnalyticsMode] = useState<"cycle" | "lifetime">("cycle");
  const [userId, setUserId] = useState<string | null>(null);
  const [isRealtime, setIsRealtime] = useState(true);

  const { getCyclesForFirm, getActiveCycleForFirm } = useAllCyclesForUser();
  const selectedAccountData = propFirms.find(f => f.id === selectedAccount);
  const isFundedAccount = selectedAccountData?.account_type === 'Funded';
  const cycles = selectedAccount !== 'all' ? getCyclesForFirm(selectedAccount) : [];
  const activeCycle = selectedAccount !== 'all' ? getActiveCycleForFirm(selectedAccount) : null;

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, []);

  useEffect(() => { fetchTrades(); fetchPropFirms(); }, []);

  useEffect(() => {
    if (!userId || !isRealtime) return;
    const channel = supabase.channel('trades-realtime-analytics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trades', filter: `user_id=eq.${userId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTrades(prev => [...prev, payload.new as Trade].sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()));
        } else if (payload.eventType === 'UPDATE') {
          setTrades(prev => prev.map(t => t.id === payload.new.id ? payload.new as Trade : t));
        } else if (payload.eventType === 'DELETE') {
          setTrades(prev => prev.filter(t => t.id !== payload.old.id));
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, isRealtime]);

  const fetchTrades = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("trades")
      .select("id, pair, profit, session, emotion, trade_date, prop_firm_id, cycle_id, entry_price, stop_loss, take_profit, close_price, volume, trade_type, rule_broken, mistake_tags, emotion_tag")
      .eq("user_id", user.id).order("trade_date", { ascending: true });
    setTrades((data || []) as Trade[]);
  };

  const fetchPropFirms = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("prop_firms").select("id, name, account_type, balance, current_profit").eq("user_id", user.id);
    setPropFirms(data || []);
  };

  const getMatchingFirmIds = () => {
    if (selectedAccount !== "all") return [selectedAccount];
    if (selectedPropFirm !== "all") return propFirms.filter(f => f.name === selectedPropFirm).map(f => f.id);
    return null;
  };

  const filteredTrades = trades.filter((trade) => {
    if (filterPlaybookId !== "all" && (trade as any).playbook_id !== filterPlaybookId) return false;
    if (timeRange !== "all") {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(timeRange));
      if (new Date(trade.trade_date) < daysAgo) return false;
    }
    const matchingIds = getMatchingFirmIds();
    if (matchingIds && !matchingIds.includes(trade.prop_firm_id || '')) return false;
    if (isFundedAccount && analyticsMode === "cycle") {
      if (selectedCycleId === "current") {
        if (!activeCycle || trade.cycle_id !== activeCycle.id) return false;
      } else if (selectedCycleId !== "all") {
        if (trade.cycle_id !== selectedCycleId) return false;
      }
    }
    return true;
  });

  const totalTrades = filteredTrades.length;
  const winningTrades = filteredTrades.filter(t => t.profit > 0);
  const losingTrades = filteredTrades.filter(t => t.profit < 0);
  const winRate = totalTrades > 0 ? ((winningTrades.length / totalTrades) * 100).toFixed(1) : "0";
  const totalProfit = filteredTrades.reduce((sum, t) => sum + t.profit, 0);
  const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.profit, 0) / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((sum, t) => sum + t.profit, 0) / losingTrades.length) : 0;
  const profitFactor = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : "N/A";

  const tradesWithPricing: TradeWithPricing[] = filteredTrades.map(t => ({
    id: t.id, profit: t.profit, entry_price: t.entry_price, stop_loss: t.stop_loss,
    take_profit: t.take_profit, close_price: t.close_price, volume: t.volume,
    trade_type: t.trade_type, rule_broken: t.rule_broken, mistake_tags: t.mistake_tags,
  }));

  const expectancy = calculateExpectancy(tradesWithPricing);
  const averageR = calculateAverageR(tradesWithPricing);
  const averageRR = calculateAverageRiskReward(tradesWithPricing);
  const mistakeCost = calculateMistakeCost(tradesWithPricing);
  const mistakeCounts = countMistakesByType(tradesWithPricing);
  const mistakeLosses = getLossByMistakeType(tradesWithPricing);
  const rulesbrokenCount = filteredTrades.filter(t => t.rule_broken === true).length;

  const cumulativePnLData = filteredTrades.reduce((acc: any[], trade, index) => {
    const prevTotal = index > 0 ? acc[index - 1].cumulative : 0;
    acc.push({ date: format(parseISO(trade.trade_date), "MMM dd"), cumulative: prevTotal + trade.profit, profit: trade.profit });
    return acc;
  }, []);

  const pairPerformance = Object.entries(
    filteredTrades.reduce((acc: Record<string, { profit: number; count: number }>, trade) => {
      if (!acc[trade.pair]) acc[trade.pair] = { profit: 0, count: 0 };
      acc[trade.pair].profit += trade.profit;
      acc[trade.pair].count += 1;
      return acc;
    }, {})
  ).map(([pair, data]) => ({ pair, profit: data.profit, count: data.count, avgProfit: data.profit / data.count })).sort((a, b) => b.profit - a.profit).slice(0, 8);

  const winLossData = [
    { name: "Wins", value: winningTrades.length, color: "hsl(142, 71%, 45%)" },
    { name: "Losses", value: losingTrades.length, color: "hsl(var(--destructive))" },
  ];

  const dayOfWeekData = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => {
    const dayTrades = filteredTrades.filter(t => new Date(t.trade_date).getDay() === index);
    return { day, profit: dayTrades.reduce((sum, t) => sum + t.profit, 0), count: dayTrades.length };
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const dailyStats: DailyStat[] = calendarDays.map(day => {
    let dayTrades = trades.filter(t => isSameDay(parseISO(t.trade_date), day));
    const matchingIds = getMatchingFirmIds();
    if (matchingIds) dayTrades = dayTrades.filter(t => matchingIds.includes(t.prop_firm_id || ''));
    const wt = dayTrades.filter(t => t.profit > 0);
    const wr = dayTrades.length > 0 ? (wt.length / dayTrades.length) * 100 : 0;
    const tp = dayTrades.reduce((sum, t) => sum + t.profit, 0);
    return { day, hasTrades: dayTrades.length > 0, winRate: parseFloat(wr.toFixed(0)), totalProfit: parseFloat(tp.toFixed(2)), tradeCount: dayTrades.length };
  });

  const totalTradingDays = dailyStats.filter(d => d.hasTrades).length;

  const weekNumberToWord = (num: number) => {
    const words = ['One', 'Two', 'Three', 'Four', 'Five', 'Six'];
    return words[num - 1] || num.toString();
  };

  const weeklyData = (() => {
    const weeks: Array<{ weekNumber: number; startDate: Date; endDate: Date; totalPnL: number; tradingDays: number }> = [];
    // Limit to 4 weeks
    const maxDays = 28;
    for (let i = 0; i < Math.min(dailyStats.length, maxDays); i += 7) {
      const weekDays = dailyStats.slice(i, i + 7);
      if (weekDays.length === 0) continue;
      const tradingDaysInWeek = weekDays.filter(d => d.hasTrades && isSameMonth(d.day, currentMonth));
      const totalPnL = weekDays.filter(d => isSameMonth(d.day, currentMonth)).reduce((sum, d) => sum + d.totalProfit, 0);
      if (weekDays.some(d => isSameMonth(d.day, currentMonth))) {
        weeks.push({ weekNumber: weeks.length + 1, startDate: weekDays[0].day, endDate: weekDays[weekDays.length - 1].day, totalPnL, tradingDays: tradingDaysInWeek.length });
      }
    }
    return weeks;
  })();

  // Get user's invitation code
  const [invitationCode, setInvitationCode] = useState<string>("");
  useEffect(() => {
    const loadInvitationCode = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("invite_code").eq("id", user.id).single();
        if (profile?.invite_code) {
          setInvitationCode(profile.invite_code);
        }
      }
    };
    loadInvitationCode();
  }, []);

  // Screenshot sharing is now handled by MonthlyCardScreenshot component

  // Equity from funded accounts
  const fundedAccounts = propFirms.filter(f => f.account_type === 'Funded');
  const totalEquity = fundedAccounts.reduce((sum, f) => sum + ((f.balance || 0) + (f.current_profit || 0)), 0);

  // =========== MOBILE LAYOUT ===========
  if (isMobile) {
    return (
      <div className="space-y-4 pb-20 w-full max-w-full overflow-x-hidden">
        <div>
          <h1 className="text-xl font-bold">My Stats</h1>
          <p className="text-xs text-muted-foreground">Performance analysis</p>
        </div>

        {/* Time Filter */}
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-full h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 Days</SelectItem>
            <SelectItem value="30">Last 30 Days</SelectItem>
            <SelectItem value="90">Last 90 Days</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>

        {/* 2x2 Stat Cards with colored left accent */}
        <div className="grid grid-cols-2 gap-2">
          <Card className="glow-card overflow-hidden">
            <div className="flex">
              <div className="w-1 bg-primary shrink-0" />
              <CardContent className="p-3 flex-1">
                <p className="text-[10px] text-muted-foreground mb-0.5">Net P&L</p>
                <p className={`text-lg font-bold font-mono ${getPnLColor(totalProfit)}`}>${totalProfit.toFixed(0)}</p>
              </CardContent>
            </div>
          </Card>
          <Card className="glow-card overflow-hidden">
            <div className="flex">
              <div className="w-1 bg-success shrink-0" />
              <CardContent className="p-3 flex-1">
                <p className="text-[10px] text-muted-foreground mb-0.5">Win Rate</p>
                <p className="text-lg font-bold font-mono">{winRate}%</p>
              </CardContent>
            </div>
          </Card>
          <Card className="glow-card overflow-hidden">
            <div className="flex">
              <div className="w-1 bg-chart-2 shrink-0" />
              <CardContent className="p-3 flex-1">
                <p className="text-[10px] text-muted-foreground mb-0.5">Average RRR</p>
                <p className="text-lg font-bold font-mono">{averageRR !== null ? `1:${averageRR.toFixed(1)}` : 'N/A'}</p>
              </CardContent>
            </div>
          </Card>
          <Card className="glow-card overflow-hidden">
            <div className="flex">
              <div className="w-1 bg-chart-4 shrink-0" />
              <CardContent className="p-3 flex-1">
                <p className="text-[10px] text-muted-foreground mb-0.5">Profit Factor</p>
                <p className="text-lg font-bold font-mono">{profitFactor}</p>
              </CardContent>
            </div>
          </Card>
        </div>

        {/* Equity Card */}
        <Card className="glow-card border-primary/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current Equity</p>
              <p className="text-2xl font-bold font-mono text-primary">${totalEquity.toFixed(0)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Win/Loss Gauge */}
        <Card className="glow-card">
          <CardContent className="p-4 flex justify-center">
            <WinLossGauge wins={winningTrades.length} losses={losingTrades.length} />
          </CardContent>
        </Card>

        {/* Max Drawdown */}
        <Card className="glow-card overflow-hidden">
          <div className="flex">
            <div className="w-1 bg-destructive shrink-0" />
            <CardContent className="p-3 flex-1">
              <p className="text-[10px] text-muted-foreground mb-0.5">Mistake Cost</p>
              <p className="text-lg font-bold font-mono text-destructive">-${mistakeCost.toFixed(0)}</p>
              <p className="text-[10px] text-muted-foreground">{rulesbrokenCount} rules broken</p>
            </CardContent>
          </div>
        </Card>

        {/* Compact Trading Calendar */}
        <Card className="glow-card">
          <CardHeader className="px-3 py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <CalendarIcon className="h-4 w-4 text-primary" />
                Calendar
              </CardTitle>
              <div className="flex items-center gap-1">
                <MonthlyCardScreenshot
                  currentMonth={currentMonth}
                  totalTrades={totalTrades}
                  winningTrades={winningTrades.length}
                  losingTrades={losingTrades.length}
                  winRate={winRate}
                  totalProfit={totalProfit}
                  totalTradingDays={totalTradingDays}
                  invitationCode={invitationCode}
                  disabled={!canAccessScreenshot}
                  upsellMessage={upsellMessage}
                >
                  <div className="grid grid-cols-7 gap-0.5 mb-1">
                    {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                      <div key={i} className="text-center text-[9px] font-medium text-muted-foreground py-0.5">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-0.5">
                    {dailyStats.map((stat, index) => {
                      const isCurrentMonth = isSameMonth(stat.day, currentMonth);
                      return (
                        <div
                          key={index}
                          className={`
                            aspect-square rounded flex items-center justify-center text-[9px] font-medium
                            ${!isCurrentMonth ? 'opacity-20' : ''}
                            ${stat.hasTrades && stat.totalProfit > 0 ? 'bg-green-500/20 text-green-500' : ''}
                            ${stat.hasTrades && stat.totalProfit < 0 ? 'bg-red-500/20 text-red-500' : ''}
                            ${!stat.hasTrades ? 'text-muted-foreground' : ''}
                          `}
                        >
                          {format(stat.day, "d")}
                        </div>
                      );
                    })}
                  </div>
                </MonthlyCardScreenshot>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs font-semibold min-w-[70px] text-center">{format(currentMonth, "MMM yyyy")}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <div key={i} className="text-center text-[9px] font-medium text-muted-foreground py-0.5">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {dailyStats.map((stat, index) => {
                const isCurrentMonth = isSameMonth(stat.day, currentMonth);
                const isToday = isSameDay(stat.day, new Date());
                return (
                  <div
                    key={index}
                    className={`
                      aspect-square rounded flex items-center justify-center text-[9px] font-medium
                      ${!isCurrentMonth ? 'opacity-20' : ''}
                      ${isToday ? 'ring-1 ring-primary' : ''}
                      ${stat.hasTrades && stat.totalProfit > 0 ? 'bg-green-500/20 text-green-500' : ''}
                      ${stat.hasTrades && stat.totalProfit < 0 ? 'bg-red-500/20 text-red-500' : ''}
                      ${!stat.hasTrades ? 'text-muted-foreground' : ''}
                    `}
                  >
                    {format(stat.day, "d")}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // =========== DESKTOP LAYOUT (unchanged) ===========
  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Analytics</h1>
          <p className="text-sm text-muted-foreground">Performance analysis and insights</p>
        </div>
        <div className="flex items-center gap-2">
          {playbooks.length > 0 && (
            <Select value={filterPlaybookId} onValueChange={setFilterPlaybookId}>
              <SelectTrigger className="w-full sm:w-[160px] h-9">
                <SelectValue placeholder="All Playbooks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Playbooks</SelectItem>
                {playbooks.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant={isRealtime ? "default" : "outline"}
            size="sm"
            className="h-9 gap-1.5 text-xs"
            onClick={() => setIsRealtime(!isRealtime)}
          >
            <Radio className={`h-3 w-3 ${isRealtime ? "animate-pulse" : ""}`} />
            {isRealtime ? "Live" : "Paused"}
          </Button>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-full sm:w-[140px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
              <SelectItem value="365">Last Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cycle Mode Toggle */}
      {isFundedAccount && (
        <Card className="glow-card p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge variant={analyticsMode === "cycle" ? "default" : "outline"} className="cursor-pointer" onClick={() => setAnalyticsMode("cycle")}>
                <RotateCcw className="h-3 w-3 mr-1" />Cycle Analytics
              </Badge>
              <Badge variant={analyticsMode === "lifetime" ? "default" : "outline"} className="cursor-pointer" onClick={() => setAnalyticsMode("lifetime")}>
                Lifetime Analytics
              </Badge>
            </div>
            {analyticsMode === "cycle" && (
              <CycleFilter cycles={cycles} selectedCycleId={selectedCycleId} onCycleChange={setSelectedCycleId} showAllOption={true} />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {analyticsMode === "cycle" 
              ? selectedCycleId === "current" ? `Showing data for current active cycle${activeCycle ? ` (#${activeCycle.cycle_number})` : ''}`
              : selectedCycleId === "all" ? "Showing lifetime data across all cycles"
              : `Showing data for Cycle #${cycles.find(c => c.id === selectedCycleId)?.cycle_number || ''}`
              : "Showing lifetime data across all cycles"}
          </p>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        <Card className="glow-card">
          <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" /><span className="truncate">Trades</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3">
            <div className="text-xl sm:text-2xl font-bold">{totalTrades}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">{winningTrades.length}W / {losingTrades.length}L</p>
          </CardContent>
        </Card>
        <Card className="glow-card">
          <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Percent className="h-3 w-3" /><span className="truncate">Win Rate</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3">
            <div className="text-xl sm:text-2xl font-bold">{winRate}%</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">${avgWin.toFixed(0)} / ${avgLoss.toFixed(0)}</p>
          </CardContent>
        </Card>
        <Card className="glow-card">
          <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /><span className="truncate">Total P&L</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3">
            <div className={`text-xl sm:text-2xl font-bold ${getPnLColor(totalProfit)}`}>${totalProfit.toFixed(0)}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Net profit/loss</p>
          </CardContent>
        </Card>
        <Card className="glow-card">
          <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Target className="h-3 w-3" /><span className="truncate">Profit Factor</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3">
            <div className="text-xl sm:text-2xl font-bold">{profitFactor}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Gross P / Gross L</p>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Risk Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        <Card className="glow-card border-primary/20">
          <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Zap className="h-3 w-3 text-primary" /><span className="truncate">Expectancy</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3">
            <div className={`text-xl sm:text-2xl font-bold ${getPnLColor(expectancy)}`}>${expectancy.toFixed(2)}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Avg $ per trade</p>
          </CardContent>
        </Card>
        <Card className="glow-card border-primary/20">
          <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Target className="h-3 w-3 text-primary" /><span className="truncate">Avg R-Multiple</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3">
            <div className={`text-xl sm:text-2xl font-bold ${averageR !== null ? getPnLColor(averageR) : ''}`}>{averageR !== null ? `${averageR.toFixed(2)}R` : 'N/A'}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Profit / Risk</p>
          </CardContent>
        </Card>
        <Card className="glow-card border-primary/20">
          <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-primary" /><span className="truncate">Avg RR Ratio</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3">
            <div className="text-xl sm:text-2xl font-bold">{averageRR !== null ? `1:${averageRR.toFixed(1)}` : 'N/A'}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Risk : Reward</p>
          </CardContent>
        </Card>
        <Card className="glow-card border-destructive/20">
          <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-destructive" /><span className="truncate">Mistake Cost</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3">
            <div className="text-xl sm:text-2xl font-bold text-destructive">-${mistakeCost.toFixed(0)}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{rulesbrokenCount} rules broken</p>
          </CardContent>
        </Card>
      </div>

      {/* Mistake Analysis */}
      {Object.keys(mistakeCounts).length > 0 && (
        <Card className="glow-card">
          <CardHeader className="px-3 sm:px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <AlertTriangle className="h-4 w-4 text-destructive" />Mistake Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {Object.entries(mistakeCounts).sort((a, b) => (mistakeLosses[b[0]] || 0) - (mistakeLosses[a[0]] || 0)).map(([tag, count]) => (
                <div key={tag} className="p-2 rounded-lg border bg-destructive/5 border-destructive/20">
                  <div className="text-xs font-medium truncate">{getMistakeTagLabel(tag)}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-bold">{count}x</span>
                    <span className="text-xs text-destructive font-medium">-${(mistakeLosses[tag] || 0).toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar + Weekly Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card className="glow-card lg:col-span-2">
          <CardHeader className="px-3 sm:px-4 py-3">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <CalendarIcon className="h-4 w-4 text-primary" />Monthly Calendar
                </CardTitle>
                <MonthlyCardScreenshot
                  currentMonth={currentMonth}
                  totalTrades={totalTrades}
                  winningTrades={winningTrades.length}
                  losingTrades={losingTrades.length}
                  winRate={winRate}
                  totalProfit={totalProfit}
                  totalTradingDays={totalTradingDays}
                  invitationCode={invitationCode}
                  disabled={!canAccessScreenshot}
                  upsellMessage={upsellMessage}
                >
                  <div className="space-y-1">
                    <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                      {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                        <div key={index} className="text-center text-[9px] sm:text-xs font-medium text-muted-foreground py-1">{day}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                      {dailyStats.map((stat, index) => {
                        const isCurrentMonth = isSameMonth(stat.day, currentMonth);
                        return (
                          <div
                            key={index}
                            className={`relative aspect-square rounded-md border h-auto p-1 min-h-[32px]
                              ${!isCurrentMonth ? 'opacity-30' : ''}
                              ${stat.hasTrades && stat.totalProfit > 0 ? 'bg-green-500/20 border-green-500/30' : ''}
                              ${stat.hasTrades && stat.totalProfit < 0 ? 'bg-red-500/20 border-red-500/30' : ''}
                              ${!stat.hasTrades ? 'bg-muted/10 border-border/20' : ''}`}
                          >
                            <div className="absolute top-0.5 right-0.5 text-[8px] sm:text-[10px] font-bold">{format(stat.day, "d")}</div>
                            {stat.hasTrades && (
                              <div className="flex flex-col items-center justify-center h-full pt-2">
                                <div className={`text-[8px] sm:text-[10px] font-bold ${stat.totalProfit > 0 ? 'text-green-500' : stat.totalProfit < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                  ${Math.abs(stat.totalProfit).toFixed(0)}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </MonthlyCardScreenshot>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <PropFirmFilter propFirms={propFirms} selectedFirm={selectedPropFirm} selectedAccount={selectedAccount} onFirmChange={setSelectedPropFirm} onAccountChange={setSelectedAccount} />
                <div className="flex items-center justify-center gap-1">
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="text-xs sm:text-sm font-semibold min-w-[80px] text-center">{format(currentMonth, "MMM yyyy")}</span>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{totalTradingDays} trading days</p>
          </CardHeader>
          <CardContent className="px-2 sm:px-4 pb-3">
            <div className="space-y-1">
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                  <div key={index} className="text-center text-[9px] sm:text-xs font-medium text-muted-foreground py-1">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                {dailyStats.map((stat, index) => {
                  const isCurrentMonth = isSameMonth(stat.day, currentMonth);
                  const isToday = isSameDay(stat.day, new Date());
                  const dateString = format(stat.day, 'yyyy-MM-dd');
                  return (
                    <Button key={index} variant="ghost" onClick={() => navigate(`/app/trade-journal?date=${dateString}`)}
                      className={`relative aspect-square rounded-md border transition-all h-auto p-0 min-h-[32px] sm:min-h-[40px] md:min-h-[48px]
                        ${!isCurrentMonth ? 'opacity-30' : ''} ${isToday ? 'ring-1 ring-primary' : ''}
                        ${stat.hasTrades && stat.totalProfit > 0 ? 'bg-green-500/20 border-green-500/30 hover:bg-green-500/30' : ''}
                        ${stat.hasTrades && stat.totalProfit < 0 ? 'bg-red-500/20 border-red-500/30 hover:bg-red-500/30' : ''}
                        ${stat.hasTrades && stat.totalProfit === 0 ? 'bg-muted/30 border-muted/50 hover:bg-muted/40' : ''}
                        ${!stat.hasTrades ? 'bg-muted/10 border-border/20 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="absolute top-0.5 right-0.5 text-[8px] sm:text-[10px] font-bold">{format(stat.day, "d")}</div>
                      {stat.hasTrades && (
                        <div className="flex flex-col items-center justify-center h-full pt-2">
                          <div className={`text-[8px] sm:text-[10px] font-bold ${stat.totalProfit > 0 ? 'text-green-500' : stat.totalProfit < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>${Math.abs(stat.totalProfit).toFixed(0)}</div>
                          <div className="text-[6px] sm:text-[8px] text-muted-foreground hidden sm:block">{stat.tradeCount}T</div>
                        </div>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-3 pt-2 border-t">
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/30" /><span className="text-[9px] sm:text-xs text-muted-foreground">Profit</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30" /><span className="text-[9px] sm:text-xs text-muted-foreground">Loss</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-muted/10 border border-border/30" /><span className="text-[9px] sm:text-xs text-muted-foreground">No trades</span></div>
            </div>
          </CardContent>
        </Card>

        <Card className="glow-card">
          <CardHeader className="px-3 sm:px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base"><TrendingUp className="h-4 w-4 text-primary" />Weekly Summary</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{format(currentMonth, "MMMM yyyy")}</p>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3">
            <div className="space-y-1.5">
              {weeklyData.map((week) => (
                <div key={week.weekNumber} className={`p-2 rounded-lg border transition-all ${week.tradingDays > 0 ? week.totalPnL >= 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20' : 'bg-muted/20 border-border/30'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs sm:text-sm">Week {weekNumberToWord(week.weekNumber)}</span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground">{format(week.startDate, "MMM d")} - {format(week.endDate, "MMM d")}</span>
                  </div>
                  {week.tradingDays > 0 ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] sm:text-xs text-muted-foreground">PnL:</span>
                        <span className={`text-sm sm:text-base font-bold ${getPnLColor(week.totalPnL)}`}>{week.totalPnL >= 0 ? '' : '-'}${Math.abs(week.totalPnL).toFixed(2)}</span>
                      </div>
                      <span className="text-[10px] sm:text-xs text-muted-foreground">Days: {week.tradingDays}</span>
                    </div>
                  ) : (<span className="text-xs sm:text-sm text-muted-foreground italic">No trades</span>)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <Card className="glow-card">
          <CardHeader className="px-3 sm:px-4 py-2 sm:py-3"><CardTitle className="text-xs sm:text-sm">Cumulative P&L</CardTitle></CardHeader>
          <CardContent className="px-2 sm:px-4 pb-3">
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={cumulativePnLData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 9 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
                <Line type="monotone" dataKey="cumulative" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="glow-card">
          <CardHeader className="px-3 sm:px-4 py-2 sm:py-3"><CardTitle className="text-xs sm:text-sm">Win/Loss</CardTitle></CardHeader>
          <CardContent className="px-2 sm:px-4 pb-3">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={winLossData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={55} fill="hsl(var(--primary))" dataKey="value">
                  {winLossData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="glow-card">
          <CardHeader className="px-3 sm:px-4 py-2 sm:py-3"><CardTitle className="text-xs sm:text-sm">By Pair</CardTitle></CardHeader>
          <CardContent className="px-2 sm:px-4 pb-3">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={pairPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 9 }} />
                <YAxis dataKey="pair" type="category" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 9 }} width={45} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
                <Bar dataKey="profit" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="glow-card">
          <CardHeader className="px-3 sm:px-4 py-2 sm:py-3"><CardTitle className="text-xs sm:text-sm">By Day</CardTitle></CardHeader>
          <CardContent className="px-2 sm:px-4 pb-3">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={dayOfWeekData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 9 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
                <Bar dataKey="profit" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
