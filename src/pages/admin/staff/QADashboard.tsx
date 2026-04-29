import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useStaffPermissions } from '@/hooks/useStaffPermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle,
  Bug,
  Shield,
  BookOpen,
  FileText,
  Activity,
  Database,
  AlertTriangle,
  CheckSquare,
  XCircle
} from 'lucide-react';

interface QAStats {
  totalCourses: number;
  publishedCourses: number;
  coursesWithoutLessons: number;
  totalLessons: number;
  lessonsWithoutVideo: number;
  totalSupportTickets: number;
  openTickets: number;
  closedTickets: number;
  totalUsers: number;
  activeStaff: number;
}

export default function QADashboard() {
  const navigate = useNavigate();
  const { hasAccessToSection, isCEO, loading: permLoading } = useStaffPermissions();
  const [stats, setStats] = useState<QAStats>({
    totalCourses: 0,
    publishedCourses: 0,
    coursesWithoutLessons: 0,
    totalLessons: 0,
    lessonsWithoutVideo: 0,
    totalSupportTickets: 0,
    openTickets: 0,
    closedTickets: 0,
    totalUsers: 0,
    activeStaff: 0
  });
  const [loading, setLoading] = useState(true);
  const [qualityIssues, setQualityIssues] = useState<any[]>([]);

  const canAccess = isCEO || hasAccessToSection('staff/qa');

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
      const [
        coursesResult,
        lessonsResult,
        ticketsResult,
        profilesResult,
        staffResult
      ] = await Promise.all([
        supabase.from('courses').select('id, published, title'),
        supabase.from('lessons').select('id, course_id, video_url, title'),
        supabase.from('support_tickets').select('id, status'),
        supabase.from('profiles').select('id'),
        supabase.from('staff').select('id, status')
      ]);

      const courses = coursesResult.data || [];
      const lessons = lessonsResult.data || [];
      const tickets = ticketsResult.data || [];
      const profiles = profilesResult.data || [];
      const staff = staffResult.data || [];

      // Find courses without lessons
      const courseIds = new Set(lessons.map(l => l.course_id));
      const coursesWithoutLessons = courses.filter(c => !courseIds.has(c.id));

      // Find lessons without video
      const lessonsWithoutVideo = lessons.filter(l => !l.video_url);

      setStats({
        totalCourses: courses.length,
        publishedCourses: courses.filter(c => c.published).length,
        coursesWithoutLessons: coursesWithoutLessons.length,
        totalLessons: lessons.length,
        lessonsWithoutVideo: lessonsWithoutVideo.length,
        totalSupportTickets: tickets.length,
        openTickets: tickets.filter(t => t.status === 'open').length,
        closedTickets: tickets.filter(t => t.status === 'closed').length,
        totalUsers: profiles.length,
        activeStaff: staff.filter(s => s.status === 'active').length
      });

      // Generate quality issues list
      const issues: any[] = [];

      if (coursesWithoutLessons.length > 0) {
        issues.push({
          type: 'warning',
          title: 'Courses without lessons',
          description: `${coursesWithoutLessons.length} course(s) have no lessons attached`,
          items: coursesWithoutLessons.map(c => c.title)
        });
      }

      if (lessonsWithoutVideo.length > 0) {
        issues.push({
          type: 'info',
          title: 'Lessons without video',
          description: `${lessonsWithoutVideo.length} lesson(s) are missing video content`,
          items: lessonsWithoutVideo.slice(0, 5).map(l => l.title)
        });
      }

      const unpublishedCourses = courses.filter(c => !c.published);
      if (unpublishedCourses.length > 0) {
        issues.push({
          type: 'info',
          title: 'Unpublished courses',
          description: `${unpublishedCourses.length} course(s) are in draft mode`,
          items: unpublishedCourses.map(c => c.title)
        });
      }

      setQualityIssues(issues);
    } catch (error) {
      console.error('Error loading QA stats:', error);
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

  const systemHealthScore = () => {
    let score = 100;
    if (stats.coursesWithoutLessons > 0) score -= 15;
    if (stats.lessonsWithoutVideo > 0) score -= 10;
    if (stats.openTickets > 5) score -= 10;
    if (stats.publishedCourses === 0 && stats.totalCourses > 0) score -= 20;
    return Math.max(score, 0);
  };

  const healthScore = systemHealthScore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/app/admin/staff/cto')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-600/20 border border-teal-500/30">
          <Shield className="h-8 w-8 text-teal-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-cyan-600 bg-clip-text text-transparent">
            QA Dashboard
          </h1>
          <p className="text-muted-foreground">Quality Assurance & System Health</p>
        </div>
      </div>

      {/* System Health Score */}
      <Card className={`bg-card/50 backdrop-blur-xl border-border/50 ${
        healthScore >= 80 ? 'border-green-500/30' : healthScore >= 50 ? 'border-yellow-500/30' : 'border-red-500/30'
      }`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">System Health Score</p>
              <p className={`text-5xl font-bold mt-2 ${
                healthScore >= 80 ? 'text-green-400' : healthScore >= 50 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {healthScore}%
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {healthScore >= 80 ? 'System is healthy' : healthScore >= 50 ? 'Some issues need attention' : 'Critical issues detected'}
              </p>
            </div>
            <div className={`p-4 rounded-2xl ${
              healthScore >= 80 ? 'bg-green-500/10' : healthScore >= 50 ? 'bg-yellow-500/10' : 'bg-red-500/10'
            }`}>
              {healthScore >= 80 ? (
                <CheckCircle2 className="h-12 w-12 text-green-400" />
              ) : healthScore >= 50 ? (
                <AlertCircle className="h-12 w-12 text-yellow-400" />
              ) : (
                <XCircle className="h-12 w-12 text-red-400" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Courses</p>
                <p className="text-3xl font-bold mt-1">{stats.totalCourses}</p>
                <p className="text-xs text-muted-foreground mt-1">{stats.publishedCourses} published</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10">
                <BookOpen className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Lessons</p>
                <p className="text-3xl font-bold mt-1">{stats.totalLessons}</p>
                <p className="text-xs text-muted-foreground mt-1">{stats.lessonsWithoutVideo} without video</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/10">
                <FileText className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Support Tickets</p>
                <p className="text-3xl font-bold mt-1">{stats.totalSupportTickets}</p>
                <p className="text-xs text-muted-foreground mt-1">{stats.openTickets} open</p>
              </div>
              <div className="p-3 rounded-xl bg-yellow-500/10">
                <Bug className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Platform Status</p>
                <p className="text-3xl font-bold mt-1">{stats.totalUsers}</p>
                <p className="text-xs text-muted-foreground mt-1">{stats.activeStaff} active staff</p>
              </div>
              <div className="p-3 rounded-xl bg-green-500/10">
                <Database className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quality Issues & Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quality Issues */}
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              Quality Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            {qualityIssues.length === 0 ? (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                <p className="text-green-400">No quality issues detected!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {qualityIssues.map((issue, index) => (
                  <div key={index} className={`p-4 rounded-lg border ${
                    issue.type === 'warning' 
                      ? 'bg-yellow-500/10 border-yellow-500/20' 
                      : 'bg-blue-500/10 border-blue-500/20'
                  }`}>
                    <div className="flex items-start gap-3">
                      {issue.type === 'warning' ? (
                        <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{issue.title}</p>
                        <p className="text-sm text-muted-foreground">{issue.description}</p>
                        {issue.items && issue.items.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {issue.items.slice(0, 3).map((item: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {item}
                              </Badge>
                            ))}
                            {issue.items.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{issue.items.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* QA Checklist */}
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-teal-400" />
              System Checklist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  {stats.publishedCourses > 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-400" />
                  )}
                  <span>Published courses available</span>
                </div>
                <Badge variant="outline">{stats.publishedCourses > 0 ? 'Pass' : 'Fail'}</Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  {stats.coursesWithoutLessons === 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-400" />
                  )}
                  <span>All courses have lessons</span>
                </div>
                <Badge variant="outline">{stats.coursesWithoutLessons === 0 ? 'Pass' : 'Fail'}</Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  {stats.lessonsWithoutVideo === 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-400" />
                  )}
                  <span>All lessons have video</span>
                </div>
                <Badge variant="outline">{stats.lessonsWithoutVideo === 0 ? 'Pass' : 'Warning'}</Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  {stats.openTickets <= 5 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-400" />
                  )}
                  <span>Support tickets under control</span>
                </div>
                <Badge variant="outline">{stats.openTickets <= 5 ? 'Pass' : 'Warning'}</Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  {stats.activeStaff > 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-400" />
                  )}
                  <span>Active staff available</span>
                </div>
                <Badge variant="outline">{stats.activeStaff > 0 ? 'Pass' : 'Fail'}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ticket Status */}
        <Card className="bg-card/50 backdrop-blur-xl border-border/50 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-400" />
              Support Ticket Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
                <p className="text-3xl font-bold text-yellow-400">{stats.openTickets}</p>
                <p className="text-sm text-muted-foreground mt-1">Open Tickets</p>
              </div>
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                <p className="text-3xl font-bold text-green-400">{stats.closedTickets}</p>
                <p className="text-sm text-muted-foreground mt-1">Resolved Tickets</p>
              </div>
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                <p className="text-3xl font-bold text-blue-400">{stats.totalSupportTickets}</p>
                <p className="text-sm text-muted-foreground mt-1">Total Tickets</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
