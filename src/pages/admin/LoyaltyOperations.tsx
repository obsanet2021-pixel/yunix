import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Lock, Unlock, RotateCcw, Eye, Trophy, Users, Gift, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface LoyaltyUser {
  id: string;
  user_id: string;
  completed_orders: number;
  current_cycle: number;
  discount_status: string;
  discount_unlocked_at: string | null;
  admin_locked: boolean;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    name: string | null;
    email: string | null;
  };
}

export default function LoyaltyOperations() {
  const { toast } = useToast();
  const [users, setUsers] = useState<LoyaltyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<LoyaltyUser | null>(null);
  const [actionDialog, setActionDialog] = useState<{ type: "lock" | "unlock" | "reset" | "view"; user: LoyaltyUser } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("loyalty_progress")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles separately for each user
      const usersWithProfiles = await Promise.all(
        (data || []).map(async (item) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("name, email")
            .eq("id", item.user_id)
            .maybeSingle();
          return { ...item, profile };
        })
      );

      setUsers(usersWithProfiles);
    } catch (error) {
      console.error("Error loading loyalty users:", error);
      toast({ title: "Error", description: "Failed to load loyalty data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!actionDialog || !actionReason.trim()) {
      toast({ title: "Error", description: "Please provide a reason for this action.", variant: "destructive" });
      return;
    }

    setActionLoading(true);
    try {
      const { type, user } = actionDialog;
      let updateData: Record<string, unknown> = {};
      let actionType = "";

      switch (type) {
        case "lock":
          updateData = { admin_locked: true, admin_notes: actionReason };
          actionType = "loyalty_lock";
          break;
        case "unlock":
          updateData = { admin_locked: false, admin_notes: actionReason };
          actionType = "loyalty_unlock";
          break;
        case "reset":
          updateData = { 
            completed_orders: 0, 
            discount_status: "locked",
            discount_unlocked_at: null,
            current_cycle: user.current_cycle + 1,
            admin_notes: actionReason 
          };
          actionType = "loyalty_reset";
          break;
      }

      const { error } = await supabase
        .from("loyalty_progress")
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      if (error) throw error;

      // Log the action
      await supabase.rpc("log_admin_action", {
        _action_type: actionType,
        _target_table: "loyalty_progress",
        _target_id: user.id,
        _old_value: JSON.stringify({ completed_orders: user.completed_orders, admin_locked: user.admin_locked }),
        _new_value: JSON.stringify(updateData),
        _reason: actionReason
      });

      toast({ title: "Success! ✅", description: `Action completed successfully.` });
      setActionDialog(null);
      setActionReason("");
      loadUsers();
    } catch (error) {
      console.error("Error performing action:", error);
      toast({ title: "Error", description: "Failed to perform action.", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string, locked: boolean) => {
    if (locked) return <Badge variant="destructive"><Lock className="h-3 w-3 mr-1" />Locked</Badge>;
    switch (status) {
      case "unlocked": return <Badge className="bg-green-500"><Gift className="h-3 w-3 mr-1" />Unlocked</Badge>;
      case "used": return <Badge variant="secondary">Used</Badge>;
      default: return <Badge variant="outline">Locked</Badge>;
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.profile?.name?.toLowerCase().includes(search.toLowerCase()) ||
      user.profile?.email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "unlocked" && user.discount_status === "unlocked") ||
      (statusFilter === "locked" && user.admin_locked);
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: users.length,
    unlocked: users.filter(u => u.discount_status === "unlocked").length,
    locked: users.filter(u => u.admin_locked).length,
    used: users.filter(u => u.discount_status === "used").length
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
            <Trophy className="h-8 w-8 text-yellow-500" />
            Loyalty Operations
          </h1>
          <p className="text-muted-foreground mt-1">Manage user loyalty progress and discounts</p>
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
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Gift className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.unlocked}</p>
                <p className="text-sm text-muted-foreground">Discounts Ready</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Lock className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{stats.locked}</p>
                <p className="text-sm text-muted-foreground">Admin Locked</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Trophy className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{stats.used}</p>
                <p className="text-sm text-muted-foreground">Rewards Used</p>
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
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                onClick={() => setStatusFilter("all")}
              >
                All
              </Button>
              <Button
                variant={statusFilter === "unlocked" ? "default" : "outline"}
                onClick={() => setStatusFilter("unlocked")}
              >
                Unlocked
              </Button>
              <Button
                variant={statusFilter === "locked" ? "default" : "outline"}
                onClick={() => setStatusFilter("locked")}
              >
                Locked
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Loyalty Progress</CardTitle>
          <CardDescription>View and manage loyalty program participants</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Cycle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No loyalty records found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.profile?.name || "Unknown"}</p>
                        <p className="text-sm text-muted-foreground">{user.profile?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono">{user.completed_orders} / 9</span>
                    </TableCell>
                    <TableCell>Cycle {user.current_cycle}</TableCell>
                    <TableCell>{getStatusBadge(user.discount_status, user.admin_locked)}</TableCell>
                    <TableCell>{format(new Date(user.updated_at), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setActionDialog({ type: "view", user })}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {user.admin_locked ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setActionDialog({ type: "unlock", user })}
                          >
                            <Unlock className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setActionDialog({ type: "lock", user })}
                          >
                            <Lock className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setActionDialog({ type: "reset", user })}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
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
              {actionDialog?.type === "lock" && <><Lock className="h-5 w-5" /> Lock Loyalty Progress</>}
              {actionDialog?.type === "unlock" && <><Unlock className="h-5 w-5" /> Unlock Loyalty Progress</>}
              {actionDialog?.type === "reset" && <><RotateCcw className="h-5 w-5" /> Reset Loyalty Cycle</>}
            </DialogTitle>
            <DialogDescription>
              {actionDialog?.type === "lock" && "This will prevent the user from earning or using loyalty rewards."}
              {actionDialog?.type === "unlock" && "This will allow the user to continue earning loyalty rewards."}
              {actionDialog?.type === "reset" && "This will reset the user's progress to 0 and start a new cycle."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-medium">{actionDialog?.user.profile?.name}</p>
              <p className="text-sm text-muted-foreground">{actionDialog?.user.profile?.email}</p>
              <p className="text-sm mt-2">Current Progress: {actionDialog?.user.completed_orders} / 9</p>
            </div>
            <div className="space-y-2">
              <Label>Reason (required)</Label>
              <Textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Enter reason for this action..."
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
            <DialogTitle>Loyalty Details</DialogTitle>
          </DialogHeader>
          {actionDialog?.user && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">User</Label>
                  <p className="font-medium">{actionDialog.user.profile?.name}</p>
                  <p className="text-sm text-muted-foreground">{actionDialog.user.profile?.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(actionDialog.user.discount_status, actionDialog.user.admin_locked)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Completed Orders</Label>
                  <p className="font-medium">{actionDialog.user.completed_orders} / 9</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Current Cycle</Label>
                  <p className="font-medium">{actionDialog.user.current_cycle}</p>
                </div>
                {actionDialog.user.discount_unlocked_at && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Discount Unlocked</Label>
                    <p className="font-medium">{format(new Date(actionDialog.user.discount_unlocked_at), "PPpp")}</p>
                  </div>
                )}
                {actionDialog.user.admin_notes && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Admin Notes</Label>
                    <p className="p-2 rounded bg-muted/50 text-sm">{actionDialog.user.admin_notes}</p>
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