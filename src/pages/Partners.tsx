import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { Users, Copy, CheckCircle2, Gift, AlertTriangle, Link2, TrendingUp, UserPlus, ShoppingCart } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface ReferralLink {
  id: string;
  code: string;
  total_signups: number;
  qualified_referrals: number;
  is_active: boolean;
  banned_at: string | null;
}

interface PartnerReward {
  id: string;
  status: string;
  discount_percentage: number;
  discount_cap: number;
  approved_at: string | null;
  used_at: string | null;
}

export default function Partners() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isEnabled, loading: featureLoading } = useFeatureToggles();
  const [referralLink, setReferralLink] = useState<ReferralLink | null>(null);
  const [reward, setReward] = useState<PartnerReward | null>(null);
  const [rules, setRules] = useState<Record<string, number | boolean>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load referral link
      const { data: linkData } = await supabase
        .from("referral_links")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (linkData) {
        setReferralLink(linkData);
      }

      // Load partner reward
      const { data: rewardData } = await supabase
        .from("partner_rewards")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (rewardData) {
        setReward(rewardData);
      }

      // Load discount rules
      const { data: rulesData } = await supabase
        .from("discount_rules")
        .select("key, value");

      if (rulesData) {
        const rulesMap: Record<string, number | boolean> = {};
        rulesData.forEach((rule: { key: string; value: { value: number | boolean } }) => {
          rulesMap[rule.key] = rule.value.value;
        });
        setRules(rulesMap);
      }
    } catch (error) {
      console.error("Error loading partner data:", error);
    } finally {
      setLoading(false);
    }
  };

  const createReferralLink = async () => {
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Generate unique code
      const { data: codeData } = await supabase.rpc("generate_referral_code");
      const code = codeData || `REF${Date.now().toString(36).toUpperCase()}`;

      const { data, error } = await supabase
        .from("referral_links")
        .insert({ user_id: user.id, code })
        .select()
        .single();

      if (error) throw error;

      setReferralLink(data);
      toast({ title: "Success! 🎉", description: "Your referral link has been created." });
    } catch (error) {
      console.error("Error creating referral link:", error);
      toast({ title: "Error", description: "Failed to create referral link.", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const copyLink = () => {
    if (!referralLink) return;
    const link = `${window.location.origin}/auth?ref=${referralLink.code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast({ title: "Copied! 📋", description: "Referral link copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  const threshold = (rules.affiliate_conversion_threshold as number) || 3;
  const discountPercent = (rules.affiliate_percentage_tier1 as number) || 60;
  const cap = (rules.affiliate_cap as number) || 25;
  const qualifiedCount = referralLink?.qualified_referrals || 0;
  const progressPercent = Math.min((qualifiedCount / threshold) * 100, 100);

  const getRewardStatus = () => {
    if (!reward) return { label: "Not Started", variant: "secondary" as const };
    switch (reward.status) {
      case "approved": return { label: "Reward Ready!", variant: "default" as const };
      case "used": return { label: "Reward Used", variant: "secondary" as const };
      case "under_review": return { label: "Under Review", variant: "outline" as const };
      case "eligible": return { label: "Eligible", variant: "default" as const };
      case "revoked": return { label: "Revoked", variant: "destructive" as const };
      default: return { label: "Not Eligible", variant: "secondary" as const };
    }
  };

  if (loading || featureLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Feature disabled - show message
  if (!isEnabled('partner_program')) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Feature Temporarily Unavailable</h2>
            <p className="text-muted-foreground text-center max-w-md">
              The Partner Program is currently disabled. Please check back later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isBanned = referralLink?.banned_at != null;
  const rewardStatus = getRewardStatus();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 mb-4">
          <Users className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">
          Partner Program
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Grow With YUNIX. Earn Through Value. 🤝
        </p>
      </div>

      {/* Banned Notice */}
      {isBanned && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <div>
              <p className="font-semibold text-destructive">Referral Privileges Suspended</p>
              <p className="text-sm text-muted-foreground">
                {referralLink?.banned_at ? `Reason: ${referralLink.banned_at}` : "Contact support for more information."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Referral Link Card */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Link2 className="h-6 w-6 text-blue-500" />
            Your Referral Link
            <Badge variant={rewardStatus.variant} className="ml-auto">
              {rewardStatus.label}
            </Badge>
          </CardTitle>
          <CardDescription>
            Share your unique link and earn rewards when traders join and order
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!referralLink ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-4">
                Generate your unique referral link to start earning rewards
              </p>
              <Button onClick={createReferralLink} disabled={creating} size="lg">
                {creating ? "Creating..." : "Generate My Referral Link"}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 rounded-lg bg-muted/50 border font-mono text-sm truncate">
                  {window.location.origin}/auth?ref={referralLink.code}
                </div>
                <Button onClick={copyLink} variant="outline" className="shrink-0">
                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <UserPlus className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{referralLink.total_signups}</p>
                  <p className="text-sm text-muted-foreground">Total Sign-ups</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <ShoppingCart className="h-6 w-6 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{qualifiedCount}</p>
                  <p className="text-sm text-muted-foreground">Qualified Referrals</p>
                </div>
              </div>

              {/* Progress to Reward */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>Progress to Reward</span>
                  <span className="text-primary">{qualifiedCount} / {threshold} qualified</span>
                </div>
                <Progress value={progressPercent} className="h-4" />
              </div>

              {reward?.status === "approved" && (
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
                  <Gift className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="font-semibold text-green-600 dark:text-green-400">
                    You've earned {discountPercent}% off your next order!
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Maximum discount: ${cap}. Applied automatically at checkout.
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            How Referrals Work
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-4">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <span className="text-2xl">🔗</span>
              </div>
              <h3 className="font-semibold">1. Share Link</h3>
              <p className="text-sm text-muted-foreground">
                Copy and share your unique referral link
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <span className="text-2xl">👤</span>
              </div>
              <h3 className="font-semibold">2. They Sign Up</h3>
              <p className="text-sm text-muted-foreground">
                Traders create an account using your link
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <span className="text-2xl">📦</span>
              </div>
              <h3 className="font-semibold">3. They Order</h3>
              <p className="text-sm text-muted-foreground">
                When they complete a paid order, it counts
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <span className="text-2xl">🎉</span>
              </div>
              <h3 className="font-semibold">4. You Earn</h3>
              <p className="text-sm text-muted-foreground">
                Get {discountPercent}% off after {threshold} qualified referrals
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What Counts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            What Counts as Qualified
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span>Signed up via your link</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span>Placed a paid order</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span>Order was approved</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span>Not a duplicate account</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Anti-Fraud Notice */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="flex items-start gap-4 py-4">
          <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-600 dark:text-amber-400">Fair Use Policy</p>
            <p className="text-sm text-muted-foreground mt-1">
              We monitor for fraudulent activity including fake accounts, duplicate signups, 
              and suspicious patterns. Abuse of the referral program may result in revoked 
              rewards and permanent ban from the partner program.
            </p>
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
              <AccordionTrigger>How long until my reward is approved?</AccordionTrigger>
              <AccordionContent>
                Once you reach {threshold} qualified referrals, your reward goes under review. 
                Our team verifies the referrals are legitimate within 2-3 business days.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>Can I combine partner rewards with loyalty discounts?</AccordionTrigger>
              <AccordionContent>
                No, discounts cannot be stacked. Only one discount applies per order. 
                You can choose which discount to use if you have multiple available.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>What if my referral requests a refund?</AccordionTrigger>
              <AccordionContent>
                If a referred user's order is refunded, it no longer counts as a qualified 
                referral and will be deducted from your count.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}