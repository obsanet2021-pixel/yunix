import { useNavigate } from 'react-router-dom';
import { useStaffPermissions } from '@/hooks/useStaffPermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  HeadphonesIcon, 
  ArrowLeft,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function AdminSupport() {
  const navigate = useNavigate();
  const { isCEO, hasPermission, loading } = useStaffPermissions();

  const canAccess = isCEO || hasPermission('manage_support');

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
    { title: 'Open Tickets', value: '0', icon: AlertCircle, color: 'text-yellow-400' },
    { title: 'In Progress', value: '0', icon: Clock, color: 'text-blue-400' },
    { title: 'Resolved', value: '0', icon: CheckCircle, color: 'text-green-400' },
    { title: 'Total Messages', value: '0', icon: MessageSquare, color: 'text-purple-400' },
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
            <HeadphonesIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Support Center</h1>
            <p className="text-muted-foreground">Manage support tickets and inquiries</p>
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
                </div>
                <div className={`p-3 rounded-xl bg-background/50 ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Placeholder Content */}
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle>Support Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <HeadphonesIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No support tickets yet</p>
            <p className="text-sm">Support requests will appear here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
