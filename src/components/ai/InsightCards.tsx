import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, AlertTriangle, Target, Zap, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Insight {
  id: string;
  icon: typeof TrendingUp;
  title: string;
  message: string;
  type: 'warning' | 'success' | 'info';
  query?: string;
}

interface TradingData {
  totalTrades: number;
  winRate: number;
  weeklyWinRate: number;
  totalProfit: number;
  weeklyProfit: number;
  bestPair: string | null;
  worstPair: string | null;
  recentStreak: number;
}

interface InsightCardsProps {
  onSuggestionClick: (query: string) => void;
}

export default function InsightCards({ onSuggestionClick }: InsightCardsProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [tradingData, setTradingData] = useState<TradingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTradingData();
  }, []);

  const fetchTradingData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all trades
      const { data: trades } = await supabase
        .from("trades")
        .select("profit, pair, trade_date")
        .eq("user_id", user.id)
        .order("trade_date", { ascending: false });

      if (!trades || trades.length === 0) {
        setLoading(false);
        return;
      }

      // Calculate stats
      const totalTrades = trades.length;
      const winningTrades = trades.filter(t => t.profit > 0);
      const winRate = (winningTrades.length / totalTrades) * 100;
      const totalProfit = trades.reduce((sum, t) => sum + Number(t.profit), 0);

      // Weekly stats
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weeklyTrades = trades.filter(t => new Date(t.trade_date) >= weekAgo);
      const weeklyWins = weeklyTrades.filter(t => t.profit > 0);
      const weeklyWinRate = weeklyTrades.length > 0 ? (weeklyWins.length / weeklyTrades.length) * 100 : 0;
      const weeklyProfit = weeklyTrades.reduce((sum, t) => sum + Number(t.profit), 0);

      // Pair performance
      const pairPerformance: Record<string, number> = {};
      trades.forEach(t => {
        pairPerformance[t.pair] = (pairPerformance[t.pair] || 0) + Number(t.profit);
      });
      const pairs = Object.entries(pairPerformance).sort((a, b) => b[1] - a[1]);
      const bestPair = pairs.length > 0 ? pairs[0][0] : null;
      const worstPair = pairs.length > 0 ? pairs[pairs.length - 1][0] : null;

      // Recent streak
      let streak = 0;
      const lastTradeWin = trades[0]?.profit > 0;
      for (const trade of trades) {
        if ((trade.profit > 0) === lastTradeWin) {
          streak++;
        } else {
          break;
        }
      }

      const data: TradingData = {
        totalTrades,
        winRate,
        weeklyWinRate,
        totalProfit,
        weeklyProfit,
        bestPair,
        worstPair,
        recentStreak: lastTradeWin ? streak : -streak,
      };

      setTradingData(data);
      generateInsights(data);
    } catch (error) {
      console.error("Error fetching trading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = (data: TradingData) => {
    const newInsights: Insight[] = [];

    // Win rate comparison
    if (data.weeklyWinRate < data.winRate - 10) {
      newInsights.push({
        id: 'winrate_drop',
        icon: TrendingDown,
        title: 'Win Rate Dropped',
        message: `Your weekly win rate (${data.weeklyWinRate.toFixed(0)}%) is below your average (${data.winRate.toFixed(0)}%)`,
        type: 'warning',
        query: 'Why did my win rate drop this week?'
      });
    } else if (data.weeklyWinRate > data.winRate + 10) {
      newInsights.push({
        id: 'winrate_up',
        icon: TrendingUp,
        title: 'Great Week!',
        message: `Your weekly win rate (${data.weeklyWinRate.toFixed(0)}%) is above average!`,
        type: 'success',
        query: 'What am I doing right this week?'
      });
    }

    // Weekly profit
    if (data.weeklyProfit < 0) {
      newInsights.push({
        id: 'weekly_loss',
        icon: AlertTriangle,
        title: 'Weekly Loss',
        message: `You're down $${Math.abs(data.weeklyProfit).toFixed(0)} this week. Consider reviewing your strategy.`,
        type: 'warning',
        query: 'Analyze my losing trades this week'
      });
    } else if (data.weeklyProfit > 0) {
      newInsights.push({
        id: 'weekly_profit',
        icon: Target,
        title: 'In Profit',
        message: `You're up $${data.weeklyProfit.toFixed(0)} this week. Keep it going!`,
        type: 'success',
        query: 'What were my best trades this week?'
      });
    }

    // Streak
    if (data.recentStreak >= 3) {
      newInsights.push({
        id: 'win_streak',
        icon: Zap,
        title: `${data.recentStreak} Win Streak!`,
        message: 'You\'re on fire! Stay disciplined.',
        type: 'success',
        query: 'How can I maintain this streak?'
      });
    } else if (data.recentStreak <= -3) {
      newInsights.push({
        id: 'loss_streak',
        icon: AlertTriangle,
        title: `${Math.abs(data.recentStreak)} Loss Streak`,
        message: 'Consider taking a break to reset.',
        type: 'warning',
        query: 'What should I do after a losing streak?'
      });
    }

    // Best pair
    if (data.bestPair) {
      newInsights.push({
        id: 'best_pair',
        icon: BarChart3,
        title: `Best: ${data.bestPair}`,
        message: 'This is your most profitable pair.',
        type: 'info',
        query: `Analyze my ${data.bestPair} trades`
      });
    }

    setInsights(newInsights.slice(0, 3)); // Show max 3 insights
  };

  const suggestionChips = [
    'Analyze my win rate',
    'Best performing pair',
    'What should I improve?',
    'Review my week',
  ];

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse bg-muted/20">
              <CardContent className="p-3 h-16" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Insight Cards */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {insights.map((insight) => (
            <Card 
              key={insight.id}
              className={`cursor-pointer transition-all hover:scale-[1.02] ${
                insight.type === 'warning' 
                  ? 'border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10' 
                  : insight.type === 'success'
                  ? 'border-green-500/30 bg-green-500/5 hover:bg-green-500/10'
                  : 'border-primary/30 bg-primary/5 hover:bg-primary/10'
              }`}
              onClick={() => insight.query && onSuggestionClick(insight.query)}
            >
              <CardContent className="p-3 flex items-center gap-2">
                <insight.icon className={`h-4 w-4 shrink-0 ${
                  insight.type === 'warning' ? 'text-yellow-500' :
                  insight.type === 'success' ? 'text-green-500' :
                  'text-primary'
                }`} />
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{insight.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{insight.message}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Suggestion Chips */}
      <div className="flex flex-wrap gap-2">
        {suggestionChips.map((suggestion) => (
          <Button
            key={suggestion}
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={() => onSuggestionClick(suggestion)}
          >
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  );
}
