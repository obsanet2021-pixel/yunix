import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { TrendingUp, Target, Award, ChevronRight } from "lucide-react";

export default function Welcome() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState("");
  const [stats, setStats] = useState({
    totalTrades: 0,
    winRate: 0,
    bestReturn: 0,
    backtestCount: 0
  });
  const [bestReturnData, setBestReturnData] = useState<any[]>([]);

  useEffect(() => {
    loadUserData();
    loadStats();
  }, []);

  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      setUserEmail(user.email.split('@')[0]);
    }
  };

  const loadStats = async () => {
    try {
      const { data: trades } = await supabase
        .from('trades')
        .select('*')
        .order('trade_date', { ascending: true });

      if (trades && trades.length > 0) {
        const winningTrades = trades.filter(t => t.profit > 0);
        const winRate = (winningTrades.length / trades.length) * 100;
        
        // Calculate best return
        let balance = 10000;
        let bestBalance = 10000;
        const chartData: any[] = [];
        
        trades.forEach((trade, i) => {
          balance += trade.profit;
          if (balance > bestBalance) bestBalance = balance;
          if (i % Math.ceil(trades.length / 30) === 0) {
            chartData.push({ value: balance });
          }
        });

        const bestReturn = ((bestBalance - 10000) / 10000) * 100;
        setBestReturnData(chartData);

        setStats({
          totalTrades: trades.length,
          winRate,
          bestReturn,
          backtestCount: (() => {
            try {
              const saved = localStorage.getItem("backtest-sessions");
              return saved ? JSON.parse(saved).length : 0;
            } catch {
              return 0;
            }
          })()
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hero Section */}
        <Card className="glow-card relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
          <CardContent className="relative p-12">
            <div className="flex items-center justify-between">
              <div className="space-y-4">
                <h1 className="text-5xl font-bold">
                  {getGreeting()}, {userEmail || "Trader"}
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl">
                  Master your trading skills with advanced backtesting and real-time analytics. 
                  Your journey to consistent profitability starts here.
                </p>
                <div className="flex gap-4 mt-6">
                  <Button size="lg" onClick={() => navigate('/backtest-sessions')} className="gap-2">
                    Continue Backtesting
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => navigate('/analytics')}>
                    View Analytics
                  </Button>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="w-64 h-64 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-32 w-32 text-primary" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="glow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Trades</p>
                <p className="text-3xl font-bold">{stats.totalTrades}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="glow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Award className="h-8 w-8 text-secondary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <p className="text-3xl font-bold">{stats.winRate.toFixed(1)}%</p>
              </div>
            </CardContent>
          </Card>

          <Card className="glow-card bg-gradient-to-br from-secondary/20 to-secondary/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="h-8 w-8 text-secondary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Best Return (%)</p>
                <p className="text-3xl font-bold text-secondary">
                  {stats.bestReturn.toFixed(2)}%
                </p>
              </div>
              {bestReturnData.length > 0 && (
                <ResponsiveContainer width="100%" height={60}>
                  <LineChart data={bestReturnData}>
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="hsl(var(--secondary))" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="glow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-lg font-bold">BT</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Backtest Sessions</p>
                <p className="text-3xl font-bold">{stats.backtestCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glow-card hover:border-primary/50 transition-all cursor-pointer" onClick={() => navigate('/trade-journal')}>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-2">Trade Journal</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Log and analyze your trades with detailed insights
              </p>
              <Button variant="outline" className="w-full">
                Open Journal
              </Button>
            </CardContent>
          </Card>

          <Card className="glow-card hover:border-primary/50 transition-all cursor-pointer" onClick={() => navigate('/backtest-sessions')}>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-2">Backtesting</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Practice strategies with historical market data
              </p>
              <Button variant="outline" className="w-full">
                Start Session
              </Button>
            </CardContent>
          </Card>

          <Card className="glow-card hover:border-primary/50 transition-all cursor-pointer" onClick={() => navigate('/ai-chat')}>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-2">AI Assistant</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Get personalized trading advice and insights
              </p>
              <Button variant="outline" className="w-full">
                Chat Now
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Motivational Section */}
        <Card className="glow-card bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Level Up Your Trading?</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Consistent practice and data-driven decisions are the keys to trading success. 
              Start your backtesting session now and refine your strategies with real market scenarios.
            </p>
            <Button size="lg" onClick={() => navigate('/backtest-sessions')}>
              Create New Backtest Session
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
