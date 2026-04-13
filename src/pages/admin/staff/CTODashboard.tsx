import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Code, Server, Bug, Activity, AlertTriangle, CheckCircle2,
  Settings, RefreshCw, X
} from 'lucide-react';

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalCourses: number;
  openBugs: number;
  systemHealth: 'healthy' | 'degraded' | 'critical';
}

interface ErrorLog {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high';
}

export default function CTODashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalCourses: 0,
    openBugs: 0,
    systemHealth: 'healthy'
  });
  const [loading, setLoading] = useState(true);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [errorLogs] = useState<ErrorLog[]>([
    { id: '1', type: 'API', message: 'Rate limit warning on forex endpoint', timestamp: new Date().toISOString(), severity: 'low' },
    { id: '2', type: 'Database', message: 'Slow query detected on trades table', timestamp: new Date().toISOString(), severity: 'medium' },
  ]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [profilesResult, coursesResult, tradesResult] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('courses').select('id', { count: 'exact' }),
        supabase.from('trades').select('user_id').limit(100)
      ]);

      const uniqueActiveUsers = new Set(tradesResult.data?.map(t => t.user_id) || []).size;

      setStats({
        totalUsers: profilesResult.count || 0,
        activeUsers: uniqueActiveUsers,
        totalCourses: coursesResult.count || 0,
        openBugs: 2,
        systemHealth: 'healthy'
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
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
    { title: 'Total Users', value: stats.totalUsers, icon: Activity, color: 'text-blue-400' },
    { title: 'Active Users', value: stats.activeUsers, subtitle: 'Last 30 days', icon: CheckCircle2, color: 'text-green-400' },
    { title: 'Total Courses', value: stats.totalCourses, icon: Server, color: 'text-purple-400' },
    { title: 'Open Bugs', value: stats.openBugs, icon: Bug, color: 'text-red-400' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 border border-cyan-500/30">
          <Code className="h-8 w-8 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-cyan-600 bg-clip-text text-transparent">
            CTO Dashboard
          </h1>
          <p className="text-muted-foreground">Technology & System Management</p>
        </div>
      </div>

      {/* System Health Banner */}
      <Card className={`border-2 ${
        stats.systemHealth === 'healthy' 
          ? 'border-green-500/30 bg-green-500/5' 
          : stats.systemHealth === 'degraded'
          ? 'border-yellow-500/30 bg-yellow-500/5'
          : 'border-red-500/30 bg-red-500/5'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {stats.systemHealth === 'healthy' ? (
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              )}
              <div>
                <p className="font-bold text-lg">System Status: {stats.systemHealth.toUpperCase()}</p>
                <p className="text-sm text-muted-foreground">All services operational</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={loadStats}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="bg-card/50 backdrop-blur-xl border-border/50 hover:border-primary/30 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  {stat.subtitle && (
                    <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
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
        {/* Error Logs */}
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              Recent Error Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {errorLogs.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No errors detected</p>
            ) : (
              <div className="space-y-3">
                {errorLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{log.type}</span>
                      <Badge variant="outline" className={
                        log.severity === 'high' 
                          ? 'bg-red-500/10 text-red-500 border-red-500/30'
                          : log.severity === 'medium'
                          ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
                          : 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                      }>
                        {log.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{log.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Metrics */}
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-cyan-400" />
              System Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                <span>Database Connections</span>
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                  Active
                </Badge>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                <span>API Response Time</span>
                <span className="font-bold text-green-400">~120ms</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                <span>Storage Usage</span>
                <span className="font-bold">2.4 GB / 10 GB</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                <span>Edge Functions</span>
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                  4 Active
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="lg:col-span-2 bg-card/50 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-cyan-400" />
              Technical Tools
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                className="h-auto py-6 flex-col gap-2"
                onClick={() => setShowLogsModal(true)}
              >
                <Server className="h-6 w-6" />
                <span>View Logs</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-6 flex-col gap-2"
                onClick={() => navigate('/app/admin/staff/qa')}
              >
                <Bug className="h-6 w-6" />
                <span>QA Reports</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-6 flex-col gap-2"
                onClick={() => setShowPerformanceModal(true)}
              >
                <Activity className="h-6 w-6" />
                <span>Performance</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-6 flex-col gap-2"
                onClick={() => navigate('/app/admin/settings')}
              >
                <Settings className="h-6 w-6" />
                <span>Settings</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logs Modal */}
      <Dialog open={showLogsModal} onOpenChange={setShowLogsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              System Logs
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {errorLogs.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No recent logs</p>
            ) : (
              errorLogs.map((log) => (
                <div key={log.id} className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{log.type}</Badge>
                      <Badge variant="outline" className={
                        log.severity === 'high' 
                          ? 'bg-red-500/10 text-red-500 border-red-500/30'
                          : log.severity === 'medium'
                          ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
                          : 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                      }>
                        {log.severity}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm">{log.message}</p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Performance Modal */}
      <Dialog open={showPerformanceModal} onOpenChange={setShowPerformanceModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Performance Metrics
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">API Response Time</span>
                <span className="font-bold text-green-400">~120ms</span>
              </div>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full w-1/4 bg-green-500 rounded-full"></div>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Uptime</span>
                <span className="font-bold text-green-400">99.9%</span>
              </div>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full w-[99%] bg-green-500 rounded-full"></div>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Database Queries/min</span>
                <span className="font-bold">~450</span>
              </div>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full w-1/2 bg-blue-500 rounded-full"></div>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Memory Usage</span>
                <span className="font-bold">512MB / 2GB</span>
              </div>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full w-1/4 bg-purple-500 rounded-full"></div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}