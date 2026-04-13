import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  Truck, 
  XCircle,
  Search,
  Eye,
  PackageCheck,
  ArrowRight,
  Award,
  CreditCard
} from 'lucide-react';

interface UserOrder {
  id: string;
  full_name: string;
  size: string;
  quantity: number;
  status: string;
  delivery_status: string | null;
  payment_status: string | null;
  price: number | null;
  created_at: string;
  customer_confirmed_at: string | null;
  certificate: {
    title: string;
  } | null;
}

export default function UserOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('plaque_orders')
        .select('id, full_name, size, quantity, status, delivery_status, payment_status, price, created_at, customer_confirmed_at, certificate_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch certificate titles
      const ordersWithCerts = await Promise.all(
        (data || []).map(async (order) => {
          const { data: cert } = await supabase
            .from('certificates')
            .select('title')
            .eq('id', order.certificate_id)
            .maybeSingle();
          return { ...order, certificate: cert };
        })
      );

      setOrders(ordersWithCerts);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (order: UserOrder) => {
    const { status, delivery_status, payment_status, customer_confirmed_at } = order;
    
    // Customer confirmed receipt
    if (customer_confirmed_at) {
      return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-xs"><PackageCheck className="h-3 w-3 mr-1" />Received</Badge>;
    }
    
    // Delivery statuses take priority once payment is approved
    if (delivery_status === 'Delivered' || status === 'Delivered') {
      return <Badge className="bg-green-500/10 text-green-500 border-green-500/30 text-xs"><CheckCircle className="h-3 w-3 mr-1" />Delivered</Badge>;
    }
    
    if (delivery_status === 'In Delivery') {
      return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/30 text-xs"><Truck className="h-3 w-3 mr-1" />In Delivery</Badge>;
    }
    
    if (delivery_status === 'Preparing Shipment') {
      return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/30 text-xs"><Package className="h-3 w-3 mr-1" />Preparing</Badge>;
    }

    // Payment-aware statuses
    if (!payment_status || payment_status === 'unpaid') {
      return <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30 text-xs"><CreditCard className="h-3 w-3 mr-1" />Payment Required</Badge>;
    }
    
    if (payment_status === 'pending') {
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30 text-xs"><Clock className="h-3 w-3 mr-1" />Awaiting Approval</Badge>;
    }
    
    if (payment_status === 'approved' || payment_status === 'confirmed') {
      if (status === 'Processing') {
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30 text-xs"><Package className="h-3 w-3 mr-1" />Processing</Badge>;
      }
      return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30 text-xs"><CheckCircle className="h-3 w-3 mr-1" />Confirmed</Badge>;
    }

    // Fallback for other statuses
    switch (status) {
      case 'Rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30 text-xs"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const filteredOrders = orders.filter(order => {
    let matchesFilter = filter === 'all';
    
    if (filter === 'payment_required') {
      matchesFilter = !order.payment_status || order.payment_status === 'unpaid';
    } else if (filter === 'awaiting_approval') {
      matchesFilter = order.payment_status === 'pending';
    } else if (filter === 'Processing') {
      matchesFilter = order.status === 'Processing' || order.delivery_status === 'Preparing Shipment' || order.delivery_status === 'In Delivery';
    } else if (filter === 'Delivered') {
      matchesFilter = order.status === 'Delivered' || !!order.customer_confirmed_at;
    } else if (filter === 'Rejected') {
      matchesFilter = order.status === 'Rejected';
    }
    
    const matchesSearch = order.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.certificate?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: orders.length,
    paymentRequired: orders.filter(o => !o.payment_status || o.payment_status === 'unpaid').length,
    inProgress: orders.filter(o => 
      o.payment_status === 'pending' || 
      o.status === 'Processing' || 
      o.delivery_status === 'Preparing Shipment' || 
      o.delivery_status === 'In Delivery'
    ).length,
    delivered: orders.filter(o => o.status === 'Delivered' || o.customer_confirmed_at).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">My Orders</h1>
            <p className="text-sm text-muted-foreground">Track your plaque orders</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={() => navigate('/app/certificates')}
          className="gap-2"
        >
          <Award className="h-4 w-4" />
          Back to Certificates
        </Button>
      </div>

      {/* Stats - Compact Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
              <Package className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Payment Required</p>
                <p className="text-xl font-bold text-orange-500">{stats.paymentRequired}</p>
              </div>
              <CreditCard className="h-5 w-5 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">In Progress</p>
                <p className="text-xl font-bold text-blue-500">{stats.inProgress}</p>
              </div>
              <Truck className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Delivered</p>
                <p className="text-xl font-bold text-green-500">{stats.delivered}</p>
              </div>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters - Compact */}
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search orders..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-[160px] h-9">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="payment_required">Payment Required</SelectItem>
                <SelectItem value="awaiting_approval">Awaiting Approval</SelectItem>
                <SelectItem value="Processing">In Progress</SelectItem>
                <SelectItem value="Delivered">Delivered</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders List - Compact Cards */}
      <div className="space-y-2 sm:space-y-3">
        {filteredOrders.length === 0 ? (
          <Card className="bg-card/50 backdrop-blur-xl border-border/50">
            <CardContent className="p-8 text-center">
              <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-base font-semibold mb-1">No Orders Found</h3>
              <p className="text-sm text-muted-foreground">
                {orders.length === 0 
                  ? "You haven't placed any orders yet." 
                  : "No orders match your search."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => (
            <Card key={order.id} className="bg-card/50 backdrop-blur-xl border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="p-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-xs text-muted-foreground">
                        #{order.id.slice(0, 8)}
                      </span>
                      {getStatusBadge(order)}
                    </div>
                    <h3 className="font-semibold text-sm truncate">{order.certificate?.title || 'Plaque Order'}</h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span>{order.size}</span>
                      <span>Qty: {order.quantity}</span>
                      <span className="font-medium">${order.price?.toFixed(2) || '0.00'}</span>
                      <span className="hidden sm:inline">• {new Date(order.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Link to={`/app/orders/${order.id}`}>
                    <Button variant="outline" size="sm" className="gap-1 h-8 text-xs">
                      <Eye className="h-3 w-3" />
                      View
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
