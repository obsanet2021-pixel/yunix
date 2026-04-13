import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Package, Clock, CheckCircle, Truck, FileText } from "lucide-react";

interface PlaqueOrder {
  id: string;
  full_name: string;
  size: string;
  delivery_method: string;
  quantity: number;
  status: string;
  invoice_id: string;
  created_at: string;
  certificate: {
    title: string;
  } | null;
  profile: {
    name: string;
    email: string;
  } | null;
}

export function PlaqueOrdersWidget() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<PlaqueOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pending: 0,
    awaiting: 0,
    delivered: 0,
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("plaque_orders")
        .select(`
          id,
          full_name,
          size,
          delivery_method,
          quantity,
          status,
          invoice_id,
          created_at,
          certificate_id,
          user_id
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch certificate and profile data separately
      const ordersWithDetails = await Promise.all(
        (data || []).map(async (order) => {
          const [certResult, profileResult] = await Promise.all([
            supabase.from("certificates").select("title").eq("id", order.certificate_id).maybeSingle(),
            supabase.from("profiles").select("name, email").eq("id", order.user_id).maybeSingle(),
          ]);

          return {
            ...order,
            certificate: certResult.data,
            profile: profileResult.data,
          };
        })
      );

      setOrders(ordersWithDetails);

      // Calculate stats
      const pending = ordersWithDetails.filter((o) => o.status === "Pending").length;
      const awaiting = ordersWithDetails.filter((o) => o.status === "Awaiting Approval").length;
      const delivered = ordersWithDetails.filter((o) => o.status === "Delivered").length;

      setStats({ pending, awaiting, delivered });
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast({
        title: "Error",
        description: "Failed to load plaque orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("plaque_orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Order status changed to ${newStatus}`,
      });

      fetchOrders();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">Pending</Badge>;
      case "Awaiting Approval":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">Awaiting Approval</Badge>;
      case "Delivered":
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">Delivered</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Package className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Awaiting Approval</p>
                <p className="text-2xl font-bold">{stats.awaiting}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold">{stats.delivered}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Plaque Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No plaque orders yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Certificate</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">{order.invoice_id}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.full_name}</p>
                          <p className="text-xs text-muted-foreground">{order.profile?.email || "N/A"}</p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {order.certificate?.title || "N/A"}
                      </TableCell>
                      <TableCell>{order.size}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(order.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs"
                            title="View Invoice"
                          >
                            <FileText className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
