import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useStaffPermissions } from "@/hooks/useStaffPermissions";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Package, Clock, CheckCircle, Truck, FileText, Eye, Download, X, Check, Info, CreditCard, ShieldCheck, ShieldX, Search } from "lucide-react";
import { OrderDetailModal } from "@/components/admin/OrderDetailModal";
import { PlaquePricingControl } from "@/components/admin/PlaquePricingControl";
import { PaymentControlPanel } from "@/components/admin/PaymentControlPanel";
import { PropFirmCertificateSizes } from "@/components/admin/PropFirmCertificateSizes";

interface PlaqueOrder {
  id: string;
  full_name: string;
  size: string;
  delivery_method: string;
  quantity: number;
  status: string;
  invoice_id: string;
  price: number;
  created_at: string;
  shipping_address: string;
  phone: string;
  notes: string | null;
  certificate_id: string;
  user_id: string;
  ceo_action: string | null;
  ceo_action_reason: string | null;
  ceo_action_at: string | null;
  payment_status: string | null;
  delivery_status: string | null;
  certificate: {
    title: string;
    file_url: string;
  } | null;
  profile: {
    name: string;
    email: string;
  } | null;
}

export default function PlaqueOrdersManagement() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isCEO, loading: permLoading } = useStaffPermissions();
  const [orders, setOrders] = useState<PlaqueOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailViewOrder, setDetailViewOrder] = useState<PlaqueOrder | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("orders");
  const [searchTerm, setSearchTerm] = useState("");
  
  // CEO Rejection Dialog
  const [rejectionDialog, setRejectionDialog] = useState<{ open: boolean; orderId: string | null }>({
    open: false,
    orderId: null
  });
  const [rejectionReason, setRejectionReason] = useState("");
  
  const [stats, setStats] = useState({
    pending: 0,
    awaiting: 0,
    delivered: 0,
    rejected: 0,
  });
  
  // Filter orders based on search term
  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return orders;
    const term = searchTerm.toLowerCase();
    return orders.filter(order => 
      order.id.toLowerCase().includes(term) ||
      (order.invoice_id?.toLowerCase() || '').includes(term) ||
      order.full_name.toLowerCase().includes(term) ||
      (order.profile?.email?.toLowerCase() || '').includes(term) ||
      order.user_id.toLowerCase().includes(term)
    );
  }, [orders, searchTerm]);

  useEffect(() => {
    if (!permLoading && !isCEO) {
      navigate('/app/admin/ceo');
    }
  }, [isCEO, permLoading, navigate]);

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
          price,
          created_at,
          shipping_address,
          phone,
          notes,
          certificate_id,
          user_id,
          ceo_action,
          ceo_action_reason,
          ceo_action_at,
          payment_status,
          delivery_status
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch certificate and profile data separately
      const ordersWithDetails = await Promise.all(
        (data || []).map(async (order) => {
          const [certResult, profileResult] = await Promise.all([
            supabase.from("certificates").select("title, file_url").eq("id", order.certificate_id).maybeSingle(),
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
      const rejected = ordersWithDetails.filter((o) => o.status === "Rejected").length;

      setStats({ pending, awaiting, delivered, rejected });
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

  const handleCEOApprove = async (orderId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("plaque_orders")
        .update({ 
          ceo_action: 'approved',
          ceo_action_at: new Date().toISOString(),
          ceo_action_by: user?.id
        })
        .eq("id", orderId);

      if (error) throw error;

      toast({
        title: "CEO Approved",
        description: "Order approved. Order Manager can now process this order.",
      });

      fetchOrders();
    } catch (error) {
      console.error("Error updating CEO action:", error);
      toast({
        title: "Error",
        description: "Failed to approve order",
        variant: "destructive",
      });
    }
  };

  const openRejectionDialog = (orderId: string) => {
    setRejectionDialog({ open: true, orderId });
    setRejectionReason("");
  };

  const handleCEOReject = async () => {
    if (!rejectionDialog.orderId || !rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a rejection reason",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("plaque_orders")
        .update({ 
          ceo_action: 'rejected',
          ceo_action_reason: rejectionReason,
          ceo_action_at: new Date().toISOString(),
          ceo_action_by: user?.id
        })
        .eq("id", rejectionDialog.orderId);

      if (error) throw error;

      toast({
        title: "CEO Rejected",
        description: "Order rejected. Order Manager will process the rejection.",
      });

      setRejectionDialog({ open: false, orderId: null });
      setRejectionReason("");
      fetchOrders();
    } catch (error) {
      console.error("Error rejecting order:", error);
      toast({
        title: "Error",
        description: "Failed to reject order",
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
      case "Rejected":
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">Rejected</Badge>;
      case "Processing":
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30">Processing</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (paymentStatus: string | null) => {
    switch (paymentStatus) {
      case "unpaid":
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">Unpaid</Badge>;
      case "pending":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">Awaiting</Badge>;
      case "approved":
      case "confirmed":
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">Paid</Badge>;
      default:
        return <Badge variant="outline" className="bg-muted text-muted-foreground">Unknown</Badge>;
    }
  };

  const getDeliveryStatusBadge = (deliveryStatus: string | null) => {
    switch (deliveryStatus) {
      case "Preparing Shipment":
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30">Preparing</Badge>;
      case "In Delivery":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">In Transit</Badge>;
      case "Delivered":
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">Delivered</Badge>;
      default:
        return <Badge variant="outline" className="bg-muted text-muted-foreground">—</Badge>;
    }
  };

  const getCEOActionBadge = (order: PlaqueOrder) => {
    if (!order.ceo_action) {
      return <Badge variant="outline" className="bg-muted text-muted-foreground border-muted">Pending Review</Badge>;
    }
    if (order.ceo_action === 'approved') {
      return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30"><ShieldCheck className="h-3 w-3 mr-1" />CEO Approved</Badge>;
    }
    if (order.ceo_action === 'rejected') {
      return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30"><ShieldX className="h-3 w-3 mr-1" />CEO Rejected</Badge>;
    }
    return null;
  };

  if (permLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isCEO) {
    return null;
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30">
            <Package className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Plaque Orders Management</h1>
            <p className="text-muted-foreground">Review and approve plaque orders</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate('/app/admin/ceo')}>
          Back to Dashboard
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="pricing">Plaque Pricing</TabsTrigger>
          <TabsTrigger value="cert-sizes">Prop Firm Sizes</TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-1">
            <CreditCard className="h-4 w-4" />
            Payments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pricing" className="mt-6">
          <PlaquePricingControl />
        </TabsContent>

        <TabsContent value="cert-sizes" className="mt-6">
          <PropFirmCertificateSizes />
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <PaymentControlPanel />
        </TabsContent>

        <TabsContent value="orders" className="mt-6 space-y-6">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <X className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold">{stats.rejected}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              All Plaque Orders
            </CardTitle>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by Order ID, Name, Email, User ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {orders.length === 0 ? "No plaque orders yet" : "No orders match your search"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Certificate</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Order Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Delivery</TableHead>
                    <TableHead>CEO Action</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">{order.invoice_id || order.id.slice(0, 8)}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{order.user_id.slice(0, 8)}...</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.full_name}</p>
                          <p className="text-xs text-muted-foreground">{order.profile?.email || "N/A"}</p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[150px]">
                        <div className="flex items-center gap-2">
                          <span className="truncate">{order.certificate?.title || "N/A"}</span>
                          {order.certificate?.file_url && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => setImagePreview(order.certificate?.file_url || null)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{order.size}</TableCell>
                      <TableCell>
                        <span className="font-medium">${order.price?.toFixed(2) || "0.00"}</span>
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>{getPaymentStatusBadge(order.payment_status)}</TableCell>
                      <TableCell>{getDeliveryStatusBadge(order.delivery_status)}</TableCell>
                      <TableCell>{getCEOActionBadge(order)}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(order.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDetailViewOrder(order)}
                            className="text-xs"
                          >
                            <Info className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          {!order.ceo_action && order.status !== "Delivered" && order.status !== "Rejected" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCEOApprove(order.id)}
                                className="text-xs bg-green-500/10 hover:bg-green-500/20 text-green-500"
                              >
                                <ShieldCheck className="h-3 w-3 mr-1" />
                                CEO Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openRejectionDialog(order.id)}
                                className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-500"
                              >
                                <ShieldX className="h-3 w-3 mr-1" />
                                CEO Reject
                              </Button>
                            </>
                          )}
                          {order.certificate?.file_url && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs"
                              asChild
                            >
                              <a href={order.certificate.file_url} download target="_blank" rel="noopener noreferrer">
                                <Download className="h-3 w-3" />
                              </a>
                            </Button>
                          )}
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
        </TabsContent>
      </Tabs>

      {/* CEO Rejection Dialog */}
      <Dialog open={rejectionDialog.open} onOpenChange={(open) => !open && setRejectionDialog({ open: false, orderId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldX className="h-5 w-5 text-red-500" />
              CEO Rejection Reason
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Please provide a reason for rejecting this order. This will be visible to the Order Manager.
            </p>
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason *</Label>
              <Textarea
                id="reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter the reason for rejection..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectionDialog({ open: false, orderId: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleCEOReject} disabled={!rejectionReason.trim()}>
              <ShieldX className="h-4 w-4 mr-2" />
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!imagePreview} onOpenChange={() => setImagePreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Certificate Preview</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            {imagePreview && (
              imagePreview.endsWith('.pdf') ? (
                <div className="text-center py-8">
                  <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">PDF Certificate</p>
                  <Button asChild>
                    <a href={imagePreview} target="_blank" rel="noopener noreferrer">
                      <Eye className="h-4 w-4 mr-2" />
                      View PDF
                    </a>
                  </Button>
                </div>
              ) : (
                <img src={imagePreview} alt="Certificate" className="max-h-[500px] object-contain rounded-lg" />
              )
            )}
          </div>
          <DialogFooter>
            {imagePreview && (
              <Button asChild>
                <a href={imagePreview} download target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Detail Modal */}
      <OrderDetailModal
        order={detailViewOrder}
        open={!!detailViewOrder}
        onOpenChange={(open) => !open && setDetailViewOrder(null)}
        onViewCertificate={(url) => setImagePreview(url)}
      />
    </div>
  );
}
