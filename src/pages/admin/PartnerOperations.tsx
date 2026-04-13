import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Users, CheckCircle, XCircle, Ban, Eye, Link2, TrendingUp, Gift, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface PartnerUser {
  id: string;
  user_id: string;
  code: string;
  total_signups: number;
  qualified_referrals: number;
  is_active: boolean;
  banned_at: string | null;
  banned_reason: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    name: string | null;
    email: string | null;
  };
  reward?: {
    status: string;
    discount_percentage: number;
    discount_cap: number;
  };
}

export default function PartnerOperations() {
  const { toast } = useToast();
  const [partners, setPartners] = useState<PartnerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionDialog, setActionDialog] = useState<{ type: "approve" | "reject" | "ban" | "view"; partner: PartnerUser } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [discountPercent, setDiscountPercent] = useState("60");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    try {
      const { data, error } = await supabase
        .from("referral_links")
        .select("*")
        .order("qualified_referrals", { ascending: false });

      if (error) throw error;

      // Also fetch rewards
      const { data: rewardsData } = await supabase
        .from("partner_rewards")
        .select("*");

      const rewardsMap = new Map();
      rewardsData?.forEach(r => rewardsMap.set(r.user_id, r));

      // Fetch profiles separately for each partner
      const partnersWithProfiles = await Promise.all(
        (data || []).map(async (item) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("name, email")
            .eq("id", item.user_id)
            .maybeSingle();
          return { 
            ...item, 
            profile,
            reward: rewardsMap.get(item.user_id)
          };
        })
      );

      setPartners(partnersWithProfiles);
    } catch (error) {
      console.error("Error loading partners:", error);
      toast({ title: "Error", description: "Failed to load partner data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!actionDialog || !actionReason.trim()) {
      toast({ title: "Error", description: "Please provide a reason.", variant: "destructive" });
      return;
    }

    setActionLoading(true);
    try {
      const { type, partner } = actionDialog;

      if (type === "approve") {
        // Create or update partner reward
        const rewardData = {
          user_id: partner.user_id,
          status: "approved",
          discount_percentage: parseInt(discountPercent),
          discount_cap: 25,
          approved_at: new Date().toISOString()
        };

        await supabase.from("partner_rewards").upsert(rewardData, { onConflict: "user_id" });
      } else if (type === "reject") {
        await supabase.from("partner_rewards")
          .upsert({ 
            user_id: partner.user_id, 
            status: "revoked",
            revoked_at: new Date().toISOString(),
            revoked_reason: actionReason
          }, { onConflict: "user_id" });
      } else if (type === "ban") {
        await supabase.from("referral_links")
          .update({ 
            is_active: false,
            banned_at: new Date().toISOString(),
            banned_reason: actionReason 
          })
          .eq("id", partner.id);
      }

      // Log the action
      await supabase.rpc("log_admin_action", {
        _action_type: `partner_${type}`,
        _target_table: type === "ban" ? "referral_links" : "partner_rewards",
        _target_id: partner.id,
        _old_value: JSON.stringify({ status: partner.reward?.status }),
        _new_value: JSON.stringify({ action: type, discount: discountPercent }),
        _reason: actionReason
      });

      toast({ title: "Success! ✅", description: `Partner ${type}d successfully.` });
      setActionDialog(null);
      setActionReason("");
      loadPartners();
    } catch (error) {
      console.error("Error performing action:", error);
      toast({ title: "Error", description: "Failed to perform action.", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const getRewardBadge = (partner: PartnerUser) => {
    if (partner.banned_at) return <Badge variant="destructive"><Ban className="h-3 w-3 mr-1" />Banned</Badge>;
    if (!partner.reward) return <Badge variant="outline">No Reward</Badge>;
    switch (partner.reward.status) {
      case "approved": return <Badge className="bg-green-500"><Gift className="h-3 w-3 mr-1" />{partner.reward.discount_percentage}% Ready</Badge>;
      case "used": return <Badge variant="secondary">Used</Badge>;
      case "under_review": return <Badge variant="outline">Under Review</Badge>;
      case "revoked": return <Badge variant="destructive">Revoked</Badge>;
      default: return <Badge variant="outline">Pending</Badge>;
    }
  };

  const getConversionRate = (partner: PartnerUser) => {
    if (partner.total_signups === 0) return "0%";
    return ((partner.qualified_referrals / partner.total_signups) * 100).toFixed(1) + "%";
  };

  const filteredPartners = partners.filter(p => {
    const matchesSearch = 
      p.profile?.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.profile?.email?.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "approved" && p.reward?.status === "approved") ||
      (statusFilter === "pending" && p.qualified_referrals >= 3 && !p.reward) ||
      (statusFilter === "banned" && p.banned_at);
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: partners.length,
    approved: partners.filter(p => p.reward?.status === "approved").length,
    pending: partners.filter(p => p.qualified_referrals >= 3 && !p.reward?.status).length,
    banned: partners.filter(p => p.banned_at).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Link2 className="h-8 w-8 text-blue-500" />
            Partner Operations
          </h1>
          <p className="text-muted-foreground mt-1">Manage referral links and partner rewards</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Partners</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.approved}</p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Ban className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{stats.banned}</p>
                <p className="text-sm text-muted-foreground">Banned</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant={statusFilter === "all" ? "default" : "outline"} onClick={() => setStatusFilter("all")}>All</Button>
              <Button variant={statusFilter === "pending" ? "default" : "outline"} onClick={() => setStatusFilter("pending")}>Pending</Button>
              <Button variant={statusFilter === "approved" ? "default" : "outline"} onClick={() => setStatusFilter("approved")}>Approved</Button>
              <Button variant={statusFilter === "banned" ? "default" : "outline"} onClick={() => setStatusFilter("banned")}>Banned</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Partners Table */}
      <Card>
        <CardHeader>
          <CardTitle>Partner Referrals</CardTitle>
          <CardDescription>Review and manage partner referral performance</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Sign-ups</TableHead>
                <TableHead>Qualified</TableHead>
                <TableHead>Conversion</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPartners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No partners found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPartners.map((partner) => (
                  <TableRow key={partner.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{partner.profile?.name || "Unknown"}</p>
                        <p className="text-sm text-muted-foreground">{partner.profile?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell><code className="text-xs">{partner.code}</code></TableCell>
                    <TableCell>{partner.total_signups}</TableCell>
                    <TableCell>{partner.qualified_referrals}</TableCell>
                    <TableCell>{getConversionRate(partner)}</TableCell>
                    <TableCell>{getRewardBadge(partner)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setActionDialog({ type: "view", partner })}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {partner.qualified_referrals >= 3 && partner.reward?.status !== "approved" && !partner.banned_at && (
                          <Button variant="ghost" size="icon" onClick={() => setActionDialog({ type: "approve", partner })}>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </Button>
                        )}
                        {partner.reward?.status === "approved" && (
                          <Button variant="ghost" size="icon" onClick={() => setActionDialog({ type: "reject", partner })}>
                            <XCircle className="h-4 w-4 text-amber-500" />
                          </Button>
                        )}
                        {!partner.banned_at && (
                          <Button variant="ghost" size="icon" onClick={() => setActionDialog({ type: "ban", partner })}>
                            <Ban className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={!!actionDialog && actionDialog.type !== "view"} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionDialog?.type === "approve" && <><CheckCircle className="h-5 w-5 text-green-500" /> Approve Partner Reward</>}
              {actionDialog?.type === "reject" && <><XCircle className="h-5 w-5 text-amber-500" /> Revoke Partner Reward</>}
              {actionDialog?.type === "ban" && <><Ban className="h-5 w-5 text-destructive" /> Ban Partner</>}
            </DialogTitle>
            <DialogDescription>
              {actionDialog?.type === "approve" && "Grant this partner their referral discount reward."}
              {actionDialog?.type === "reject" && "Revoke this partner's reward. They will need to re-qualify."}
              {actionDialog?.type === "ban" && "Ban this partner from the referral program. This is permanent."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-medium">{actionDialog?.partner.profile?.name}</p>
              <p className="text-sm text-muted-foreground">{actionDialog?.partner.profile?.email}</p>
              <p className="text-sm mt-2">Qualified Referrals: {actionDialog?.partner.qualified_referrals}</p>
            </div>
            {actionDialog?.type === "approve" && (
              <div className="space-y-2">
                <Label>Discount Percentage</Label>
                <Select value={discountPercent} onValueChange={setDiscountPercent}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="60">60%</SelectItem>
                    <SelectItem value="65">65%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Reason (required)</Label>
              <Textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Enter reason..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button onClick={handleAction} disabled={actionLoading || !actionReason.trim()}>
              {actionLoading ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={actionDialog?.type === "view"} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Partner Details</DialogTitle>
          </DialogHeader>
          {actionDialog?.partner && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Partner</Label>
                  <p className="font-medium">{actionDialog.partner.profile?.name}</p>
                  <p className="text-sm text-muted-foreground">{actionDialog.partner.profile?.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Referral Code</Label>
                  <p className="font-mono">{actionDialog.partner.code}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Total Sign-ups</Label>
                  <p className="font-medium">{actionDialog.partner.total_signups}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Qualified Referrals</Label>
                  <p className="font-medium">{actionDialog.partner.qualified_referrals}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Conversion Rate</Label>
                  <p className="font-medium">{getConversionRate(actionDialog.partner)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getRewardBadge(actionDialog.partner)}</div>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Created</Label>
                  <p className="font-medium">{format(new Date(actionDialog.partner.created_at), "PPpp")}</p>
                </div>
                {actionDialog.partner.banned_reason && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Ban Reason</Label>
                    <p className="p-2 rounded bg-destructive/10 text-sm">{actionDialog.partner.banned_reason}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setActionDialog(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}