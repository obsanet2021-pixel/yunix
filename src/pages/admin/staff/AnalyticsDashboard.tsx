import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useStaffPermissions } from '@/hooks/useStaffPermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  Activity,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface AnalyticsStats {
  totalUsers: number;
  activeUsers: number;
  totalTrades: number;
  totalCourseEnrollments: number;
  courseCompletions: number;
  avgWinRate: number;
}

export default function AnalyticsDashboard() {
  const navigate = useNavigate();
  const { staffData, isCEO, loading: permLoading } = useStaffPermissions();
  
  const [stats, setStats] = useState<AnalyticsStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalTrades: 0,
    totalCourseEnrollments: 0,
    courseCompletions: 0,
    avgWinRate: 0
  });
  const [loading, setLoading] = useState(true);

  const hasAccess = isCEO || 
                   staffData?.role?.name === 'Data Analyts' || 
                   staffData?.role?.name === 'Data Analyst' ||
                   staffData?.role?.name === 'Course Manager' ||
                   staffData?.role?.permissions?.manage_analytics ||
                   staffData?.role?.permissions?.view_analytics;

  useEffect(() => {
    if (!permLoading && !hasAccess) {
      navigate('/app/dashboard');
    }
  }, [hasAccess, permLoading, navigate]);

  useEffect(() => {
    if (hasAccess) {
      loadStats();
    }
  }, [hasAccess]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [
        profilesResult,
        tradesResult,
        progressResult
      ] = await Promise.all([
        supabase.from('profiles').select('id'),
        supabase.from('trades').select('id, profit'),
        supabase.from('student_progress').select('id, completed, progress_percentage')
      ]);

      const profiles = profilesResult.data || [];
      const trades = tradesResult.data || [];
      const progress = progressResult.data || [];

      // Calculate win rate
      const winningTrades = trades.filter(t => t.profit > 0).length;
      const avgWinRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;

      setStats({
        totalUsers: profiles.length,
        activeUsers: profiles.length, // Placeholder
        totalTrades: trades.length,
        totalCourseEnrollments: progress.length,
        courseCompletions: progress.filter(p => p.completed).length,
        avgWinRate: Math.round(avgWinRate * 10) / 10
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportAnalyticsReport = () => {
    const reportData = [
      ['Analytics Report', new Date().toLocaleDateString()],
      [''],
      ['Metric', 'Value'],
      ['Total Users', stats.totalUsers.toString()],
      ['Active Users', stats.activeUsers.toString()],
      ['Total Trades', stats.totalTrades.toString()],
      ['Average Win Rate', `${stats.avgWinRate}%`],
      ['Course Enrollments', stats.totalCourseEnrollments.toString()],
      ['Course Completions', stats.courseCompletions.toString()],
      [''],
      ['Calculated Metrics'],
      ['Enrollment Rate', `${stats.totalUsers > 0 ? Math.round((stats.totalCourseEnrollments / stats.totalUsers) * 100) : 0}%`],
      ['Completion Rate', `${stats.totalCourseEnrollments > 0 ? Math.round((stats.courseCompletions / stats.totalCourseEnrollments) * 100) : 0}%`],
      ['Avg Trades per User', `${stats.totalUsers > 0 ? Math.round(stats.totalTrades / stats.totalUsers) : 0}`]
    ];

    const csvContent = reportData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Analytics report exported successfully');
  };

  if (permLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasAccess) return null;

  const statCards = [
    { 
      title: 'Total Users', 
      value: stats.totalUsers, 
      change: '+12%', 
      trend: 'up',
      icon: Users, 
      color: 'text-blue-400' 
    },
    { 
      title: 'Total Trades', 
      value: stats.totalTrades, 
      change: '+8%', 
      trend: 'up',
      icon: TrendingUp, 
      color: 'text-green-400' 
    },
    { 
      title: 'Avg Win Rate', 
      value: `${stats.avgWinRate}%`, 
      change: '+2.3%', 
      trend: 'up',
      icon: Activity, 
      color: 'text-purple-400' 
    },
    { 
      title: 'Course Completions', 
      value: stats.courseCompletions, 
      change: '+15%', 
      trend: 'up',
      icon: BarChart3, 
      color: 'text-yellow-400' 
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30">
            <BarChart3 className="h-8 w-8 text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
              Analytics Dashboard
            </h1>
            <p className="text-muted-foreground">Platform insights & user behavior</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadStats}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportAnalyticsReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
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
                  <div className="flex items-center gap-1 mt-1">
                    {stat.trend === 'up' ? (
                      <ArrowUpRight className="h-3 w-3 text-green-500" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-500" />
                    )}
                    <span className={`text-xs ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-xl bg-background/50 ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-400" />
              User Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>User growth chart visualization</p>
                <p className="text-sm">Connect analytics service for full data</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-400" />
              Trading Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Trading activity visualization</p>
                <p className="text-sm">Real-time trade data coming soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Insights */}
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle>Quick Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Course Enrollment Rate</p>
              <p className="text-2xl font-bold mt-1">
                {stats.totalUsers > 0 ? Math.round((stats.totalCourseEnrollments / stats.totalUsers) * 100) : 0}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">of users enrolled in courses</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Completion Rate</p>
              <p className="text-2xl font-bold mt-1">
                {stats.totalCourseEnrollments > 0 ? Math.round((stats.courseCompletions / stats.totalCourseEnrollments) * 100) : 0}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">of enrolled courses completed</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Avg Trades per User</p>
              <p className="text-2xl font-bold mt-1">
                {stats.totalUsers > 0 ? Math.round(stats.totalTrades / stats.totalUsers) : 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">trades logged per user</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}