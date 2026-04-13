import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { Trophy, Gift, CheckCircle2, Clock, Star, Sparkles, AlertTriangle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface LoyaltyProgress {
  id: string;
  completed_orders: number;
  current_cycle: number;
  discount_status: string;
  discount_unlocked_at: string | null;
  admin_locked: boolean;
}

interface DiscountRule {
  key: string;
  value: { value: number | boolean };
}

export default function Loyalty() {
  const navigate = useNavigate();
  const { isEnabled, loading: featureLoading } = useFeatureToggles();
  const [progress, setProgress] = useState<LoyaltyProgress | null>(null);
  const [rules, setRules] = useState<Record<string, number | boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load loyalty progress
      const { data: progressData } = await supabase
        .from("loyalty_progress")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (progressData) {
        setProgress(progressData);
      }

      // Load discount rules
      const { data: rulesData } = await supabase
        .from("discount_rules")
        .select("key, value");

      if (rulesData) {
        const rulesMap: Record<string, number | boolean> = {};
        rulesData.forEach((rule: DiscountRule) => {
          rulesMap[rule.key] = rule.value.value;
        });
        setRules(rulesMap);
      }
    } catch (error) {
      console.error("Error loading loyalty data:", error);
    } finally {
      setLoading(false);
    }
  };

  const threshold = (rules.loyalty_threshold as number) || 9;
  const percentage = (rules.loyalty_percentage as number) || 50;
  const cap = (rules.loyalty_cap as number) || 25;
  const completedOrders = progress?.completed_orders || 0;
  const progressPercent = Math.min((completedOrders / threshold) * 100, 100);
  const discountUnlocked = progress?.discount_status === "unlocked";
  const discountUsed = progress?.discount_status === "used";

  if (loading || featureLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Feature disabled - show message
  if (!isEnabled('loyalty_program')) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Feature Temporarily Unavailable</h2>
            <p className="text-muted-foreground text-center max-w-md">
              The Loyalty Rewards program is currently disabled. Please check back later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 mb-4">
          <Trophy className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-amber-600 bg-clip-text text-transparent">
          Loyalty Rewards
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Rewarding Consistency, Not Luck 🏆
        </p>
      </div>

      {/* Progress Card */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-yellow-500" />
            Your Progress
            {discountUnlocked && (
              <Badge className="bg-green-500 text-white ml-auto">
                🎉 Discount Ready!
              </Badge>
            )}
            {discountUsed && (
              <Badge variant="secondary" className="ml-auto">
                Cycle {progress?.current_cycle || 1} Complete
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Complete {threshold} orders to unlock {percentage}% off your next order
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span>Orders Completed</span>
              <span className="text-primary">{completedOrders} / {threshold}</span>
            </div>
            <Progress value={progressPercent} className="h-4" />
          </div>

          {discountUnlocked ? (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
              <Gift className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="font-semibold text-green-600 dark:text-green-400">
                You've earned {percentage}% off your next order!
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Maximum discount: ${cap}. Applied automatically at checkout.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">
                {threshold - completedOrders} more order{threshold - completedOrders !== 1 ? 's' : ''} to unlock your reward
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <span className="text-2xl">📦</span>
              </div>
              <h3 className="font-semibold">1. Place Orders</h3>
              <p className="text-sm text-muted-foreground">
                Order plaques for your certificate achievements
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="font-semibold">2. Track Progress</h3>
              <p className="text-sm text-muted-foreground">
                Watch your progress bar fill with each approved order
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <span className="text-2xl">🎉</span>
              </div>
              <h3 className="font-semibold">3. Get Rewarded</h3>
              <p className="text-sm text-muted-foreground">
                Earn {percentage}% off after {threshold} orders (max ${cap})
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reward Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Reward Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">{percentage}% Discount</p>
                <p className="text-sm text-muted-foreground">On your {threshold + 1}th order</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Max ${cap} Off</p>
                <p className="text-sm text-muted-foreground">Discount cap applies</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQs */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>What counts as a completed order?</AccordionTrigger>
              <AccordionContent>
                Only paid and approved orders count towards your loyalty progress. 
                Orders that are pending, rejected, or refunded do not count.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>When is my discount applied?</AccordionTrigger>
              <AccordionContent>
                Once you complete {threshold} orders, your {percentage}% discount is 
                automatically applied to your next order at checkout. The discount 
                is capped at ${cap}.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>Can I combine this with other discounts?</AccordionTrigger>
              <AccordionContent>
                No, loyalty discounts cannot be combined with referral discounts, 
                promo codes, or seasonal offers. Only one discount applies per order.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger>What happens after I use my discount?</AccordionTrigger>
              <AccordionContent>
                After using your loyalty discount, your progress resets and a new 
                cycle begins. Complete another {threshold} orders to earn another reward!
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}