import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useStaffPermissions } from '@/hooks/useStaffPermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { OrderDetailModal } from '@/components/admin/OrderDetailModal';
import { PlaquePricingControl } from '@/components/admin/PlaquePricingControl';
import { PaymentControlPanel } from '@/components/admin/PaymentControlPanel';
import { PropFirmCertificateSizes } from '@/components/admin/PropFirmCertificateSizes';
import { DeliveryPricingControl } from '@/components/admin/DeliveryPricingControl';
import ShipmentManagement from '@/components/admin/ShipmentManagement';
import { 
  Package, 
  Truck, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Search,
  RefreshCw,
  Info,
  Eye,
  CreditCard,
  XCircle,
  ShieldCheck,
  ShieldX,
  Ban,
  Download
} from 'lucide-react';

interface PlaqueOrder {
  id: string;
  full_name: string;
  shipping_address: string;
  phone: string;
  size: string;
  delivery_method: string;
  quantity: number;
  status: string;
  price: number | null;
  notes: string | null;
  created_at: string;
  updated_at?: string;
  certificate_id: string | null;
  final_certificate_id: string | null;
  user_id: string;
  invoice_id?: string;
  ceo_action: string | null;
  ceo_action_reason: string | null;
  ceo_action_at: string | null;
  payment_status: string | null;
  delivery_status: string | null;
  certificate: {
    title: string;
    file_url: string;
  } | null;
  final_certificate: {
    certificate_url: string;
  } | null;
  profile: {
    name: string;
    email: string;
  } | null;
}

export default function PlaqueOrdersDashboard() {
  const navigate = useNavigate();
  const { staffData, isCEO, loading: permLoading } = useStaffPermissions();
  const { toast } = useToast();
  
  const [orders, setOrders] = useState<PlaqueOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('orders');
  const [detailViewOrder, setDetailViewOrder] = useState<PlaqueOrder | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const isCFO = staffData?.role?.name === 'CFO';
  const isOrderManager = staffData?.role?.name === 'Plaque Order Manager' || 
                         staffData?.role?.name === 'order Manager';
  const canViewFinancials = (isCEO || isCFO) && !isOrderManager;
  const hasAccess = isCEO || isCFO || isOrderManager || 
                   staffData?.role?.permissions?.manage_support;

  useEffect(() => {
    if (!permLoading && !hasAccess) {
      navigate('/app/dashboard');
    }
  }, [hasAccess, permLoading, navigate]);

  useEffect(() => {
    if (hasAccess) {
      loadOrders();
    }
  }, [hasAccess]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('plaque_orders')
        .select('id, full_name, shipping_address, phone, size, delivery_method, quantity, status, price, notes, created_at, updated_at, certificate_id, final_certificate_id, user_id, invoice_id, ceo_action, ceo_action_reason, ceo_action_at, payment_status, delivery_status')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch certificate and profile data for each order
      const ordersWithDetails = await Promise.all(
        (data || []).map(async (order) => {
          // Fetch from certificates table if certificate_id exists
          const certPromise = order.certificate_id 
            ? supabase.from("certificates").select("title, file_url").eq("id", order.certificate_id).maybeSingle()
            : Promise.resolve({ data: null });
          
          // Fetch from final_certificates table if final_certificate_id exists
          const finalCertPromise = order.final_certificate_id
            ? supabase.from("final_certificates").select("certificate_url").eq("id", order.final_certificate_id).maybeSingle()
            : Promise.resolve({ data: null });

          const [certResult, finalCertResult, profileResult] = await Promise.all([
            certPromise,
            finalCertPromise,
            supabase.from("profiles").select("name, email").eq("id", order.user_id).maybeSingle(),
          ]);

          return {
            ...order,
            certificate: certResult.data,
            final_certificate: finalCertResult.data,
            profile: profileResult.data,
          };
        })
      );
      
      setOrders(ordersWithDetails);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveOrder = async (order: PlaqueOrder) => {
    // Check CEO decision first
    if (order.ceo_action === 'rejected') {
      toast({ 
        title: 'Action Denied', 
        description: 'CEO has rejected this order. You can only reject it.',
        variant: 'destructive'
      });
      return;
    }
    
    if (!order.ceo_action) {
      toast({ 
        title: 'Awaiting CEO Decision', 
        description: 'CEO has not reviewed this order yet.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('plaque_orders')
        .update({ status: 'Processing' })
        .eq('id', order.id);

      if (error) throw error;

      // Send Telegram notification
      await supabase.functions.invoke('send-payment-notification', {
        body: {
          type: 'payment_approved',
          customerName: order.full_name,
          customerEmail: order.profile?.email || '',
          orderId: order.id,
          invoiceId: order.invoice_id,
          amount: order.price || 0,
          paymentMethod: 'N/A',
          date: new Date().toLocaleDateString(),
          orderDetails: {
            size: order.size,
            quantity: order.quantity,
            deliveryMethod: order.delivery_method,
            shippingAddress: order.shipping_address,
            fullName: order.full_name,
            phone: order.phone
          }
        }
      });
      
      toast({ title: 'Success', description: 'Order approved. Telegram notification sent to customer.' });
      loadOrders();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleRejectOrder = async (order: PlaqueOrder) => {
    // Check CEO decision first
    if (order.ceo_action === 'approved') {
      toast({ 
        title: 'Action Denied', 
        description: 'CEO has approved this order. You cannot reject it.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('plaque_orders')
        .update({ status: 'Rejected' })
        .eq('id', order.id);

      if (error) throw error;

      // Send Telegram notification with CEO rejection reason
      await supabase.functions.invoke('send-payment-notification', {
        body: {
          type: 'payment_rejected',
          customerName: order.full_name,
          customerEmail: order.profile?.email || '',
          orderId: order.id,
          invoiceId: order.invoice_id,
          amount: order.price || 0,
          paymentMethod: 'N/A',
          reason: order.ceo_action_reason || 'Order rejected',
          date: new Date().toLocaleDateString(),
          orderDetails: {
            size: order.size,
            quantity: order.quantity,
            deliveryMethod: order.delivery_method,
            shippingAddress: order.shipping_address,
            fullName: order.full_name,
            phone: order.phone
          }
        }
      });
      
      toast({ title: 'Success', description: 'Order rejected. Telegram notification sent to customer.' });
      loadOrders();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleMarkDelivered = async (order: PlaqueOrder) => {
    try {
      const { error } = await supabase
        .from('plaque_orders')
        .update({ status: 'Delivered' })
        .eq('id', order.id);

      if (error) throw error;
      
      toast({ title: 'Success', description: 'Order marked as delivered.' });
      loadOrders();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const exportOrders = (period: 'daily' | 'weekly' | 'monthly') => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let startDate: Date;
    if (period === 'daily') {
      startDate = today;
    } else if (period === 'weekly') {
      startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    const filteredByDate = orders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= startDate;
    });

    if (filteredByDate.length === 0) {
      const periodText = period === 'daily' ? 'today' : period === 'weekly' ? 'the last 7 days' : 'the last 30 days';
      toast({ 
        title: 'No Data', 
        description: `No orders found for ${periodText}.`,
        variant: 'destructive'
      });
      return;
    }

    const headers = [
      'Order ID',
      'Customer Name',
      'Email',
      'Phone',
      'Certificate Title',
      'Size',
      'Quantity',
      'Delivery Method',
      'Shipping Address',
      'Status',
      'CEO Action',
      'CEO Reason',
      'Price',
      'Created Date'
    ];

    const rows = filteredByDate.map(order => [
      order.id,
      order.full_name,
      order.profile?.email || '',
      order.phone,
      order.certificate?.title || (order.final_certificate ? 'YUNIX Certificate of Completion' : 'N/A'),
      order.size,
      order.quantity.toString(),
      order.delivery_method,
      `"${order.shipping_address.replace(/"/g, '""')}"`,
      order.status,
      order.ceo_action || 'Pending',
      order.ceo_action_reason || '',
      order.price?.toString() || '0',
      new Date(order.created_at).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = today.toISOString().split('T')[0];
    link.href = url;
    link.download = `orders-${period}-${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ 
      title: 'Export Complete', 
      description: `Exported ${filteredByDate.length} orders to CSV.`
    });
  };

  if (permLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasAccess) return null;

  const filteredOrders = orders.filter(order => {
    const matchesFilter = filter === 'all' || order.status === filter;
    const matchesSearch = order.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.shipping_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'Pending').length,
    processing: orders.filter(o => o.status === 'Awaiting Approval' || o.status === 'Processing').length,
    delivered: orders.filter(o => o.status === 'Delivered').length,
    rejected: orders.filter(o => o.status === 'Rejected').length
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />{status}</Badge>;
      case 'Awaiting Approval':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30"><AlertCircle className="h-3 w-3 mr-1" />{status}</Badge>;
      case 'Processing':
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30"><Truck className="h-3 w-3 mr-1" />{status}</Badge>;
      case 'Delivered':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />{status}</Badge>;
      case 'Rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCEOActionBadge = (order: PlaqueOrder) => {
    if (!order.ceo_action) {
      return <Badge variant="outline" className="bg-muted text-muted-foreground border-muted"><Clock className="h-3 w-3 mr-1" />Awaiting CEO</Badge>;
    }
    if (order.ceo_action === 'approved') {
      return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30"><ShieldCheck className="h-3 w-3 mr-1" />CEO Approved</Badge>;
    }
    if (order.ceo_action === 'rejected') {
      return (
        <div className="flex flex-col gap-1">
          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30"><ShieldX className="h-3 w-3 mr-1" />CEO Rejected</Badge>
          {order.ceo_action_reason && (
            <span className="text-xs text-red-400 max-w-[150px] truncate" title={order.ceo_action_reason}>
              {order.ceo_action_reason}
            </span>
          )}
        </div>
      );
    }
    return null;
  };

  const getActionButtons = (order: PlaqueOrder) => {
    // If already delivered or rejected, no actions
    if (order.status === 'Delivered' || order.status === 'Rejected') {
      return null;
    }

    // If no CEO decision yet
    if (!order.ceo_action) {
      return (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Ban className="h-3 w-3" />
          Awaiting CEO
        </span>
      );
    }

    // If CEO approved - show Approve and Delivered buttons
    if (order.ceo_action === 'approved') {
      return (
        <div className="flex items-center gap-2">
          {order.status !== 'Processing' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleApproveOrder(order)}
              className="text-xs bg-green-500/10 hover:bg-green-500/20 text-green-500"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Approve
            </Button>
          )}
          {(order.status === 'Processing' || order.status === 'Awaiting Approval') && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleMarkDelivered(order)}
              className="text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-500"
            >
              <Truck className="h-3 w-3 mr-1" />
              Delivered
            </Button>
          )}
        </div>
      );
    }

    // If CEO rejected - show only Reject button
    if (order.ceo_action === 'rejected') {
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleRejectOrder(order)}
          className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-500"
        >
          <XCircle className="h-3 w-3 mr-1" />
          Reject
        </Button>
      );
    }

    return null;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30">
          <Package className="h-8 w-8 text-orange-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
            Plaque Orders Dashboard
          </h1>
          <p className="text-muted-foreground">Manage plaque orders based on CEO decisions</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="shipments">Shipment Management</TabsTrigger>
          {canViewFinancials && <TabsTrigger value="pricing">Plaque Pricing</TabsTrigger>}
          {canViewFinancials && <TabsTrigger value="delivery">Delivery Pricing</TabsTrigger>}
          {canViewFinancials && <TabsTrigger value="cert-sizes">Prop Firm Sizes</TabsTrigger>}
          {canViewFinancials && (
            <TabsTrigger value="payments" className="flex items-center gap-1">
              <CreditCard className="h-4 w-4" />
              Payments
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="shipments" className="mt-6">
          <ShipmentManagement />
        </TabsContent>

        {canViewFinancials && (
          <TabsContent value="pricing" className="mt-6">
            <PlaquePricingControl />
          </TabsContent>
        )}

        {canViewFinancials && (
          <TabsContent value="delivery" className="mt-6">
            <DeliveryPricingControl />
          </TabsContent>
        )}

        {canViewFinancials && (
          <TabsContent value="cert-sizes" className="mt-6">
            <PropFirmCertificateSizes />
          </TabsContent>
        )}

        {canViewFinancials && (
          <TabsContent value="payments" className="mt-6">
            <PaymentControlPanel />
          </TabsContent>
        )}

        <TabsContent value="orders" className="mt-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-3xl font-bold text-yellow-500">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Processing</p>
                <p className="text-3xl font-bold text-blue-500">{stats.processing}</p>
              </div>
              <Truck className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-3xl font-bold text-green-500">{stats.delivered}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-4 items-center w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by name, address, or order ID..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Awaiting Approval">Awaiting Approval</SelectItem>
                  <SelectItem value="Processing">Processing</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportOrders('daily')}>
                    Daily Export (Today)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportOrders('weekly')}>
                    Weekly Export (Last 7 Days)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportOrders('monthly')}>
                    Monthly Export (Last 30 Days)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" onClick={loadOrders}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle>Orders ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Certificate</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Order Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead>CEO Action</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">
                      {order.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.full_name}</p>
                        <p className="text-xs text-muted-foreground">{order.profile?.email || order.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[150px]">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm">{order.certificate?.title || "N/A"}</span>
                        {order.certificate?.file_url && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 shrink-0"
                            onClick={() => setImagePreview(order.certificate?.file_url || null)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{order.size}</TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell>{order.delivery_method}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>{getPaymentStatusBadge(order.payment_status)}</TableCell>
                    <TableCell>{getDeliveryStatusBadge(order.delivery_status)}</TableCell>
                    <TableCell>{getCEOActionBadge(order)}</TableCell>
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
                        {getActionButtons(order)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>

      {/* Image Preview Dialog */}
      <Dialog open={!!imagePreview} onOpenChange={() => setImagePreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Certificate Preview</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            {imagePreview && (
              <img src={imagePreview} alt="Certificate" className="max-h-[500px] object-contain rounded-lg" />
            )}
          </div>
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
