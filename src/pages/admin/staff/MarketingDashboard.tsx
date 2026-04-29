import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useStaffPermissions } from '@/hooks/useStaffPermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  TrendingUp, 
  Users, 
  BookOpen,
  UserPlus,
  Activity,
  Target,
  PieChart,
  Calendar,
  BarChart3,
  Megaphone
} from 'lucide-react';

interface MarketingStats {
  totalUsers: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  totalCourseEnrollments: number;
  completedEnrollments: number;
  personalAccounts: number;
  evaluationAccounts: number;
  fundedAccounts: number;
  activePropFirms: number;
}

export default function MarketingDashboard() {
  const navigate = useNavigate();
  const { hasAccessToSection, isCEO, loading: permLoading } = useStaffPermissions();
  const [stats, setStats] = useState<MarketingStats>({
    totalUsers: 0,
    newUsersThisWeek: 0,
    newUsersThisMonth: 0,
    totalCourseEnrollments: 0,
    completedEnrollments: 0,
    personalAccounts: 0,
    evaluationAccounts: 0,
    fundedAccounts: 0,
    activePropFirms: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);

  const canAccess = isCEO || hasAccessToSection('staff/marketing');

  useEffect(() => {
    if (!permLoading && !canAccess) {
      navigate('/app/dashboard');
    }
  }, [canAccess, permLoading, navigate]);

  useEffect(() => {
    if (canAccess) {
      loadStats();
    }
  }, [canAccess]);

  const loadStats = async () => {
    try {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [
        profilesResult,
        recentProfilesWeekResult,
        recentProfilesMonthResult,
        progressResult,
        propFirmsResult
      ] = await Promise.all([
        supabase.from('profiles').select('id, account_type, created_at'),
        supabase.from('profiles').select('id').gte('created_at', weekAgo.toISOString()),
        supabase.from('profiles').select('id').gte('created_at', monthAgo.toISOString()),
        supabase.from('student_progress').select('id, completed'),
        supabase.from('prop_firms').select('id, account_type')
      ]);

      const profiles = profilesResult.data || [];
      const weekProfiles = recentProfilesWeekResult.data || [];
      const monthProfiles = recentProfilesMonthResult.data || [];
      const progress = progressResult.data || [];
      const propFirms = propFirmsResult.data || [];

      setStats({
        totalUsers: profiles.length,
        newUsersThisWeek: weekProfiles.length,
        newUsersThisMonth: monthProfiles.length,
        totalCourseEnrollments: progress.length,
        completedEnrollments: progress.filter(p => p.completed).length,
        personalAccounts: profiles.filter(p => p.account_type === 'Personal').length,
        evaluationAccounts: profiles.filter(p => p.account_type === 'Evaluation').length,
        fundedAccounts: profiles.filter(p => p.account_type === 'Funded').length,
        activePropFirms: propFirms.length
      });

      // Get recent users
      const { data: recent } = await supabase
        .from('profiles')
        .select('id, name, email, account_type, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentUsers(recent || []);
    } catch (error) {
      console.error('Error loading marketing stats:', error);
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

  if (!canAccess) {
    return null;
  }

  const conversionRate = stats.totalCourseEnrollments > 0 
    ? Math.round((stats.completedEnrollments / stats.totalCourseEnrollments) * 100) 
    : 0;

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/app/dashboard')}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-600/20 border border-pink-500/30 shrink-0">
            <Target className="h-6 w-6 sm:h-8 sm:w-8 text-pink-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-pink-400 to-purple-600 bg-clip-text text-transparent truncate">
              Marketing Dashboard
            </h1>
            <p className="text-muted-foreground text-xs sm:text-base truncate">User Acquisition & Engagement Analytics</p>
          </div>
        </div>
        <Button onClick={() => navigate('/app/admin/staff/social-media')} className="w-full sm:w-auto sm:ml-auto">
          <Megaphone className="h-4 w-4 mr-2" />
          Social Media
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-3xl font-bold mt-1">{stats.totalUsers}</p>
                <p className="text-xs text-green-500 mt-1">+{stats.newUsersThisMonth} this month</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">New This Week</p>
                <p className="text-3xl font-bold mt-1">{stats.newUsersThisWeek}</p>
                <p className="text-xs text-muted-foreground mt-1">User registrations</p>
              </div>
              <div className="p-3 rounded-xl bg-green-500/10">
                <UserPlus className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Course Enrollments</p>
                <p className="text-3xl font-bold mt-1">{stats.totalCourseEnrollments}</p>
                <p className="text-xs text-muted-foreground mt-1">{stats.completedEnrollments} completed</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/10">
                <BookOpen className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-3xl font-bold mt-1">{conversionRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">Course completions</p>
              </div>
              <div className="p-3 rounded-xl bg-yellow-500/10">
                <TrendingUp className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Demographics */}
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-pink-400" />
              User Demographics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                  <span>Personal Accounts</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{stats.personalAccounts}</span>
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                    {stats.totalUsers > 0 ? Math.round((stats.personalAccounts / stats.totalUsers) * 100) : 0}%
                  </Badge>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <span>Evaluation Accounts</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{stats.evaluationAccounts}</span>
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                    {stats.totalUsers > 0 ? Math.round((stats.evaluationAccounts / stats.totalUsers) * 100) : 0}%
                  </Badge>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  <span>Funded Accounts</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{stats.fundedAccounts}</span>
                  <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                    {stats.totalUsers > 0 ? Math.round((stats.fundedAccounts / stats.totalUsers) * 100) : 0}%
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Platform Engagement */}
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-400" />
              Platform Engagement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                <span>Active Prop Firm Accounts</span>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                  {stats.activePropFirms}
                </Badge>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                <span>Course Engagement</span>
                <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                  {stats.totalCourseEnrollments} enrollments
                </Badge>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                <span>Growth This Week</span>
                <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                  +{stats.newUsersThisWeek} users
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Registrations */}
        <Card className="bg-card/50 backdrop-blur-xl border-border/50 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-400" />
              Recent User Registrations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentUsers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No recent registrations</p>
            ) : (
              <div className="space-y-3">
                {recentUsers.map((user) => (
                  <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shrink-0">
                        <span className="text-white font-bold">
                          {(user.name || user.email || '?')[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{user.name || 'Anonymous'}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-13 sm:ml-0">
                      <Badge variant="outline" className="text-xs shrink-0">
                        {user.account_type || 'Personal'}
                      </Badge>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
