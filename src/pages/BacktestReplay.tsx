import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { 
  Play, Pause, RotateCcw, SkipForward, Save, 
  TrendingUp, TrendingDown, MessageSquare
} from "lucide-react";
import { toast } from "sonner";
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  date: string;
}

interface Trade {
  id: string;
  entryTime: number;
  entryPrice: number;
  exitTime?: number;
  exitPrice?: number;
  type: "long" | "short";
  pnl?: number;
  status: "open" | "closed";
}

export default function BacktestReplay() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [balance, setBalance] = useState(10000);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [positionSize] = useState(1);
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    const sessions = JSON.parse(localStorage.getItem("backtest-sessions") || "[]");
    const found = sessions.find((s: any) => s.id === sessionId);
    if (!found) {
      toast.error("Session not found");
      navigate("/backtest-sessions");
      return;
    }
    setSession(found);
    setBalance(found.balance);
    generateHistoricalData(found);
  }, [sessionId]);

  const generateHistoricalData = (sess: any) => {
    const data: Candle[] = [];
    let price = sess.pair === "XAUUSD" ? 2680 : sess.pair === "EURUSD" ? 1.085 : 150;
    
    const totalCandles = 1000;
    const now = Date.now();
    
    for (let i = 0; i < totalCandles; i++) {
      const timestamp = now - (totalCandles - i) * 15 * 60 * 1000;
      const open = price;
      const change = (Math.random() - 0.48) * (price * 0.002);
      const high = open + Math.abs(change) + Math.random() * (price * 0.001);
      const low = open - Math.abs(change) - Math.random() * (price * 0.001);
      const close = open + change;
      
      data.push({
        timestamp,
        open: parseFloat(open.toFixed(sess.pair === "XAUUSD" ? 2 : 5)),
        high: parseFloat(high.toFixed(sess.pair === "XAUUSD" ? 2 : 5)),
        low: parseFloat(low.toFixed(sess.pair === "XAUUSD" ? 2 : 5)),
        close: parseFloat(close.toFixed(sess.pair === "XAUUSD" ? 2 : 5)),
        date: new Date(timestamp).toLocaleString(),
      });
      
      price = close;
    }
    
    setCandles(data);
  };

  useEffect(() => {
    if (!isPlaying || currentIndex >= candles.length - 1) {
      setIsPlaying(false);
      return;
    }
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= candles.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1000 / playbackSpeed);
    
    return () => clearInterval(interval);
  }, [isPlaying, currentIndex, candles.length, playbackSpeed]);

  const handleLongEntry = () => {
    if (currentIndex >= candles.length) return;
    const currentCandle = candles[currentIndex];
    const openTrade = trades.find(t => t.status === "open");
    
    if (openTrade) {
      toast.warning("Close existing position first!");
      return;
    }
    
    const newTrade: Trade = {
      id: Date.now().toString(),
      entryTime: currentCandle.timestamp,
      entryPrice: currentCandle.close,
      type: "long",
      status: "open",
    };
    
    setTrades([...trades, newTrade]);
    toast.success(`Opened LONG at ${currentCandle.close.toFixed(session?.pair === "XAUUSD" ? 2 : 5)}`);
  };

  const handleShortEntry = () => {
    if (currentIndex >= candles.length) return;
    const currentCandle = candles[currentIndex];
    const openTrade = trades.find(t => t.status === "open");
    
    if (openTrade) {
      toast.warning("Close existing position first!");
      return;
    }
    
    const newTrade: Trade = {
      id: Date.now().toString(),
      entryTime: currentCandle.timestamp,
      entryPrice: currentCandle.close,
      type: "short",
      status: "open",
    };
    
    setTrades([...trades, newTrade]);
    toast.success(`Opened SHORT at ${currentCandle.close.toFixed(session?.pair === "XAUUSD" ? 2 : 5)}`);
  };

  const handleClosePosition = () => {
    if (currentIndex >= candles.length) return;
    const currentCandle = candles[currentIndex];
    const openTrade = trades.find(t => t.status === "open");
    
    if (!openTrade) {
      toast.warning("No open position!");
      return;
    }
    
    const priceDiff = openTrade.type === "long" 
      ? currentCandle.close - openTrade.entryPrice
      : openTrade.entryPrice - currentCandle.close;
    
    const pnl = priceDiff * positionSize * (session?.pair === "XAUUSD" ? 100 : 100000);
    
    setTrades(trades.map(t => 
      t.id === openTrade.id
        ? { ...t, exitTime: currentCandle.timestamp, exitPrice: currentCandle.close, pnl, status: "closed" as const }
        : t
    ));
    
    setBalance(balance + pnl);
    toast.success(`Closed position: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`);
  };

  const getAIAdvice = async () => {
    setIsAiLoading(true);
    try {
      const closedTrades = trades.filter(t => t.status === "closed");
      const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
      const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;

      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          messages: [
            {
              role: "user",
              content: `I'm backtesting my trading strategy on ${session?.pair}. Here are my results:
              - Total trades: ${closedTrades.length}
              - Win rate: ${winRate.toFixed(1)}%
              - Total P&L: $${totalPnL.toFixed(2)}
              - Current balance: $${balance.toFixed(2)}
              
              ${aiMessage ? `Additional context: ${aiMessage}` : ''}
              
              Please provide specific advice on how to improve my trading strategy.`
            }
          ],
          stream: false
        }
      });

      if (error) throw error;
      setAiResponse(data.response);
    } catch (error) {
      console.error('AI Error:', error);
      toast.error("Failed to get AI advice");
    } finally {
      setIsAiLoading(false);
    }
  };

  const chartData = candles.slice(Math.max(0, currentIndex - 50), currentIndex + 1).map(c => ({
    time: new Date(c.timestamp).toLocaleTimeString(),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    color: c.close >= c.open ? "hsl(var(--secondary))" : "hsl(var(--destructive))",
  }));

  const currentCandle = candles[currentIndex];
  const openTrade = trades.find(t => t.status === "open");
  const openPnL = openTrade && currentCandle 
    ? (openTrade.type === "long" 
      ? currentCandle.close - openTrade.entryPrice 
      : openTrade.entryPrice - currentCandle.close) * positionSize * (session?.pair === "XAUUSD" ? 100 : 100000)
    : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Bar */}
      <div className="border-b border-border px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold">{session?.pair}</h2>
          <span className="text-sm text-muted-foreground">{session?.timeframe}</span>
          {currentCandle && (
            <div className="flex items-center gap-4 text-sm font-mono">
              <span className={currentCandle.close >= currentCandle.open ? "text-secondary" : "text-destructive"}>
                {currentCandle.close.toFixed(session?.pair === "XAUUSD" ? 2 : 5)}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => setShowAIChat(true)}>
            <MessageSquare className="h-4 w-4 mr-2" />
            AI Advice
          </Button>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Balance:</div>
            <div className={`text-lg font-bold ${balance >= (session?.balance || 0) ? 'text-secondary' : 'text-destructive'}`}>
              ${balance.toFixed(2)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Open P/L:</div>
            <div className={`text-lg font-bold ${openPnL >= 0 ? 'text-secondary' : 'text-destructive'}`}>
              {openPnL >= 0 ? '+' : ''}${openPnL.toFixed(2)}
            </div>
          </div>
          <Button onClick={() => navigate("/backtest-sessions")} variant="outline">
            Exit Session
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4">
        <Card className="h-full p-4">
          <ResponsiveContainer width="100%" height="80%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                domain={['dataMin - 5', 'dataMax + 5']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="high" fill="transparent" />
              <Bar dataKey="open">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>

          {/* Controls */}
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-4">
              <Button size="sm" variant="outline" onClick={() => { setCurrentIndex(0); setIsPlaying(false); }}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={() => setIsPlaying(!isPlaying)}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setCurrentIndex(Math.min(currentIndex + 10, candles.length - 1))}>
                <SkipForward className="h-4 w-4" />
              </Button>
              <div className="flex-1">
                <Slider
                  value={[currentIndex]}
                  max={candles.length - 1}
                  step={1}
                  onValueChange={(value) => setCurrentIndex(value[0])}
                  disabled={isPlaying}
                />
              </div>
              <span className="text-sm text-muted-foreground min-w-[100px] text-right">
                {currentIndex + 1} / {candles.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm">Speed:</span>
              <Slider
                value={[playbackSpeed]}
                min={0.5}
                max={5}
                step={0.5}
                onValueChange={(value) => setPlaybackSpeed(value[0])}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">{playbackSpeed}x</span>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleLongEntry} 
                disabled={trades.some(t => t.status === "open") || candles.length === 0}
                className="flex-1"
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Buy / Long
              </Button>
              <Button 
                onClick={handleShortEntry} 
                disabled={trades.some(t => t.status === "open") || candles.length === 0}
                className="flex-1"
                variant="destructive"
              >
                <TrendingDown className="mr-2 h-4 w-4" />
                Sell / Short
              </Button>
              <Button 
                onClick={handleClosePosition} 
                disabled={!trades.some(t => t.status === "open")}
                variant="outline"
                className="flex-1"
              >
                Close Position
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* AI Chat Dialog */}
      <Dialog open={showAIChat} onOpenChange={setShowAIChat}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI Trading Advisor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Ask for specific advice or provide additional context..."
              value={aiMessage}
              onChange={(e) => setAiMessage(e.target.value)}
              rows={3}
            />
            <Button onClick={getAIAdvice} disabled={isAiLoading} className="w-full">
              {isAiLoading ? "Getting advice..." : "Get AI Advice"}
            </Button>
            {aiResponse && (
              <Card className="p-4 bg-muted/50">
                <p className="text-sm whitespace-pre-wrap">{aiResponse}</p>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
