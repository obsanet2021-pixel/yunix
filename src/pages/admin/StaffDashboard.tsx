import { useNavigate } from 'react-router-dom';
import { useStaffPermissions } from '@/hooks/useStaffPermissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, CheckCircle2, Shield, User, Briefcase } from 'lucide-react';

export default function StaffDashboard() {
  const navigate = useNavigate();
  const { staffData, isCEO, permissions, loading, getStaffDashboardRoute } = useStaffPermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const roleName = staffData?.role?.name || 'Staff';
  const dashboardRoute = getStaffDashboardRoute();

  // Get list of active permissions for display
  const activePermissions = permissions 
    ? Object.entries(permissions)
        .filter(([_, value]) => value === true)
        .map(([key]) => key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/app/dashboard')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Welcome, {staffData?.name || 'Staff Member'}</h1>
          <p className="text-muted-foreground">Your staff dashboard</p>
        </div>
      </div>

      {/* Role Card - Access Your Assigned Dashboard */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/20">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Your Role: {roleName}</CardTitle>
                <CardDescription>Access your role-specific dashboard and tools</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              {isCEO ? 'CEO' : 'Staff'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Button 
            size="lg" 
            className="w-full gap-2"
            onClick={() => navigate(dashboardRoute)}
          >
            <Shield className="h-5 w-5" />
            Access {roleName} Dashboard
            <ArrowRight className="h-5 w-5 ml-auto" />
          </Button>
        </CardContent>
      </Card>

      {/* Staff Info Card */}
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Staff Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{staffData?.name || 'N/A'}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{staffData?.email || 'N/A'}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Role</p>
              <p className="font-medium">{roleName}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={staffData?.status === 'active' ? 'default' : 'secondary'}>
                {staffData?.status || 'Unknown'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permissions Card */}
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Your Permissions
          </CardTitle>
          <CardDescription>
            {isCEO ? 'As CEO, you have full access to all features' : 'Permissions granted to your role'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isCEO ? (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <p className="text-green-500 font-medium flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Full Administrative Access
              </p>
            </div>
          ) : activePermissions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {activePermissions.map((permission) => (
                <Badge key={permission} variant="secondary" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {permission}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No specific permissions assigned</p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-auto py-6 justify-start"
              onClick={() => navigate(dashboardRoute)}
            >
              <div className="text-left">
                <p className="font-medium">Go to {roleName} Dashboard</p>
                <p className="text-sm text-muted-foreground">Access your role-specific tools</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-6 justify-start"
              onClick={() => navigate('/app/dashboard')}
            >
              <div className="text-left">
                <p className="font-medium">User Dashboard</p>
                <p className="text-sm text-muted-foreground">View your trading overview</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
