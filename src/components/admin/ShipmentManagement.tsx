import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Package, 
  Truck, 
  Clock, 
  CheckCircle,
  Search,
  RefreshCw,
  PackageCheck,
  AlertTriangle
} from 'lucide-react';

interface ShipmentOrder {
  id: string;
  full_name: string;
  phone: string;
  shipping_address: string;
  size: string;
  quantity: number;
  status: string;
  delivery_status: string | null;
  payment_status: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  customer_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  profile: {
    email: string;
  } | null;
}

export default function ShipmentManagement() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<ShipmentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('awaiting');
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    order: ShipmentOrder;
    action: 'preparing' | 'in_delivery' | 'delivered';
  } | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('plaque_orders')
        .select('*')
        .in('status', ['Processing', 'Delivered', 'Customer Confirmed Receipt'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for each order
      const ordersWithProfiles = await Promise.all(
        (data || []).map(async (order) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', order.user_id)
            .maybeSingle();
          return { ...order, profile };
        })
      );

      setOrders(ordersWithProfiles);
    } catch (error) {
      console.error('Error loading shipment orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShipmentAction = async (order: ShipmentOrder, action: 'preparing' | 'in_delivery' | 'delivered') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let updateData: Record<string, any> = {};
      let notificationType = '';

      switch (action) {
        case 'preparing':
          updateData = { 
            delivery_status: 'Preparing Shipment',
            shipped_by: user.id
          };
          notificationType = 'shipment_preparing';
          break;
        case 'in_delivery':
          updateData = { 
            delivery_status: 'In Delivery',
            shipped_at: new Date().toISOString(),
            shipped_by: user.id
          };
          notificationType = 'order_shipped';
          break;
        case 'delivered':
          updateData = { 
            delivery_status: 'Delivered',
            status: 'Delivered',
            delivered_at: new Date().toISOString(),
            delivered_by: user.id
          };
          notificationType = 'order_delivered';
          break;
      }

      const { error } = await supabase
        .from('plaque_orders')
        .update(updateData)
        .eq('id', order.id);

      if (error) throw error;

      // Send Telegram notification
      await supabase.functions.invoke('send-payment-notification', {
        body: {
          type: notificationType,
          customerName: order.full_name,
          customerEmail: order.profile?.email || '',
          orderId: order.id,
          date: new Date().toLocaleDateString(),
          orderDetails: {
            size: order.size,
            quantity: order.quantity,
            shippingAddress: order.shipping_address,
            phone: order.phone
          }
        }
      });

      toast({ 
        title: 'Success', 
        description: `Order marked as ${action === 'preparing' ? 'Preparing Shipment' : action === 'in_delivery' ? 'In Delivery' : 'Delivered'}` 
      });
      loadOrders();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setConfirmAction(null);
    }
  };

  const getStatusBadge = (order: ShipmentOrder) => {
    if (order.customer_confirmed_at) {
      return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30"><PackageCheck className="h-3 w-3 mr-1" />Customer Confirmed</Badge>;
    }
    if (order.delivery_status === 'Delivered') {
      return <Badge className="bg-green-500/10 text-green-500 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Delivered</Badge>;
    }
    if (order.delivery_status === 'In Delivery') {
      return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/30"><Truck className="h-3 w-3 mr-1" />In Delivery</Badge>;
    }
    if (order.delivery_status === 'Preparing Shipment') {
      return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/30"><Package className="h-3 w-3 mr-1" />Preparing</Badge>;
    }
    return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Awaiting Shipment</Badge>;
  };

  const getPaymentBadge = (status: string | null) => {
    if (status === 'approved') {
      return <Badge variant="outline" className="bg-green-500/10 text-green-500">Paid</Badge>;
    }
    if (status === 'pending') {
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">Pending</Badge>;
    }
    return <Badge variant="outline">N/A</Badge>;
  };

  const filteredOrders = orders.filter(order => {
    let matchesFilter = true;
    
    switch (filter) {
      case 'awaiting':
        matchesFilter = order.status === 'Processing' && !order.delivery_status;
        break;
      case 'preparing':
        matchesFilter = order.delivery_status === 'Preparing Shipment';
        break;
      case 'in_delivery':
        matchesFilter = order.delivery_status === 'In Delivery';
        break;
      case 'delivered':
        matchesFilter = order.delivery_status === 'Delivered' && !order.customer_confirmed_at;
        break;
      case 'confirmed':
        matchesFilter = !!order.customer_confirmed_at;
        break;
      default:
        matchesFilter = true;
    }

    const matchesSearch = order.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.phone.includes(searchTerm);
    
    return matchesFilter && matchesSearch;
  });

  const stats = {
    awaiting: orders.filter(o => o.status === 'Processing' && !o.delivery_status).length,
    preparing: orders.filter(o => o.delivery_status === 'Preparing Shipment').length,
    inDelivery: orders.filter(o => o.delivery_status === 'In Delivery').length,
    delivered: orders.filter(o => o.delivery_status === 'Delivered' && !o.customer_confirmed_at).length,
    confirmed: orders.filter(o => o.customer_confirmed_at).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-card/50 backdrop-blur-xl border-border/50 cursor-pointer hover:border-yellow-500/50 transition-colors" onClick={() => setFilter('awaiting')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Awaiting</p>
                <p className="text-2xl font-bold text-yellow-500">{stats.awaiting}</p>
              </div>
              <Clock className="h-5 w-5 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-xl border-border/50 cursor-pointer hover:border-purple-500/50 transition-colors" onClick={() => setFilter('preparing')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Preparing</p>
                <p className="text-2xl font-bold text-purple-500">{stats.preparing}</p>
              </div>
              <Package className="h-5 w-5 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-xl border-border/50 cursor-pointer hover:border-blue-500/50 transition-colors" onClick={() => setFilter('in_delivery')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">In Delivery</p>
                <p className="text-2xl font-bold text-blue-500">{stats.inDelivery}</p>
              </div>
              <Truck className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-xl border-border/50 cursor-pointer hover:border-green-500/50 transition-colors" onClick={() => setFilter('delivered')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold text-green-500">{stats.delivered}</p>
              </div>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-xl border-border/50 cursor-pointer hover:border-emerald-500/50 transition-colors" onClick={() => setFilter('confirmed')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Confirmed</p>
                <p className="text-2xl font-bold text-emerald-500">{stats.confirmed}</p>
              </div>
              <PackageCheck className="h-5 w-5 text-emerald-500" />
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
                  placeholder="Search by name, ID, phone..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Shipments</SelectItem>
                  <SelectItem value="awaiting">Awaiting Shipment</SelectItem>
                  <SelectItem value="preparing">Preparing</SelectItem>
                  <SelectItem value="in_delivery">In Delivery</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="confirmed">Customer Confirmed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={loadOrders}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Shipments Table */}
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle>Shipments ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Delivery Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No shipments found
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
                        <p className="text-xs text-muted-foreground">{order.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(order)}</TableCell>
                    <TableCell>{getPaymentBadge(order.payment_status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(order.updated_at || order.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {/* Show actions based on current status */}
                        {!order.delivery_status && order.status === 'Processing' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setConfirmAction({ order, action: 'preparing' })}
                            className="text-xs bg-purple-500/10 hover:bg-purple-500/20 text-purple-500"
                          >
                            <Package className="h-3 w-3 mr-1" />
                            Preparing
                          </Button>
                        )}
                        {order.delivery_status === 'Preparing Shipment' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setConfirmAction({ order, action: 'in_delivery' })}
                            className="text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-500"
                          >
                            <Truck className="h-3 w-3 mr-1" />
                            Ship
                          </Button>
                        )}
                        {order.delivery_status === 'In Delivery' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setConfirmAction({ order, action: 'delivered' })}
                            className="text-xs bg-green-500/10 hover:bg-green-500/20 text-green-500"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Delivered
                          </Button>
                        )}
                        {(order.delivery_status === 'Delivered' || order.customer_confirmed_at) && (
                          <span className="text-xs text-muted-foreground">
                            {order.customer_confirmed_at ? 'Complete' : 'Awaiting confirmation'}
                          </span>
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

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Confirm Action
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this order as{' '}
              <strong>
                {confirmAction?.action === 'preparing' ? 'Preparing Shipment' : 
                 confirmAction?.action === 'in_delivery' ? 'In Delivery' : 
                 'Delivered'}
              </strong>?
            </DialogDescription>
          </DialogHeader>
          {confirmAction && (
            <div className="py-4 space-y-2">
              <p><strong>Order ID:</strong> {confirmAction.order.id.slice(0, 8)}...</p>
              <p><strong>Customer:</strong> {confirmAction.order.full_name}</p>
              <p><strong>Address:</strong> {confirmAction.order.shipping_address}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button onClick={() => confirmAction && handleShipmentAction(confirmAction.order, confirmAction.action)}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
