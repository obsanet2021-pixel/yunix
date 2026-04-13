import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStaffPermissions } from "@/hooks/useStaffPermissions";
import { useCOODashboardData } from "@/hooks/useCOODashboardData";
import { MetricCard } from "@/components/coo/MetricCard";
import { SeverityBadge } from "@/components/coo/SeverityBadge";
import { KanbanSummary } from "@/components/coo/KanbanSummary";
import { SystemStatusIndicator } from "@/components/coo/SystemStatusIndicator";
import { DepartmentCard } from "@/components/coo/DepartmentCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Code2,
  Copy,
  CreditCard,
  Database,
  DollarSign,
  Download,
  FileText,
  Gauge,
  Headphones,
  History,
  LayoutDashboard,
  Lightbulb,
  Lock,
  Package,
  Power,
  RefreshCw,
  Server,
  Settings,
  Shield,
  Target,
  TrendingUp,
  Users,
  UserPlus,
  Zap,
} from "lucide-react";
import { format } from "date-fns";
import { StaffRemindersPanel } from "@/components/coo/StaffRemindersPanel";

export default function COODashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { staffData, isCEO, loading: permissionsLoading } = useStaffPermissions();
  const { stats, recentActivity, loading, refresh } = useCOODashboardData();
  const [activeTab, setActiveTab] = useState("overview");
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const isCOO = staffData?.role?.name === "COO";

  // Comprehensive Export to CSV - All Sections Data
  const exportToCSV = () => {
    if (!stats) return;
    
    // Build comprehensive CSV with all sections
    let csvContent = `YUNIX COO COMPREHENSIVE OPERATIONS REPORT
Generated: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}
Report Period: Current Snapshot

================================================================================
SECTION 1: EXECUTIVE SUMMARY
================================================================================
Metric,Value,Status
Operational Health Score,${stats.operationalHealthScore}%,${stats.operationalHealthScore >= 80 ? 'Good' : stats.operationalHealthScore >= 60 ? 'Warning' : 'Critical'}
Active Operations Today,${stats.activeOperationsToday},Active
System Uptime,${stats.systemUptime}%,${stats.systemUptime >= 99 ? 'Excellent' : 'Needs Attention'}
Critical Issues,${stats.criticalIssues},${stats.criticalIssues === 0 ? 'Clear' : 'Action Required'}
Week Over Week Change,${stats.weekOverWeekChange}%,${stats.weekOverWeekChange >= 0 ? 'Positive' : 'Negative'}

================================================================================
SECTION 2: OPERATIONS PERFORMANCE
================================================================================
Metric,Value,Target,Status
Process Completion Rate,${stats.processCompletionRate}%,85%,${stats.processCompletionRate >= 85 ? 'Met' : 'Below Target'}
Average Turnaround Time,${stats.avgTurnaroundTime} days,3 days,${stats.avgTurnaroundTime <= 3 ? 'Met' : 'Below Target'}
SLA Compliance,${stats.slaCompliance}%,95%,${stats.slaCompliance >= 95 ? 'Met' : 'Below Target'}
Error Rate,${stats.errorRate}%,<5%,${stats.errorRate <= 5 ? 'Met' : 'Above Threshold'}
Payment Success Rate,${stats.paymentSuccessRate}%,98%,${stats.paymentSuccessRate >= 98 ? 'Met' : 'Below Target'}

================================================================================
SECTION 3: TEAM & WORKFORCE
================================================================================
Metric,Value
Active Staff,${stats.activeStaff}
Total Staff,${stats.totalStaff}
Staff Utilization Rate,${stats.totalStaff > 0 ? Math.round((stats.activeStaff / stats.totalStaff) * 100) : 0}%
Tasks Completed,${stats.tasksCompleted}
Tasks Assigned,${stats.tasksAssigned}
Task Completion Rate,${stats.tasksAssigned > 0 ? Math.round((stats.tasksCompleted / stats.tasksAssigned) * 100) : 0}%

================================================================================
SECTION 4: TASK MANAGEMENT (KANBAN)
================================================================================
Status,Count
Todo,${stats.todoTasks}
In Progress,${stats.inProgressTasks}
Completed,${stats.doneTasks}
Overdue,${stats.overdueTasks}

================================================================================
SECTION 5: SUPPORT METRICS
================================================================================
Metric,Value
Open Tickets,${stats.openTickets}
Closed Tickets,${stats.closedTickets}
Total Tickets,${stats.openTickets + stats.closedTickets}
Resolution Rate,${(stats.openTickets + stats.closedTickets) > 0 ? Math.round((stats.closedTickets / (stats.openTickets + stats.closedTickets)) * 100) : 0}%

================================================================================
SECTION 6: USER METRICS
================================================================================
Metric,Value
Total Users,${stats.totalUsers}
Active Users,${stats.activeUsers}
New Users This Week,${stats.newUsersThisWeek}
New Users Last Week,${stats.newUsersLastWeek}
Week-over-Week Growth,${stats.newUsersLastWeek > 0 ? Math.round(((stats.newUsersThisWeek - stats.newUsersLastWeek) / stats.newUsersLastWeek) * 100) : 0}%

================================================================================
SECTION 7: COURSE PERFORMANCE
================================================================================
Metric,Value
Published Courses,${stats.publishedCourses}
Total Enrollments,${stats.totalEnrollments}
Average Enrollments per Course,${stats.publishedCourses > 0 ? Math.round(stats.totalEnrollments / stats.publishedCourses) : 0}

================================================================================
SECTION 8: ORDER MANAGEMENT
================================================================================
Metric,Value
Pending Orders,${stats.pendingOrders}
Delivered Orders,${stats.deliveredOrders}
Total Orders,${stats.totalOrders}
Fulfillment Rate,${stats.totalOrders > 0 ? Math.round((stats.deliveredOrders / stats.totalOrders) * 100) : 0}%

================================================================================
SECTION 9: REVENUE METRICS
================================================================================
Metric,Value
Total Revenue,$${stats.totalRevenue.toLocaleString()}
Pending Revenue,$${stats.pendingRevenue.toLocaleString()}
Weekly Revenue,$${stats.weeklyRevenue.toLocaleString()}
Revenue Growth,${stats.revenueGrowth}%

================================================================================
SECTION 10: USER GROWTH DATA (Last 30 Days)
================================================================================
Date,New Users
${stats.userGrowthData.map(d => `${format(new Date(d.date), 'yyyy-MM-dd')},${d.users}`).join('\n')}

================================================================================
SECTION 11: COURSE COMPLETION RATES
================================================================================
Course,Completion Rate,Enrollments
${stats.courseCompletionRates.map(c => `"${c.course}",${c.rate}%,${c.enrollments}`).join('\n')}

================================================================================
END OF REPORT
================================================================================`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `coo-comprehensive-report-${format(new Date(), "yyyy-MM-dd-HHmmss")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({ title: "Export Complete", description: "Comprehensive report exported successfully" });
  };

  // Export to PDF - Generates a formatted document
  const exportToPDF = () => {
    if (!stats) return;
    
    // Create a new window with formatted content for PDF
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: "Error", description: "Please allow popups for PDF export", variant: "destructive" });
      return;
    }
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>COO Operations Report - ${format(new Date(), "yyyy-MM-dd")}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1a1a1a; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #f59e0b; padding-bottom: 20px; }
    .header h1 { color: #f59e0b; font-size: 28px; margin-bottom: 8px; }
    .header p { color: #666; font-size: 14px; }
    .section { margin-bottom: 30px; page-break-inside: avoid; }
    .section-title { background: #f59e0b; color: white; padding: 10px 15px; font-size: 16px; font-weight: bold; margin-bottom: 15px; }
    .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
    .metric-card { border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; text-align: center; }
    .metric-value { font-size: 24px; font-weight: bold; color: #1a1a1a; }
    .metric-label { font-size: 12px; color: #666; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
    th { background: #f9fafb; font-weight: 600; }
    .status-good { color: #22c55e; }
    .status-warning { color: #f59e0b; }
    .status-critical { color: #ef4444; }
    .footer { margin-top: 40px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px; color: #666; font-size: 12px; }
    @media print { body { padding: 20px; } .section { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>🐺 YUNIX COO OPERATIONS REPORT</h1>
    <p>Generated: ${format(new Date(), "MMMM dd, yyyy 'at' HH:mm")}</p>
  </div>

  <div class="section">
    <div class="section-title">Executive Summary</div>
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-value ${stats.operationalHealthScore >= 80 ? 'status-good' : stats.operationalHealthScore >= 60 ? 'status-warning' : 'status-critical'}">${stats.operationalHealthScore}%</div>
        <div class="metric-label">Operational Health</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${stats.activeOperationsToday}</div>
        <div class="metric-label">Active Operations</div>
      </div>
      <div class="metric-card">
        <div class="metric-value status-good">${stats.systemUptime}%</div>
        <div class="metric-label">System Uptime</div>
      </div>
      <div class="metric-card">
        <div class="metric-value ${stats.criticalIssues > 0 ? 'status-critical' : 'status-good'}">${stats.criticalIssues}</div>
        <div class="metric-label">Critical Issues</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Operations Performance</div>
    <table>
      <tr><th>Metric</th><th>Value</th><th>Target</th><th>Status</th></tr>
      <tr><td>Process Completion Rate</td><td>${stats.processCompletionRate}%</td><td>85%</td><td class="${stats.processCompletionRate >= 85 ? 'status-good' : 'status-warning'}">${stats.processCompletionRate >= 85 ? '✓ Met' : '⚠ Below'}</td></tr>
      <tr><td>SLA Compliance</td><td>${stats.slaCompliance}%</td><td>95%</td><td class="${stats.slaCompliance >= 95 ? 'status-good' : 'status-warning'}">${stats.slaCompliance >= 95 ? '✓ Met' : '⚠ Below'}</td></tr>
      <tr><td>Error Rate</td><td>${stats.errorRate}%</td><td>&lt;5%</td><td class="${stats.errorRate <= 5 ? 'status-good' : 'status-critical'}">${stats.errorRate <= 5 ? '✓ Met' : '✗ Above'}</td></tr>
      <tr><td>Payment Success Rate</td><td>${stats.paymentSuccessRate}%</td><td>98%</td><td class="${stats.paymentSuccessRate >= 98 ? 'status-good' : 'status-warning'}">${stats.paymentSuccessRate >= 98 ? '✓ Met' : '⚠ Below'}</td></tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Team & Workforce</div>
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-value">${stats.activeStaff}/${stats.totalStaff}</div>
        <div class="metric-label">Active/Total Staff</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${stats.tasksCompleted}</div>
        <div class="metric-label">Tasks Completed</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${stats.tasksAssigned}</div>
        <div class="metric-label">Tasks Assigned</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${stats.tasksAssigned > 0 ? Math.round((stats.tasksCompleted / stats.tasksAssigned) * 100) : 0}%</div>
        <div class="metric-label">Completion Rate</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Revenue & Orders</div>
    <table>
      <tr><th>Metric</th><th>Value</th></tr>
      <tr><td>Total Revenue</td><td>$${stats.totalRevenue.toLocaleString()}</td></tr>
      <tr><td>Weekly Revenue</td><td>$${stats.weeklyRevenue.toLocaleString()}</td></tr>
      <tr><td>Pending Revenue</td><td>$${stats.pendingRevenue.toLocaleString()}</td></tr>
      <tr><td>Revenue Growth</td><td class="${stats.revenueGrowth >= 0 ? 'status-good' : 'status-critical'}">${stats.revenueGrowth >= 0 ? '+' : ''}${stats.revenueGrowth}%</td></tr>
      <tr><td>Pending Orders</td><td>${stats.pendingOrders}</td></tr>
      <tr><td>Delivered Orders</td><td>${stats.deliveredOrders}</td></tr>
      <tr><td>Total Orders</td><td>${stats.totalOrders}</td></tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">User & Support Metrics</div>
    <table>
      <tr><th>Metric</th><th>Value</th></tr>
      <tr><td>Total Users</td><td>${stats.totalUsers}</td></tr>
      <tr><td>Active Users</td><td>${stats.activeUsers}</td></tr>
      <tr><td>New Users This Week</td><td>${stats.newUsersThisWeek}</td></tr>
      <tr><td>Open Support Tickets</td><td>${stats.openTickets}</td></tr>
      <tr><td>Closed Support Tickets</td><td>${stats.closedTickets}</td></tr>
      <tr><td>Resolution Rate</td><td>${(stats.openTickets + stats.closedTickets) > 0 ? Math.round((stats.closedTickets / (stats.openTickets + stats.closedTickets)) * 100) : 0}%</td></tr>
    </table>
  </div>

  <div class="footer">
    <p>YUNIX Trading Platform | COO Operations Report</p>
    <p>This report is auto-generated and confidential</p>
  </div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    toast({ title: "PDF Ready", description: "Print dialog opened - save as PDF" });
  };

  // Share Dashboard
  const shareDashboard = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast({ title: "Link Copied", description: "Dashboard URL copied to clipboard" });
  };

  // Toggle maintenance mode
  const toggleMaintenanceMode = async () => {
    try {
      const newValue = !maintenanceMode;
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: existing } = await supabase
        .from("system_settings")
        .select("id")
        .eq("key", "maintenance_mode")
        .single();

      if (existing) {
        await supabase
          .from("system_settings")
          .update({ value: { enabled: newValue }, updated_by: user?.id })
          .eq("key", "maintenance_mode");
      } else {
        await supabase
          .from("system_settings")
          .insert({ key: "maintenance_mode", value: { enabled: newValue }, updated_by: user?.id });
      }

      setMaintenanceMode(newValue);
      toast({
        title: newValue ? "Maintenance Mode Enabled" : "Maintenance Mode Disabled",
        description: newValue ? "Users will see maintenance page" : "Platform is now accessible",
      });
    } catch (error) {
      console.error("Error toggling maintenance:", error);
      toast({ title: "Error", description: "Failed to toggle maintenance mode", variant: "destructive" });
    }
  };

  // Load audit logs
  const loadAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const { data } = await supabase
        .from("system_settings")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(20);
      
      setAuditLogs(data || []);
    } catch (error) {
      console.error("Error loading audit logs:", error);
    } finally {
      setLoadingAudit(false);
    }
  };

  if (permissionsLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isCOO && !isCEO) {
    navigate("/app/dashboard");
    return null;
  }

  if (!stats) return null;

  const getHealthSeverity = (score: number): "critical" | "warning" | "normal" => {
    if (score < 60) return "critical";
    if (score < 80) return "warning";
    return "normal";
  };

  const processInsights = [
    {
      title: "Certificate Issuance",
      suggestion: "Automate certificate issuance to reduce delays by ~38%",
      impact: "High",
    },
    {
      title: "Payment Processing",
      suggestion: "Add payment reminder notifications to reduce pending payments",
      impact: "Medium",
    },
    {
      title: "Support Response",
      suggestion: "Implement AI-powered ticket routing for faster resolution",
      impact: "High",
    },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">COO Dashboard</h1>
          <p className="text-muted-foreground">Real-time operational command center</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Badge variant="outline" className="hidden sm:flex">
            Last updated: {format(new Date(), "HH:mm")}
          </Badge>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0">
            <TabsTrigger value="overview" className="gap-1">
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="operations" className="gap-1">
              <Gauge className="w-4 h-4" />
              <span className="hidden sm:inline">Operations</span>
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-1">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Team</span>
            </TabsTrigger>
            <TabsTrigger value="risk" className="gap-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="hidden sm:inline">Risk</span>
            </TabsTrigger>
            <TabsTrigger value="departments" className="gap-1">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Departments</span>
            </TabsTrigger>
            <TabsTrigger value="systems" className="gap-1">
              <Server className="w-4 h-4" />
              <span className="hidden sm:inline">Systems</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-1">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
          </TabsList>
        </ScrollArea>

        {/* Section 1: Executive Overview */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Critical Alerts Banner */}
          {stats.criticalIssues > 0 && (
            <Card className="border-red-500 bg-red-500/10">
              <CardContent className="flex items-center gap-3 py-3">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="font-medium text-red-500">
                  {stats.criticalIssues} critical issue(s) require immediate attention
                </span>
                <Button variant="destructive" size="sm" className="ml-auto">
                  View Issues
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Health Score Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricCard
              title="Operational Health"
              value={`${stats.operationalHealthScore}%`}
              icon={<Activity className="w-5 h-5 text-primary" />}
              severity={getHealthSeverity(stats.operationalHealthScore)}
              subtitle="Overall system health"
            />
            <MetricCard
              title="Active Operations"
              value={stats.activeOperationsToday}
              icon={<Zap className="w-5 h-5 text-yellow-500" />}
              subtitle="Tasks in progress today"
            />
            <MetricCard
              title="System Uptime"
              value={`${stats.systemUptime}%`}
              icon={<Server className="w-5 h-5 text-green-500" />}
              severity="normal"
              subtitle="Last 30 days"
            />
            <MetricCard
              title="Critical Issues"
              value={stats.criticalIssues}
              icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
              severity={stats.criticalIssues > 0 ? "critical" : "normal"}
              subtitle="Require attention"
            />
            <MetricCard
              title="Week Change"
              value={`${stats.weekOverWeekChange > 0 ? "+" : ""}${stats.weekOverWeekChange}%`}
              icon={<TrendingUp className="w-5 h-5 text-blue-500" />}
              trend={{ value: Math.abs(stats.weekOverWeekChange), isPositive: stats.weekOverWeekChange >= 0 }}
              subtitle="vs last week"
            />
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <SeverityBadge severity={activity.severity} />
                          <div>
                            <p className="text-sm font-medium">{activity.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(activity.timestamp), "MMM d, HH:mm")}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">{activity.type}</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* COO Operations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Operations Control
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowEmergencyModal(true)}
                >
                  <Power className="w-4 h-4 mr-2" />
                  Emergency Override
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={exportToCSV}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Dashboard Report
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setShowAuditModal(true);
                    loadAuditLogs();
                  }}
                >
                  <History className="w-4 h-4 mr-2" />
                  System Audit Logs
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={shareDashboard}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Share Dashboard Link
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Overview & User Growth */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  Revenue Overview
                </CardTitle>
                <CardDescription>Financial performance at a glance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-500">${stats.totalRevenue.toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold text-yellow-500">${stats.pendingRevenue.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm text-muted-foreground">This Week</p>
                    <p className="text-xl font-semibold">${stats.weeklyRevenue.toLocaleString()}</p>
                  </div>
                  <Badge variant={stats.revenueGrowth >= 0 ? "default" : "destructive"} className="gap-1">
                    {stats.revenueGrowth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : null}
                    {stats.revenueGrowth > 0 ? "+" : ""}{stats.revenueGrowth}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* User Growth Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-500" />
                  User Growth (30 Days)
                </CardTitle>
                <CardDescription>
                  This week: {stats.newUsersThisWeek} | Last week: {stats.newUsersLastWeek}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.userGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => format(new Date(value), 'dd')}
                        className="text-muted-foreground"
                      />
                      <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="users" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Course Performance */}
          {stats.courseCompletionRates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-500" />
                  Course Performance
                </CardTitle>
                <CardDescription>Completion rates by course</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.courseCompletionRates.slice(0, 5)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <YAxis 
                        dataKey="course" 
                        type="category" 
                        width={120}
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => value.length > 15 ? value.slice(0, 15) + '...' : value}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        formatter={(value, name, props) => [`${value}% (${props.payload.enrollments} enrolled)`, 'Completion Rate']}
                      />
                      <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Process Intelligence Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5" />
                Process Intelligence
              </CardTitle>
              <CardDescription>AI-powered operational insights and suggestions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {processInsights.map((insight, index) => (
                  <div key={index} className="p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{insight.title}</span>
                      <Badge variant={insight.impact === "High" ? "default" : "secondary"}>
                        {insight.impact}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{insight.suggestion}</p>
                    <Button variant="link" size="sm" className="px-0 mt-2">
                      <Lightbulb className="w-3 h-3 mr-1" />
                      Learn more
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Section 2: Operations Performance */}
        <TabsContent value="operations" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Process Completion"
              value={`${stats.processCompletionRate}%`}
              icon={<CheckCircle2 className="w-5 h-5 text-green-500" />}
              severity={stats.processCompletionRate < 70 ? "warning" : "normal"}
            />
            <MetricCard
              title="Avg Turnaround"
              value={`${stats.avgTurnaroundTime}d`}
              icon={<Clock className="w-5 h-5 text-blue-500" />}
            />
            <MetricCard
              title="SLA Compliance"
              value={`${stats.slaCompliance}%`}
              icon={<Target className="w-5 h-5 text-purple-500" />}
              severity={stats.slaCompliance < 80 ? "warning" : "normal"}
            />
            <MetricCard
              title="Error Rate"
              value={`${stats.errorRate}%`}
              icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
              severity={stats.errorRate > 10 ? "critical" : stats.errorRate > 5 ? "warning" : "normal"}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Workflow Status */}
            <Card>
              <CardHeader>
                <CardTitle>Workflow Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>User Onboarding</span>
                    <span className="text-green-500">95%</span>
                  </div>
                  <Progress value={95} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Certificate Issuance</span>
                    <span className="text-yellow-500">78%</span>
                  </div>
                  <Progress value={78} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Payment Processing</span>
                    <span className="text-green-500">{stats.paymentSuccessRate}%</span>
                  </div>
                  <Progress value={stats.paymentSuccessRate} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Order Fulfillment</span>
                    <span className={stats.processCompletionRate < 70 ? "text-yellow-500" : "text-green-500"}>
                      {stats.processCompletionRate}%
                    </span>
                  </div>
                  <Progress value={stats.processCompletionRate} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Task Management */}
            <KanbanSummary
              todo={stats.todoTasks}
              inProgress={stats.inProgressTasks}
              done={stats.doneTasks}
            />
          </div>

          {/* Overdue Tasks Alert */}
          {stats.overdueTasks > 0 && (
            <Card className="border-yellow-500">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  <div>
                    <p className="font-medium">{stats.overdueTasks} Overdue Tasks</p>
                    <p className="text-sm text-muted-foreground">Tasks exceeding SLA threshold</p>
                  </div>
                </div>
                <Button variant="outline">View All</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Section 3: Team & Workforce */}
        <TabsContent value="team" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Active Staff"
              value={`${stats.activeStaff}/${stats.totalStaff}`}
              icon={<Users className="w-5 h-5 text-blue-500" />}
            />
            <MetricCard
              title="Tasks Completed"
              value={stats.tasksCompleted}
              icon={<CheckCircle2 className="w-5 h-5 text-green-500" />}
            />
            <MetricCard
              title="Tasks Assigned"
              value={stats.tasksAssigned}
              icon={<Target className="w-5 h-5 text-purple-500" />}
            />
            <MetricCard
              title="Completion Rate"
              value={`${stats.tasksAssigned > 0 ? Math.round((stats.tasksCompleted / stats.tasksAssigned) * 100) : 0}%`}
              icon={<TrendingUp className="w-5 h-5 text-green-500" />}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Staff Productivity Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Headphones className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Support Team</p>
                      <p className="text-sm text-muted-foreground">{stats.closedTickets} tickets resolved</p>
                    </div>
                  </div>
                  <Badge variant="outline">{Math.round((stats.closedTickets / Math.max(1, stats.openTickets + stats.closedTickets)) * 100)}% resolution</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Package className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium">Order Management</p>
                      <p className="text-sm text-muted-foreground">{stats.deliveredOrders} orders delivered</p>
                    </div>
                  </div>
                  <Badge variant="outline">{Math.round((stats.deliveredOrders / Math.max(1, stats.totalOrders)) * 100)}% fulfillment</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-medium">Course Management</p>
                      <p className="text-sm text-muted-foreground">{stats.publishedCourses} courses published</p>
                    </div>
                  </div>
                  <Badge variant="outline">{stats.totalCourses} total</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Staff Reminders Section */}
          <StaffRemindersPanel />
        </TabsContent>

        {/* Section 4: Risk & Issue Monitoring */}
        <TabsContent value="risk" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="System Errors"
              value={stats.systemErrors}
              icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
              severity={stats.systemErrors > 0 ? "critical" : "normal"}
            />
            <MetricCard
              title="User Complaints"
              value={stats.userComplaints}
              icon={<Headphones className="w-5 h-5 text-yellow-500" />}
              severity={stats.userComplaints > 3 ? "warning" : "normal"}
            />
            <MetricCard
              title="Payment Failures"
              value={stats.paymentFailures}
              icon={<CreditCard className="w-5 h-5 text-red-500" />}
              severity={stats.paymentFailures > 0 ? "warning" : "normal"}
            />
            <MetricCard
              title="Security Alerts"
              value={stats.securityAlerts}
              icon={<Shield className="w-5 h-5 text-red-500" />}
              severity={stats.securityAlerts > 0 ? "critical" : "normal"}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Issue Severity Matrix</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.criticalIssues > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                    <div className="flex items-center gap-3">
                      <SeverityBadge severity="critical" />
                      <span>{stats.criticalIssues} Critical Issues</span>
                    </div>
                    <Button size="sm" variant="destructive">
                      Resolve Now
                    </Button>
                  </div>
                )}
                {stats.overdueTasks > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                    <div className="flex items-center gap-3">
                      <SeverityBadge severity="warning" />
                      <span>{stats.overdueTasks} Overdue Tasks</span>
                    </div>
                    <Button size="sm" variant="outline">
                      Review
                    </Button>
                  </div>
                )}
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <div className="flex items-center gap-3">
                    <SeverityBadge severity="normal" />
                    <span>All other systems operational</span>
                  </div>
                  <Badge variant="outline">OK</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Section 5: Department Breakdown */}
        <TabsContent value="departments" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <DepartmentCard
              name="Tech / Platform"
              icon={<Code2 className="w-5 h-5 text-blue-500" />}
              performanceScore={95}
              activeIssues={stats.systemErrors}
              resourceUsage={62}
            />
            <DepartmentCard
              name="Finance Ops"
              icon={<CreditCard className="w-5 h-5 text-green-500" />}
              performanceScore={stats.paymentSuccessRate}
              activeIssues={stats.paymentFailures}
              resourceUsage={45}
            />
            <DepartmentCard
              name="Customer Support"
              icon={<Headphones className="w-5 h-5 text-purple-500" />}
              performanceScore={stats.slaCompliance}
              activeIssues={stats.openTickets}
              resourceUsage={78}
            />
            <DepartmentCard
              name="Education / Courses"
              icon={<BookOpen className="w-5 h-5 text-yellow-500" />}
              performanceScore={stats.completionRate}
              activeIssues={0}
              resourceUsage={35}
            />
            <DepartmentCard
              name="Order Management"
              icon={<Package className="w-5 h-5 text-orange-500" />}
              performanceScore={stats.processCompletionRate}
              activeIssues={stats.pendingOrders}
              resourceUsage={55}
            />
            <DepartmentCard
              name="Marketing"
              icon={<TrendingUp className="w-5 h-5 text-pink-500" />}
              performanceScore={82}
              activeIssues={0}
              resourceUsage={40}
            />
          </div>

          {/* Customer Operations Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Customer Operations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{stats.openTickets}</p>
                  <p className="text-sm text-muted-foreground">Open Tickets</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{stats.closedTickets}</p>
                  <p className="text-sm text-muted-foreground">Closed Tickets</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{stats.avgResponseTime}h</p>
                  <p className="text-sm text-muted-foreground">Avg Response</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Section 6: Systems Status */}
        <TabsContent value="systems" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="w-5 h-5" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SystemStatusIndicator name="API Gateway" status="operational" lastChecked="1m ago" />
                <SystemStatusIndicator name="Database" status="operational" lastChecked="1m ago" />
                <SystemStatusIndicator name="Authentication" status="operational" lastChecked="1m ago" />
                <SystemStatusIndicator name="File Storage" status="operational" lastChecked="1m ago" />
                <SystemStatusIndicator name="Edge Functions" status="operational" lastChecked="1m ago" />
                <SystemStatusIndicator name="Email Service" status="operational" lastChecked="5m ago" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Background Jobs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-xs text-muted-foreground">Last run: 2 minutes ago</p>
                  </div>
                  <Badge className="bg-green-500">Running</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">Data Sync</p>
                    <p className="text-xs text-muted-foreground">Last run: 5 minutes ago</p>
                  </div>
                  <Badge className="bg-green-500">Running</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">Analytics Processing</p>
                    <p className="text-xs text-muted-foreground">Scheduled: Every 1 hour</p>
                  </div>
                  <Badge variant="outline">Scheduled</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Section 7: Reports & Exports */}
        <TabsContent value="reports" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="p-3 rounded-lg bg-blue-500/20">
                  <FileText className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium">Daily Ops Report</p>
                  <p className="text-sm text-muted-foreground">Summary of today's operations</p>
                </div>
                <Download className="w-5 h-5 ml-auto text-muted-foreground" />
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="p-3 rounded-lg bg-green-500/20">
                  <BarChart3 className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="font-medium">Weekly COO Summary</p>
                  <p className="text-sm text-muted-foreground">Aggregated metrics report</p>
                </div>
                <Download className="w-5 h-5 ml-auto text-muted-foreground" />
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="p-3 rounded-lg bg-red-500/20">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <p className="font-medium">Incident Reports</p>
                  <p className="text-sm text-muted-foreground">Critical issue log</p>
                </div>
                <Download className="w-5 h-5 ml-auto text-muted-foreground" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Export Options</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={exportToPDF}>
                <FileText className="w-4 h-4 mr-2" />
                Export as PDF
              </Button>
              <Button variant="outline" onClick={exportToCSV}>
                <Database className="w-4 h-4 mr-2" />
                Export as CSV
              </Button>
              <Button variant="outline" onClick={shareDashboard}>
                <Copy className="w-4 h-4 mr-2" />
                Share Dashboard
              </Button>
            </CardContent>
          </Card>

          {/* Access & Controls Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Access & Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/app/admin/roles")}>
                <Shield className="w-4 h-4 mr-2" />
                Role-Based Visibility Settings
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={() => navigate("/app/admin/staff/plaque-orders")}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Pending Approvals ({stats.pendingOrders})
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setShowEmergencyModal(true)}
              >
                <Power className="w-4 h-4 mr-2" />
                Emergency Override Controls
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => {
                  setShowAuditModal(true);
                  loadAuditLogs();
                }}
              >
                <History className="w-4 h-4 mr-2" />
                View Audit Logs
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Emergency Override Modal */}
      <Dialog open={showEmergencyModal} onOpenChange={setShowEmergencyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Power className="w-5 h-5 text-red-500" />
              Emergency Override Controls
            </DialogTitle>
            <DialogDescription>
              Use these controls for emergency situations only. All actions are logged.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="text-base font-medium">Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Redirect all users to maintenance page
                </p>
              </div>
              <Switch
                checked={maintenanceMode}
                onCheckedChange={toggleMaintenanceMode}
              />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg opacity-50">
              <div>
                <Label className="text-base font-medium">Force Logout All Users</Label>
                <p className="text-sm text-muted-foreground">
                  Sign out all active sessions
                </p>
              </div>
              <Button variant="destructive" size="sm" disabled>
                Execute
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg opacity-50">
              <div>
                <Label className="text-base font-medium">Pause All Payments</Label>
                <p className="text-sm text-muted-foreground">
                  Temporarily disable payment processing
                </p>
              </div>
              <Button variant="destructive" size="sm" disabled>
                Execute
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmergencyModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit Logs Modal */}
      <Dialog open={showAuditModal} onOpenChange={setShowAuditModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              System Audit Logs
            </DialogTitle>
            <DialogDescription>
              Recent system configuration changes
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            {loadingAudit ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : auditLogs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No audit logs found</p>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{log.key}</span>
                      <Badge variant="outline" className="text-xs">
                        {format(new Date(log.updated_at), "MMM dd, HH:mm")}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      Value: {JSON.stringify(log.value).slice(0, 100)}...
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowAuditModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
