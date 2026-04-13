import { useNavigate } from 'react-router-dom';
import { useStaffPermissions } from '@/hooks/useStaffPermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  ArrowLeft,
  TrendingUp,
  CreditCard,
  Receipt,
  Wallet
} from 'lucide-react';

export default function AdminFinance() {
  const navigate = useNavigate();
  const { isCEO, hasPermission, loading } = useStaffPermissions();

  const canAccess = isCEO || hasPermission('manage_finance');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!canAccess) {
    navigate('/app/dashboard');
    return null;
  }

  const stats = [
    { title: 'Total Revenue', value: '$0.00', icon: DollarSign, change: '+0%' },
    { title: 'Monthly Revenue', value: '$0.00', icon: TrendingUp, change: '+0%' },
    { title: 'Pending Invoices', value: '0', icon: Receipt, change: '0' },
    { title: 'Active Subscriptions', value: '0', icon: CreditCard, change: '0' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app/admin/ceo')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Finance & Invoices</h1>
            <p className="text-muted-foreground">Manage financial data and invoices</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="bg-card/50 backdrop-blur-xl border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  <p className="text-sm text-green-400 mt-1">{stat.change}</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Placeholder Content */}
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No transactions yet</p>
            <p className="text-sm">Financial data will appear here once available</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
