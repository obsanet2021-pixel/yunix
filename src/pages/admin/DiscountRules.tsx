import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Settings, Trophy, Users, Shield, Save, AlertTriangle, History, Download, Gift } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { DiscountCodesControl } from "@/components/admin/DiscountCodesControl";

interface DiscountRule {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  updated_at: string;
}

interface AuditLog {
  id: string;
  admin_email: string | null;
  action_type: string;
  target_table: string;
  old_value: unknown;
  new_value: unknown;
  reason: string;
  created_at: string;
}

export default function DiscountRules() {
  const { toast } = useToast();
  const [rules, setRules] = useState<DiscountRule[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    loyalty_percentage: 50,
    loyalty_cap: 25,
    loyalty_threshold: 9,
    affiliate_percentage_tier1: 60,
    affiliate_percentage_tier2: 65,
    affiliate_cap: 25,
    affiliate_conversion_threshold: 3,
    stack_prevention_enabled: true,
    first_order_discount_percentage: 50,
    first_order_discount_enabled: true,
    sixth_order_free: true,
    sixth_order_threshold: 6
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: rulesData, error } = await supabase
        .from("discount_rules")
        .select("*")
        .order("key");

      if (error) throw error;

      setRules(rulesData || []);

      // Populate form with current values
      const newFormData = { ...formData };
      rulesData?.forEach(rule => {
        if (rule.key in newFormData) {
          const val = rule.value as { value: number | boolean } | null;
          if (val?.value !== undefined) {
            (newFormData as Record<string, number | boolean>)[rule.key] = val.value;
          }
        }
      });
      setFormData(newFormData);

      // Load audit logs
      const { data: logsData } = await supabase
        .from("admin_audit_logs")
        .select("*")
        .eq("target_table", "discount_rules")
        .order("created_at", { ascending: false })
        .limit(20);

      setAuditLogs(logsData || []);
    } catch (error) {
      console.error("Error loading discount rules:", error);
      toast({ title: "Error", description: "Failed to load discount rules.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update each rule
      for (const [key, value] of Object.entries(formData)) {
        const existingRule = rules.find(r => r.key === key);
        
        if (existingRule) {
          await supabase
            .from("discount_rules")
            .update({ 
              value: { value }, 
              updated_at: new Date().toISOString() 
            })
            .eq("key", key);
        }
      }

      // Log the action
      await supabase.rpc("log_admin_action", {
        _action_type: "discount_rules_update",
        _target_table: "discount_rules",
        _target_id: null,
        _old_value: JSON.stringify(rules.reduce((acc, r) => {
          const val = r.value as { value: unknown } | null;
          return { ...acc, [r.key]: val?.value };
        }, {})),
        _new_value: JSON.stringify(formData),
        _reason: "Discount rules configuration updated"
      });

      toast({ title: "Saved! ✅", description: "Discount rules updated successfully." });
      loadData();
    } catch (error) {
      console.error("Error saving rules:", error);
      toast({ title: "Error", description: "Failed to save rules.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const exportToCSV = () => {
    if (auditLogs.length === 0) {
      toast({ title: "No data", description: "No audit logs to export.", variant: "destructive" });
      return;
    }

    const headers = ["Date", "Admin", "Action", "Reason", "Old Value", "New Value"];
    const rows = auditLogs.map(log => [
      format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss"),
      log.admin_email || "System",
      log.action_type,
      log.reason,
      JSON.stringify(log.old_value),
      JSON.stringify(log.new_value)
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({ title: "Exported! 📥", description: "Audit logs downloaded as CSV." });
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
            <Settings className="h-8 w-8 text-primary" />
            Discount Rules
          </h1>
          <p className="text-muted-foreground mt-1">Configure global discount settings (CEO only)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowLogs(!showLogs)}>
            <History className="h-4 w-4 mr-2" />
            {showLogs ? "Hide" : "Show"} History
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="loyalty">
        <TabsList>
          <TabsTrigger value="loyalty">Loyalty Program</TabsTrigger>
          <TabsTrigger value="partners">Partner Program</TabsTrigger>
          <TabsTrigger value="codes">Discount Codes</TabsTrigger>
        </TabsList>

        <TabsContent value="loyalty" className="space-y-6 mt-6">
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="flex items-center gap-4 py-4">
              <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0" />
              <div>
                <p className="font-semibold text-amber-600 dark:text-amber-400">Changes Affect All Future Rewards</p>
                <p className="text-sm text-muted-foreground">
                  Modifying these settings will apply to all new orders and rewards. Existing unlocked rewards are not affected.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Loyalty Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Loyalty Program Settings
                </CardTitle>
                <CardDescription>Configure the loyalty reward program</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Discount Percentage</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={formData.loyalty_percentage}
                      onChange={(e) => setFormData({ ...formData, loyalty_percentage: parseInt(e.target.value) || 0 })}
                      className="w-24"
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Discount applied on qualifying order</p>
                </div>

                <div className="space-y-2">
                  <Label>Maximum Discount Cap</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">$</span>
                    <Input
                      type="number"
                      min={1}
                      max={1000}
                      value={formData.loyalty_cap}
                      onChange={(e) => setFormData({ ...formData, loyalty_cap: parseInt(e.target.value) || 0 })}
                      className="w-24"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">Maximum discount amount in USD</p>
                </div>

                <div className="space-y-2">
                  <Label>Orders Required</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={formData.loyalty_threshold}
                      onChange={(e) => setFormData({ ...formData, loyalty_threshold: parseInt(e.target.value) || 0 })}
                      className="w-24"
                    />
                    <span className="text-muted-foreground">orders before discount</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Number of completed orders to unlock reward</p>
                </div>

                {/* New tiered settings */}
                <div className="pt-4 border-t space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Gift className="h-4 w-4 text-green-500" />
                    Special Discounts
                  </h4>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">First Order Discount</p>
                      <p className="text-sm text-muted-foreground">Apply {formData.first_order_discount_percentage}% discount on first order</p>
                    </div>
                    <Switch
                      checked={formData.first_order_discount_enabled}
                      onCheckedChange={(checked) => setFormData({ ...formData, first_order_discount_enabled: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">6th Order Free</p>
                      <p className="text-sm text-muted-foreground">Make the 6th order completely free</p>
                    </div>
                    <Switch
                      checked={formData.sixth_order_free}
                      onCheckedChange={(checked) => setFormData({ ...formData, sixth_order_free: checked })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-500" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">Stack Prevention</p>
                    <p className="text-sm text-muted-foreground">
                      Prevent users from combining multiple discounts on a single order
                    </p>
                  </div>
                  <Switch
                    checked={formData.stack_prevention_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, stack_prevention_enabled: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="partners" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Partner Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  Partner Program Settings
                </CardTitle>
                <CardDescription>Configure the referral/affiliate program</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Tier 1 Discount</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={formData.affiliate_percentage_tier1}
                      onChange={(e) => setFormData({ ...formData, affiliate_percentage_tier1: parseInt(e.target.value) || 0 })}
                      className="w-24"
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Standard affiliate discount</p>
                </div>

                <div className="space-y-2">
                  <Label>Tier 2 Discount</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={formData.affiliate_percentage_tier2}
                      onChange={(e) => setFormData({ ...formData, affiliate_percentage_tier2: parseInt(e.target.value) || 0 })}
                      className="w-24"
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Premium affiliate discount</p>
                </div>

                <div className="space-y-2">
                  <Label>Maximum Discount Cap</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">$</span>
                    <Input
                      type="number"
                      min={1}
                      max={1000}
                      value={formData.affiliate_cap}
                      onChange={(e) => setFormData({ ...formData, affiliate_cap: parseInt(e.target.value) || 0 })}
                      className="w-24"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Qualified Referrals Required</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={formData.affiliate_conversion_threshold}
                      onChange={(e) => setFormData({ ...formData, affiliate_conversion_threshold: parseInt(e.target.value) || 0 })}
                      className="w-24"
                    />
                    <span className="text-muted-foreground">referrals</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Internal threshold (not shown to users)</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="codes" className="mt-6">
          <DiscountCodesControl />
        </TabsContent>
      </Tabs>

      {/* Audit Logs */}
      {showLogs && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Change History
              </CardTitle>
              <CardDescription>Recent changes to discount rules</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={exportToCSV} disabled={auditLogs.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No changes recorded
                    </TableCell>
                  </TableRow>
                ) : (
                  auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{format(new Date(log.created_at), "MMM d, yyyy HH:mm")}</TableCell>
                      <TableCell>{log.admin_email || "System"}</TableCell>
                      <TableCell>{log.action_type}</TableCell>
                      <TableCell className="max-w-xs truncate">{log.reason}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
