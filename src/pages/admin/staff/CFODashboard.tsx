import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  DollarSign, TrendingUp, TrendingDown, CreditCard, 
  Package, Receipt, RefreshCw, Download
} from 'lucide-react';

interface FinanceStats {
  totalPlaqueOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
}

interface RecentOrder {
  id: string;
  full_name: string;
  price: number;
  status: string;
  created_at: string;
}

export default function CFODashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<FinanceStats>({
    totalPlaqueOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [allOrders, setAllOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showRefundsModal, setShowRefundsModal] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data: orders } = await supabase
        .from('plaque_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (orders) {
        const totalRevenue = orders
          .filter(o => o.status === 'Delivered')
          .reduce((sum, o) => sum + (o.price || 0), 0);
        
        const pendingOrders = orders.filter(o => o.status === 'Pending').length;
        const avgValue = orders.length > 0 
          ? orders.reduce((sum, o) => sum + (o.price || 0), 0) / orders.length 
          : 0;

        setStats({
          totalPlaqueOrders: orders.length,
          pendingOrders,
          totalRevenue,
          averageOrderValue: avgValue
        });

        setAllOrders(orders);
        setRecentOrders(orders.slice(0, 5));
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportFinancialReport = () => {
    const reportData = [
      ['Financial Report', new Date().toLocaleDateString()],
      [''],
      ['Metric', 'Value'],
      ['Total Revenue', `$${stats.totalRevenue.toFixed(2)}`],
      ['Total Orders', stats.totalPlaqueOrders.toString()],
      ['Pending Orders', stats.pendingOrders.toString()],
      ['Average Order Value', `$${stats.averageOrderValue.toFixed(2)}`],
      [''],
      ['Recent Orders'],
      ['Name', 'Price', 'Status', 'Date'],
      ...allOrders.map(order => [
        order.full_name,
        `$${(order.price || 0).toFixed(2)}`,
        order.status,
        new Date(order.created_at).toLocaleDateString()
      ])
    ];

    const csvContent = reportData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Financial report exported successfully');
  };

  const handleProcessRefund = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('plaque_orders')
        .update({ status: 'Refunded' })
        .eq('id', orderId);

      if (error) throw error;
      toast.success('Refund processed successfully');
      loadStats();
      setShowRefundsModal(false);
    } catch (error) {
      console.error('Error processing refund:', error);
      toast.error('Failed to process refund');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const statCards = [
    { title: 'Total Revenue', value: `$${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-green-400', trend: stats.totalRevenue > 0 ? '+12%' : null },
    { title: 'Total Orders', value: stats.totalPlaqueOrders, icon: Package, color: 'text-blue-400' },
    { title: 'Pending Orders', value: stats.pendingOrders, icon: CreditCard, color: 'text-yellow-400' },
    { title: 'Avg Order Value', value: `$${stats.averageOrderValue.toFixed(2)}`, icon: Receipt, color: 'text-purple-400' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
      case 'Awaiting Approval': return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
      case 'Delivered': return 'bg-green-500/10 text-green-500 border-green-500/30';
      case 'Refunded': return 'bg-red-500/10 text-red-500 border-red-500/30';
      default: return '';
    }
  };

  const deliveredOrders = allOrders.filter(o => o.status === 'Delivered');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30">
            <DollarSign className="h-8 w-8 text-green-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">
              CFO Dashboard
            </h1>
            <p className="text-muted-foreground">Financial Overview & Management</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadStats}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="bg-card/50 backdrop-blur-xl border-border/50 hover:border-primary/30 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  {stat.trend && (
                    <p className="text-xs text-green-400 flex items-center gap-1 mt-1">
                      <TrendingUp className="h-3 w-3" />
                      {stat.trend} this month
                    </p>
                  )}
                </div>
                <div className={`p-3 rounded-xl bg-background/50 ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Overview */}
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-400" />
              Revenue Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div>
                  <p className="text-sm text-muted-foreground">Plaque Order Revenue</p>
                  <p className="text-2xl font-bold text-green-400">${stats.totalRevenue.toFixed(2)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-400" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Delivered Orders</p>
                  <p className="font-bold">{allOrders.filter(o => o.status === 'Delivered').length}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Processing</p>
                  <p className="font-bold">{allOrders.filter(o => o.status !== 'Delivered' && o.status !== 'Refunded').length}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-400" />
              Recent Plaque Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No orders yet</p>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="font-medium text-sm">{order.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-green-400">
                        ${(order.price || 0).toFixed(2)}
                      </span>
                      <Badge variant="outline" className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Actions */}
        <Card className="lg:col-span-2 bg-card/50 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-green-400" />
              Financial Tools
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                className="h-auto py-6 flex-col gap-2"
                onClick={exportFinancialReport}
              >
                <Download className="h-6 w-6" />
                <span>Export Report</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-6 flex-col gap-2"
                onClick={() => navigate('/app/admin/plaque-orders')}
              >
                <Package className="h-6 w-6" />
                <span>View All Orders</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-6 flex-col gap-2"
                onClick={() => setShowAnalyticsModal(true)}
              >
                <TrendingUp className="h-6 w-6" />
                <span>Revenue Analytics</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-6 flex-col gap-2"
                onClick={() => setShowRefundsModal(true)}
              >
                <CreditCard className="h-6 w-6" />
                <span>Process Refunds</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Analytics Modal */}
      <Dialog open={showAnalyticsModal} onOpenChange={setShowAnalyticsModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Revenue Analytics
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-3xl font-bold text-green-400">${stats.totalRevenue.toFixed(2)}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground">Delivered Orders</p>
                <p className="text-xl font-bold">{deliveredOrders.length}</p>
                <p className="text-xs text-green-400">
                  ${deliveredOrders.reduce((sum, o) => sum + (o.price || 0), 0).toFixed(2)}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground">Pending Revenue</p>
                <p className="text-xl font-bold">
                  ${allOrders.filter(o => o.status !== 'Delivered' && o.status !== 'Refunded')
                    .reduce((sum, o) => sum + (o.price || 0), 0).toFixed(2)}
                </p>
                <p className="text-xs text-yellow-400">In processing</p>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground mb-2">Revenue by Status</p>
              {['Pending', 'Processing', 'Delivered'].map(status => {
                const statusOrders = allOrders.filter(o => o.status === status);
                const statusRevenue = statusOrders.reduce((sum, o) => sum + (o.price || 0), 0);
                const percentage = stats.totalRevenue > 0 
                  ? (statusRevenue / allOrders.reduce((sum, o) => sum + (o.price || 0), 0)) * 100 
                  : 0;
                return (
                  <div key={status} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getStatusColor(status)}>{status}</Badge>
                      <span className="text-sm">{statusOrders.length} orders</span>
                    </div>
                    <span className="font-medium">${statusRevenue.toFixed(2)} ({percentage.toFixed(0)}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refunds Modal */}
      <Dialog open={showRefundsModal} onOpenChange={setShowRefundsModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Process Refunds
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {deliveredOrders.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No delivered orders eligible for refund</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Select a delivered order to process refund:</p>
                {deliveredOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                    <div>
                      <p className="font-medium">{order.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-green-400">
                        ${(order.price || 0).toFixed(2)}
                      </span>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleProcessRefund(order.id)}
                      >
                        Refund
                      </Button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}