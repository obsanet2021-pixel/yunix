import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useStaffPermissions } from '@/hooks/useStaffPermissions';
import { useFeatureToggles } from '@/hooks/useFeatureToggles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Shield, 
  DollarSign, 
  BarChart3, 
  Settings,
  Activity,
  Clock,
  Crown,
  Package,
  Briefcase,
  GraduationCap,
  HeadphonesIcon,
  CheckCircle2,
  Code,
  Radio,
  Bot,
  Truck,
  ToggleLeft
} from 'lucide-react';
import { PlaqueOrdersWidget } from '@/components/admin/PlaqueOrdersWidget';
import RoleManagementPanel from '@/components/admin/RoleManagementPanel';

interface DashboardStats {
  totalStaff: number;
  totalMembers: number;
  totalRevenue: number;
  pendingInvoices: number;
}

export default function CEODashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isCEO, loading: permLoading } = useStaffPermissions();
  const { toggles, updateToggles, loading: togglesLoading } = useFeatureToggles();
  const [stats, setStats] = useState<DashboardStats>({
    totalStaff: 0,
    totalMembers: 0,
    totalRevenue: 0,
    pendingInvoices: 0
  });
  const [loading, setLoading] = useState(true);

  const handleToggleChange = async (feature: keyof typeof toggles, value: boolean) => {
    try {
      await updateToggles({ [feature]: value });
      toast({
        title: "Feature Updated",
        description: `${feature.replace(/_/g, ' ')} is now ${value ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update feature toggle",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!permLoading && !isCEO) {
      navigate('/app/dashboard');
    }
  }, [isCEO, permLoading, navigate]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [staffResult, profilesResult, plaqueResult] = await Promise.all([
        supabase.from('staff').select('id'),
        supabase.from('profiles').select('id'),
        supabase.from('plaque_orders').select('id, status')
      ]);

      const staffData = staffResult.data || [];
      const profilesData = profilesResult.data || [];
      const plaqueData = plaqueResult.data || [];

      setStats({
        totalStaff: staffData.length,
        totalMembers: profilesData.length,
        totalRevenue: 0,
        pendingInvoices: plaqueData.filter(p => p.status === 'Pending').length
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
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

  const statCards = [
    { title: 'Total Staff', value: stats.totalStaff, icon: Users, color: 'text-blue-400' },
    { title: 'Total Members', value: stats.totalMembers, icon: Activity, color: 'text-green-400' },
    { title: 'Total Revenue', value: `$${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-yellow-400' },
    { title: 'Pending Orders', value: stats.pendingInvoices, icon: Clock, color: 'text-red-400' },
  ];

  const staffDashboards = [
    { title: 'COO', icon: Briefcase, path: '/app/admin/staff/coo', color: 'text-blue-400' },
    { title: 'CTO', icon: Code, path: '/app/admin/staff/cto', color: 'text-cyan-400' },
    { title: 'CFO', icon: DollarSign, path: '/app/admin/staff/cfo', color: 'text-green-400' },
    { title: 'Course Manager', icon: GraduationCap, path: '/app/admin/staff/course-manager', color: 'text-purple-400' },
    { title: 'Support', icon: HeadphonesIcon, path: '/app/admin/staff/support', color: 'text-pink-400' },
    { title: 'QA', icon: CheckCircle2, path: '/app/admin/staff/qa', color: 'text-orange-400' },
    { title: 'Analytics', icon: BarChart3, path: '/app/admin/staff/analytics', color: 'text-indigo-400' },
    { title: 'Plaque Orders', icon: Package, path: '/app/admin/staff/plaque-orders', color: 'text-amber-400' },
  ];

  const quickActions = [
    { title: 'Manage Staff', icon: Users, path: '/app/admin/staff-management' },
    { title: 'Manage Roles', icon: Shield, path: '/app/admin/roles' },
    { title: 'Finance', icon: DollarSign, path: '/app/admin/finance' },
    { title: 'Telegram Updates', icon: Radio, path: '/app/admin/telegram-updates' },
    { title: 'CEO Bot', icon: Bot, path: '/app/admin/ceo-bot' },
    { title: 'Delivery Bot', icon: Truck, path: '/app/admin/delivery-bot' },
    { title: 'Settings', icon: Settings, path: '/app/admin/settings' },
  ];

  return (
    <div className="space-y-8 w-full max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30">
          <Crown className="h-8 w-8 text-yellow-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
            CEO Dashboard
          </h1>
          <p className="text-muted-foreground">Full system control and oversight</p>
        </div>
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
                </div>
                <div className={`p-3 rounded-xl bg-background/50 ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs for different sections */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1 w-full">
          <TabsTrigger value="overview" className="flex-1 min-w-[80px] text-xs sm:text-sm py-2">Overview</TabsTrigger>
          <TabsTrigger value="staff" className="flex-1 min-w-[80px] text-xs sm:text-sm py-2">Staff</TabsTrigger>
          <TabsTrigger value="dashboards" className="flex-1 min-w-[80px] text-xs sm:text-sm py-2">Dashboards</TabsTrigger>
          <TabsTrigger value="orders" className="flex-1 min-w-[80px] text-xs sm:text-sm py-2">Orders</TabsTrigger>
          <TabsTrigger value="features" className="flex-1 min-w-[80px] text-xs sm:text-sm py-2">Features</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card/50 backdrop-blur-xl border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-400" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Database</span>
                    <span className="text-green-400 font-medium">● Operational</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Backend Services</span>
                    <span className="text-green-400 font-medium">● Healthy</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Storage</span>
                    <span className="text-green-400 font-medium">● Available</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Authentication</span>
                    <span className="text-green-400 font-medium">● Active</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-xl border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-400" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="w-2 h-2 rounded-full bg-green-400 mt-2" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">System initialized</p>
                      <p className="text-xs text-muted-foreground">All services running normally</p>
                    </div>
                    <span className="text-xs text-muted-foreground">Now</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-2" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">CEO dashboard accessed</p>
                      <p className="text-xs text-muted-foreground">Admin login detected</p>
                    </div>
                    <span className="text-xs text-muted-foreground">Just now</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickActions.map((item) => (
                <Button
                  key={item.title}
                  variant="outline"
                  className="h-auto py-6 flex flex-col items-center gap-3 bg-card/30 hover:bg-card/50 border-border/50 hover:border-primary/50 transition-all"
                  onClick={() => navigate(item.path)}
                >
                  <item.icon className="h-8 w-8 text-primary" />
                  <span className="font-medium text-sm">{item.title}</span>
                </Button>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Staff Management Tab */}
        <TabsContent value="staff">
          <RoleManagementPanel />
        </TabsContent>

        {/* Staff Dashboards Tab */}
        <TabsContent value="dashboards">
          <Card className="bg-card/50 backdrop-blur-xl border-border/50">
            <CardHeader>
              <CardTitle>Access Staff Dashboards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {staffDashboards.map((dashboard) => (
                  <Button
                    key={dashboard.title}
                    variant="outline"
                    className="h-auto py-6 flex flex-col items-center gap-3 bg-card/30 hover:bg-card/50 border-border/50 hover:border-primary/50 transition-all"
                    onClick={() => navigate(dashboard.path)}
                  >
                    <dashboard.icon className={`h-8 w-8 ${dashboard.color}`} />
                    <span className="font-medium text-sm">{dashboard.title}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plaque Orders Tab */}
        <TabsContent value="orders">
          <div 
            className="cursor-pointer transition-all hover:scale-[1.005]"
            onClick={() => navigate('/app/admin/plaque-orders')}
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Plaque Orders Management
              <span className="text-sm font-normal text-muted-foreground ml-2">Click to manage →</span>
            </h2>
            <PlaqueOrdersWidget />
          </div>
        </TabsContent>

        {/* Feature Toggles Tab */}
        <TabsContent value="features">
          <Card className="bg-card/50 backdrop-blur-xl border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ToggleLeft className="h-5 w-5 text-primary" />
                Feature Toggles
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Enable or disable features across the platform. Disabled features will be hidden from users.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {togglesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">MT5 Connection</Label>
                      <p className="text-sm text-muted-foreground">Allow users to connect MT5 accounts in Account Details</p>
                    </div>
                    <Switch
                      checked={toggles.mt5_connection}
                      onCheckedChange={(checked) => handleToggleChange('mt5_connection', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">Plaque Orders</Label>
                      <p className="text-sm text-muted-foreground">Show ORDER button and My Orders in Certificates page</p>
                    </div>
                    <Switch
                      checked={toggles.plaque_orders}
                      onCheckedChange={(checked) => handleToggleChange('plaque_orders', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">Certificate Size Guide</Label>
                      <p className="text-sm text-muted-foreground">Show Prop Firm Certificate Sizes Guide in Help Center</p>
                    </div>
                    <Switch
                      checked={toggles.certificate_size_guide}
                      onCheckedChange={(checked) => handleToggleChange('certificate_size_guide', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">Loyalty Program</Label>
                      <p className="text-sm text-muted-foreground">Show Loyalty Rewards page and navigation link</p>
                    </div>
                    <Switch
                      checked={toggles.loyalty_program}
                      onCheckedChange={(checked) => handleToggleChange('loyalty_program', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">Partner Program</Label>
                      <p className="text-sm text-muted-foreground">Show Partner Program page and navigation link</p>
                    </div>
                    <Switch
                      checked={toggles.partner_program}
                      onCheckedChange={(checked) => handleToggleChange('partner_program', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">Google Sign-In</Label>
                      <p className="text-sm text-muted-foreground">Show Google Sign-In button on authentication page</p>
                    </div>
                    <Switch
                      checked={toggles.google_sign_in}
                      onCheckedChange={(checked) => handleToggleChange('google_sign_in', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">Invitation Contest</Label>
                      <p className="text-sm text-muted-foreground">Show invitation contest page and navigation link</p>
                    </div>
                    <Switch
                      checked={toggles.invitation_contest}
                      onCheckedChange={(checked) => handleToggleChange('invitation_contest', checked)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}