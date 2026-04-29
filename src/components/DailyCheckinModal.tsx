import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sun, Brain, Target, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { buildCheckinContext } from "@/lib/traderContext";

const MOODS = [
  { value: "calm", label: "Calm", emoji: "😌" },
  { value: "confident", label: "Confident", emoji: "💪" },
  { value: "excited", label: "Excited", emoji: "🔥" },
  { value: "anxious", label: "Anxious", emoji: "😰" },
  { value: "frustrated", label: "Frustrated", emoji: "😤" },
  { value: "neutral", label: "Neutral", emoji: "😐" },
];

const SLEEP_OPTIONS = [
  { value: "excellent", label: "Excellent", emoji: "😴" },
  { value: "good", label: "Good", emoji: "🙂" },
  { value: "fair", label: "Fair", emoji: "😕" },
  { value: "poor", label: "Poor", emoji: "😵" },
];

const COMMON_PAIRS = ["EURUSD", "GBPUSD", "USDJPY", "GBPJPY", "EURJPY", "XAUUSD", "AUDUSD", "USDCAD", "NZDUSD", "USDCHF"];

interface DailyCheckinModalProps {
  open: boolean;
  onClose: () => void;
}

export default function DailyCheckinModal({ open, onClose }: DailyCheckinModalProps) {
  const [step, setStep] = useState(0);
  const [mood, setMood] = useState("");
  const [confidence, setConfidence] = useState(5);
  const [stress, setStress] = useState(3);
  const [sleepQuality, setSleepQuality] = useState("");
  const [tradingPlan, setTradingPlan] = useState("");
  const [plannedPairs, setPlannedPairs] = useState<string[]>([]);
  const [dailyRiskLimit, setDailyRiskLimit] = useState(2);
  const [maxTrades, setMaxTrades] = useState(3);
  const [saving, setSaving] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const { toast } = useToast();

  const totalSteps = 4;

  const togglePair = (pair: string) => {
    setPlannedPairs(prev =>
      prev.includes(pair) ? prev.filter(p => p !== pair) : [...prev, pair]
    );
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("CHECKIN_INSERT_ERROR", { error: "No authenticated user" });
        throw new Error("User not authenticated");
      }

      // Validate required fields
      if (!mood || !sleepQuality) {
        console.error("CHECKIN_INSERT_ERROR", { error: "Missing required fields", payload: { mood, sleepQuality } });
        toast({ title: "Validation Error", description: "Please complete all required fields", variant: "destructive" });
        return;
      }

      // Prevent duplicate check-ins
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: existing } = await supabase
        .from("daily_checkins")
        .select("id")
        .eq("user_id", user.id)
        .gte("created_at", today.toISOString())
        .maybeSingle();

      if (existing) {
        toast({ title: "Already checked in today!", description: "Come back tomorrow.", variant: "destructive" });
        onClose();
        return;
      }

      // Insert check-in data first (without AI response)
      const { data: insertData, error: insertError } = await supabase.from("daily_checkins").insert({
        user_id: user.id,
        mood,
        confidence_level: confidence,
        stress_level: stress,
        sleep_quality: sleepQuality,
        trading_plan: tradingPlan,
        planned_pairs: plannedPairs,
        daily_risk_limit: dailyRiskLimit,
        max_trades: maxTrades,
        ai_response: null, // Will be updated asynchronously
      }).select().single();

      if (insertError) {
        console.error("CHECKIN_INSERT_ERROR", { error: insertError, payload: { user_id: user.id, mood, sleepQuality } });
        throw insertError;
      }

      // Show success immediately
      toast({ title: "Check-in saved! ✅", description: "Have a great trading day!" });

      // Generate AI response asynchronously (non-blocking)
      try {
        // Build context from recent trades
        const traderContext = await buildCheckinContext(user.id);

        const res = await supabase.functions.invoke("daily-checkin-ai", {
          body: {
            mood,
            confidence_level: confidence,
            stress_level: stress,
            sleep_quality: sleepQuality,
            trading_plan: tradingPlan,
            planned_pairs: plannedPairs,
            daily_risk_limit: dailyRiskLimit,
            max_trades: maxTrades,
            yesterday_pnl: traderContext.includes('YESTERDAY') ? 0 : undefined, // Let AI handle if not in context
            recent_trades_summary: traderContext.includes('RECENT TRADES') ? traderContext.split('RECENT TRADES:')[1] : undefined,
          }
        });

        const aiMsg = res.data?.message || "";

        // Update record with AI response if we got one
        if (aiMsg && insertData?.id) {
          await supabase.from("daily_checkins").update({ ai_response: aiMsg }).eq("id", insertData.id);
        }

        // Always show the final step, with fallback message
        setAiResponse(aiMsg || "Great mindset! Stay disciplined, follow your plan, and trust your process today. 🚀");
        setStep(totalSteps);
      } catch (aiError) {
        console.error("AI_GENERATION_ERROR", { error: aiError, inputData: { mood, confidence, stress, sleepQuality } });
        // Show final step with fallback instead of closing
        setAiResponse("Great mindset! Stay disciplined, follow your plan, and trust your process today. 🚀");
        setStep(totalSteps);
      }
    } catch (error) {
      console.error("CHECKIN_INSERT_ERROR", { error });
      toast({ title: "Error", description: "Could not save check-in", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <Sun className="h-8 w-8 text-primary mx-auto" />
              <h3 className="text-lg font-semibold">How are you feeling today?</h3>
              <p className="text-sm text-muted-foreground">Your mindset affects your trading</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MOODS.map(m => (
                <Button
                  key={m.value}
                  variant={mood === m.value ? "default" : "outline"}
                  className="h-auto py-3 flex flex-col gap-1"
                  onClick={() => setMood(m.value)}
                >
                  <span className="text-xl">{m.emoji}</span>
                  <span className="text-xs">{m.label}</span>
                </Button>
              ))}
            </div>
            <div className="space-y-3">
              <Label className="text-sm">Sleep Quality</Label>
              <div className="grid grid-cols-4 gap-2">
                {SLEEP_OPTIONS.map(s => (
                  <Button
                    key={s.value}
                    variant={sleepQuality === s.value ? "default" : "outline"}
                    size="sm"
                    className="h-auto py-2 flex flex-col gap-0.5"
                    onClick={() => setSleepQuality(s.value)}
                  >
                    <span>{s.emoji}</span>
                    <span className="text-xs">{s.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-5">
            <div className="text-center space-y-2">
              <Brain className="h-8 w-8 text-primary mx-auto" />
              <h3 className="text-lg font-semibold">Mental State</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm">Confidence Level</Label>
                  <span className="text-sm font-mono text-primary">{confidence}/10</span>
                </div>
                <Slider value={[confidence]} onValueChange={([v]) => setConfidence(v)} min={1} max={10} step={1} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm">Stress Level</Label>
                  <span className="text-sm font-mono text-primary">{stress}/10</span>
                </div>
                <Slider value={[stress]} onValueChange={([v]) => setStress(v)} min={1} max={10} step={1} />
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <Target className="h-8 w-8 text-primary mx-auto" />
              <h3 className="text-lg font-semibold">Today's Trading Plan</h3>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">What's your plan?</Label>
              <Textarea
                value={tradingPlan}
                onChange={(e) => setTradingPlan(e.target.value)}
                placeholder="e.g., Focus on London session setups, wait for clean breaks of structure..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Pairs to watch</Label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_PAIRS.map(pair => (
                  <Badge
                    key={pair}
                    variant={plannedPairs.includes(pair) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => togglePair(pair)}
                  >
                    {pair}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-5">
            <div className="text-center space-y-2">
              <Target className="h-8 w-8 text-primary mx-auto" />
              <h3 className="text-lg font-semibold">Risk Management</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm">Daily Risk Limit</Label>
                  <span className="text-sm font-mono text-primary">{dailyRiskLimit}%</span>
                </div>
                <Slider value={[dailyRiskLimit]} onValueChange={([v]) => setDailyRiskLimit(v)} min={0.5} max={5} step={0.5} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm">Max Trades Today</Label>
                  <span className="text-sm font-mono text-primary">{maxTrades}</span>
                </div>
                <Slider value={[maxTrades]} onValueChange={([v]) => setMaxTrades(v)} min={1} max={10} step={1} />
              </div>
            </div>
          </div>
        );
      case totalSteps:
        return (
          <div className="space-y-4 text-center">
            <Sparkles className="h-10 w-10 text-primary mx-auto" />
            <h3 className="text-lg font-semibold">YUNIX Says</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{aiResponse}</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-primary font-bold">YUNIX</span>
            <span className="text-muted-foreground font-normal">Daily Check-in</span>
          </DialogTitle>
        </DialogHeader>

        {/* Progress dots */}
        {step < totalSteps && (
          <div className="flex justify-center gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className={`h-1.5 w-8 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
        )}

        {renderStep()}

        <div className="flex justify-between pt-2">
          {step > 0 && step < totalSteps ? (
            <Button variant="ghost" size="sm" onClick={() => setStep(s => s - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          ) : <div />}

          {step < totalSteps - 1 && (
            <Button size="sm" onClick={() => setStep(s => s + 1)} disabled={step === 0 && !mood}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}

          {step === totalSteps - 1 && (
            <Button size="sm" onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving..." : "Complete Check-in ✅"}
            </Button>
          )}

          {step === totalSteps && (
            <Button size="sm" onClick={onClose} className="ml-auto">
              Start Trading 🚀
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
