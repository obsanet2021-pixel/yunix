import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calculator, TrendingUp, Shield, AlertTriangle, CheckCircle, Bot, Loader2 } from "lucide-react";

interface PropFirm {
  id: string;
  name: string;
  balance: number | null;
  equity: number | null;
  current_profit: number | null;
  profit_target: number | null;
  account_type: string;
  funded_balance: number | null;
}

interface PlanResult {
  positionSize: number;
  riskAmount: number;
  rrRatio: number;
  pipValue: number;
  slPips: number;
  tpPips: number;
  potentialProfit: number;
  compliance: {
    withinDailyLoss: boolean;
    withinMaxDrawdown: boolean;
    message: string;
  };
}

const COMMON_PAIRS = [
  "EURUSD", "GBPUSD", "USDJPY", "GBPJPY", "EURJPY", "XAUUSD",
  "AUDUSD", "USDCAD", "NZDUSD", "USDCHF", "EURGBP", "AUDNZD"
];

// Approximate pip values (per standard lot per pip) in USD
const getPipInfo = (pair: string) => {
  const upper = pair.toUpperCase();
  if (upper === "XAUUSD") return { pipSize: 0.1, pipValuePerLot: 1 }; // $1 per 0.01 lot per pip for gold
  if (upper.endsWith("JPY")) return { pipSize: 0.01, pipValuePerLot: 6.5 }; // approx
  return { pipSize: 0.0001, pipValuePerLot: 10 }; // standard forex
};

export default function TradePlanner() {
  const [propFirms, setPropFirms] = useState<PropFirm[]>([]);
  const [selectedFirmId, setSelectedFirmId] = useState("");
  const [pair, setPair] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [riskPercent, setRiskPercent] = useState("0.5");
  const [riskDollars, setRiskDollars] = useState("25");
  const [riskMode, setRiskMode] = useState<"percent" | "dollar">("percent");
  const [direction, setDirection] = useState<"buy" | "sell">("buy");
  const [result, setResult] = useState<PlanResult | null>(null);
  const [aiInsight, setAiInsight] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPropFirms();
  }, []);

  const fetchPropFirms = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("prop_firms")
      .select("id, name, balance, equity, current_profit, profit_target, account_type, funded_balance")
      .eq("user_id", user.id)
      .order("name");
    if (data) setPropFirms(data);
  };

  const selectedFirm = propFirms.find(f => f.id === selectedFirmId);
  const accountEquity = selectedFirm
    ? (selectedFirm.balance || 0) + (selectedFirm.current_profit || 0)
    : 0;

  const calculate = () => {
    const entry = parseFloat(entryPrice);
    const sl = parseFloat(stopLoss);
    const tp = parseFloat(takeProfit);

    const riskAmount = riskMode === "dollar"
      ? parseFloat(riskDollars)
      : accountEquity * (parseFloat(riskPercent) / 100);

    if (!entry || !sl || !tp || !riskAmount || !accountEquity) {
      toast({ title: "Missing data", description: "Fill in all fields and select an account.", variant: "destructive" });
      return;
    }

    const pipInfo = getPipInfo(pair);
    const slDistance = Math.abs(entry - sl);
    const tpDistance = Math.abs(tp - entry);
    const slPips = slDistance / pipInfo.pipSize;
    const tpPips = tpDistance / pipInfo.pipSize;
    const rrRatio = tpPips / slPips;
    const positionSize = riskAmount / (slPips * pipInfo.pipValuePerLot);
    const potentialProfit = tpPips * pipInfo.pipValuePerLot * positionSize;

    // Compliance check
    const dailyLossLimit = accountEquity * 0.05; // 5% default
    const maxDrawdown = selectedFirm?.funded_balance
      ? selectedFirm.funded_balance * 0.10 // 10% of funded balance
      : accountEquity * 0.10;

    const currentDrawdown = selectedFirm?.funded_balance
      ? selectedFirm.funded_balance - accountEquity
      : 0;

    const withinDailyLoss = riskAmount <= dailyLossLimit;
    const withinMaxDrawdown = (currentDrawdown + riskAmount) <= maxDrawdown;

    let message = "";
    if (withinDailyLoss && withinMaxDrawdown) {
      message = "✅ This trade is within safe risk limits.";
    } else if (!withinDailyLoss) {
      message = `⚠️ Risk of $${riskAmount.toFixed(2)} exceeds the recommended 5% daily loss limit ($${dailyLossLimit.toFixed(2)}).`;
    } else {
      message = `⚠️ Adding this risk ($${riskAmount.toFixed(2)}) may push you close to the maximum drawdown limit.`;
    }

    setResult({
      positionSize: Math.round(positionSize * 100) / 100,
      riskAmount,
      rrRatio,
      pipValue: pipInfo.pipValuePerLot,
      slPips,
      tpPips,
      potentialProfit,
      compliance: { withinDailyLoss, withinMaxDrawdown, message },
    });
  };

  const getAIInsight = async () => {
    if (!result || !selectedFirm) return;
    setLoadingAI(true);
    try {
      const res = await supabase.functions.invoke("chat", {
        body: {
          stream: false,
          messages: [{
            role: "user",
            content: `I'm planning a ${direction} trade on ${pair}. Entry: ${entryPrice}, SL: ${stopLoss}, TP: ${takeProfit}. Risk: ${riskPercent}%. Account equity: $${accountEquity.toFixed(2)}. Calculated position size: ${result.positionSize} lots, R:R = 1:${result.rrRatio.toFixed(1)}. Risk amount: $${result.riskAmount.toFixed(2)}. Give me a brief 2-3 sentence strategic insight about this trade setup.`
          }]
        }
      });
      setAiInsight(res.data?.response || "No insight available.");
    } catch {
      setAiInsight("Could not get AI insight at this time.");
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Calculator className="h-7 w-7 text-primary" />
          AI Trade Planner
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Calculate position size, risk, and get AI-powered insights before you trade</p>
      </div>

      {/* Account Selection */}
      <Card className="glow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={selectedFirmId} onValueChange={setSelectedFirmId}>
            <SelectTrigger>
              <SelectValue placeholder="Select trading account" />
            </SelectTrigger>
            <SelectContent>
              {propFirms.map(f => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name} — ${((f.balance || 0) + (f.current_profit || 0)).toFixed(0)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedFirm && (
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>Balance: <span className="font-mono text-foreground">${(selectedFirm.balance || 0).toFixed(2)}</span></span>
              <span>Equity: <span className="font-mono text-primary">${accountEquity.toFixed(2)}</span></span>
              <Badge variant="outline" className="text-xs">{selectedFirm.account_type}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trade Setup */}
      <Card className="glow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Trade Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Pair</Label>
              <Select value={pair} onValueChange={setPair}>
                <SelectTrigger><SelectValue placeholder="Select pair" /></SelectTrigger>
                <SelectContent>
                  {COMMON_PAIRS.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Direction</Label>
              <div className="flex gap-2">
                <Button size="sm" variant={direction === "buy" ? "default" : "outline"} className="flex-1" onClick={() => setDirection("buy")}>Buy</Button>
                <Button size="sm" variant={direction === "sell" ? "default" : "outline"} className="flex-1" onClick={() => setDirection("sell")}>Sell</Button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Entry Price</Label>
              <Input type="number" step="any" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} placeholder="1.08500" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Stop Loss</Label>
              <Input type="number" step="any" value={stopLoss} onChange={e => setStopLoss(e.target.value)} placeholder="1.08200" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Take Profit</Label>
              <Input type="number" step="any" value={takeProfit} onChange={e => setTakeProfit(e.target.value)} placeholder="1.09100" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Risk Per Trade</Label>
            <div className="flex gap-2 items-center">
              <div className="flex border border-input rounded-md overflow-hidden h-9">
                <button
                  type="button"
                  className={`px-2.5 text-xs font-medium transition-colors ${riskMode === "percent" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                  onClick={() => setRiskMode("percent")}
                >%</button>
                <button
                  type="button"
                  className={`px-2.5 text-xs font-medium transition-colors ${riskMode === "dollar" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                  onClick={() => setRiskMode("dollar")}
                >$</button>
              </div>
              {riskMode === "percent" ? (
                <Input type="number" step="0.1" min="0.1" max="5" value={riskPercent} onChange={e => setRiskPercent(e.target.value)} className="w-24" />
              ) : (
                <Input type="number" step="1" min="1" value={riskDollars} onChange={e => setRiskDollars(e.target.value)} className="w-24" />
              )}
              <div className="flex gap-1">
                {riskMode === "percent" ? (
                  [0.5, 1, 1.5, 2].map(v => (
                    <Badge key={v} variant={riskPercent === String(v) ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => setRiskPercent(String(v))}>
                      {v}%
                    </Badge>
                  ))
                ) : (
                  [10, 25, 50, 100].map(v => (
                    <Badge key={v} variant={riskDollars === String(v) ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => setRiskDollars(String(v))}>
                      ${v}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </div>
          <Button onClick={calculate} className="w-full gap-2">
            <Calculator className="h-4 w-4" /> Calculate
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card className="glow-card border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Trade Plan Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Position Size</p>
                <p className="text-lg font-bold font-mono text-primary">{result.positionSize}</p>
                <p className="text-xs text-muted-foreground">lots</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Risk Amount</p>
                <p className="text-lg font-bold font-mono text-red-500">${result.riskAmount.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{riskMode === "percent" ? `${riskPercent}%` : `$${riskDollars}`} of equity</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">R:R Ratio</p>
                <p className="text-lg font-bold font-mono">1:{result.rrRatio.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">{result.slPips.toFixed(1)} / {result.tpPips.toFixed(1)} pips</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Potential Profit</p>
                <p className="text-lg font-bold font-mono text-green-500">${result.potentialProfit.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">if TP hit</p>
              </div>
            </div>

            <Separator />

            {/* Compliance */}
            <div className={`flex items-start gap-2 p-3 rounded-lg ${
              result.compliance.withinDailyLoss && result.compliance.withinMaxDrawdown
                ? "bg-green-500/10 border border-green-500/20"
                : "bg-amber-500/10 border border-amber-500/20"
            }`}>
              {result.compliance.withinDailyLoss && result.compliance.withinMaxDrawdown ? (
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              )}
              <p className="text-sm">{result.compliance.message}</p>
            </div>

            {/* AI Insight */}
            <Button variant="outline" onClick={getAIInsight} disabled={loadingAI} className="w-full gap-2">
              {loadingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
              Get AI Insight
            </Button>

            {aiInsight && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-primary font-bold text-sm">YUNIX</span>
                  <span className="text-xs text-muted-foreground">says:</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{aiInsight}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
