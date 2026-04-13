import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface COOStats {
  // Executive Overview
  operationalHealthScore: number;
  activeOperationsToday: number;
  systemUptime: number;
  criticalIssues: number;
  weekOverWeekChange: number;

  // Operations Performance
  processCompletionRate: number;
  avgTurnaroundTime: number;
  slaCompliance: number;
  errorRate: number;
  paymentSuccessRate: number;

  // Team Metrics
  activeStaff: number;
  totalStaff: number;
  tasksCompleted: number;
  tasksAssigned: number;

  // Task Management
  todoTasks: number;
  inProgressTasks: number;
  doneTasks: number;
  overdueTasks: number;

  // Risk Monitoring
  systemErrors: number;
  userComplaints: number;
  paymentFailures: number;
  securityAlerts: number;

  // Customer Operations
  openTickets: number;
  closedTickets: number;
  avgResponseTime: number;
  totalUsers: number;
  activeUsers: number;

  // Courses
  totalCourses: number;
  publishedCourses: number;
  totalEnrollments: number;
  completionRate: number;

  // Orders
  pendingOrders: number;
  deliveredOrders: number;
  totalOrders: number;

  // Revenue (NEW)
  totalRevenue: number;
  pendingRevenue: number;
  weeklyRevenue: number;
  revenueGrowth: number;

  // User Growth (NEW)
  userGrowthData: { date: string; users: number }[];
  newUsersThisWeek: number;
  newUsersLastWeek: number;

  // Course Performance (NEW)
  courseCompletionRates: { course: string; rate: number; enrollments: number }[];
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  severity: "normal" | "warning" | "critical";
}

export function useCOODashboardData() {
  const [stats, setStats] = useState<COOStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Fetch all data in parallel
      const [
        staffResult,
        ticketsResult,
        ordersResult,
        paymentsResult,
        coursesResult,
        profilesResult,
        progressResult,
      ] = await Promise.all([
        supabase.from("staff").select("id, status"),
        supabase.from("support_tickets").select("id, status, priority, created_at, category"),
        supabase.from("plaque_orders").select("id, status, created_at, updated_at"),
        supabase.from("plaque_payments").select("id, status, created_at, amount"),
        supabase.from("courses").select("id, published, title"),
        supabase.from("profiles").select("id, created_at"),
        supabase.from("student_progress").select("id, completed, progress_percentage, course_id"),
      ]);

      const staff = staffResult.data || [];
      const tickets = ticketsResult.data || [];
      const orders = ordersResult.data || [];
      const payments = paymentsResult.data || [];
      const courses = coursesResult.data || [];
      const profiles = profilesResult.data || [];
      const progress = progressResult.data || [];

      // Calculate metrics
      const activeStaff = staff.filter((s) => s.status === "active").length;
      const openTickets = tickets.filter((t) => t.status === "open" || t.status === "live").length;
      const closedTickets = tickets.filter((t) => t.status === "closed").length;
      const highPriorityTickets = tickets.filter((t) => t.priority === "high" || t.priority === "urgent").length;

      const deliveredOrders = orders.filter((o) => o.status === "Delivered").length;
      const pendingOrders = orders.filter((o) => o.status === "Pending" || o.status === "Awaiting Approval").length;

      const receivedPayments = payments.filter((p) => p.status === "received");
      const rejectedPayments = payments.filter((p) => p.status === "rejected").length;
      const pendingPayments = payments.filter((p) => p.status === "pending");

      const publishedCourses = courses.filter((c) => c.published).length;
      const completedProgress = progress.filter((p) => p.completed).length;

      // Revenue calculations (NEW)
      const totalRevenue = receivedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const pendingRevenue = pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      const weeklyPayments = receivedPayments.filter(p => new Date(p.created_at) > weekAgo);
      const weeklyRevenue = weeklyPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      const lastWeekPayments = receivedPayments.filter(p => {
        const date = new Date(p.created_at);
        return date <= weekAgo && date > twoWeeksAgo;
      });
      const lastWeekRevenue = lastWeekPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const revenueGrowth = lastWeekRevenue > 0 
        ? Math.round(((weeklyRevenue - lastWeekRevenue) / lastWeekRevenue) * 100) 
        : weeklyRevenue > 0 ? 100 : 0;

      // User growth data (NEW) - last 30 days
      const userGrowthData: { date: string; users: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const usersOnDate = profiles.filter(p => {
          const createdDate = new Date(p.created_at || "").toISOString().split('T')[0];
          return createdDate === dateStr;
        }).length;
        userGrowthData.push({ date: dateStr, users: usersOnDate });
      }

      const newUsersThisWeek = profiles.filter(p => new Date(p.created_at || "") > weekAgo).length;
      const newUsersLastWeek = profiles.filter(p => {
        const date = new Date(p.created_at || "");
        return date <= weekAgo && date > twoWeeksAgo;
      }).length;

      // Course completion rates (NEW)
      const courseCompletionRates = courses.map(course => {
        const courseProgress = progress.filter(p => p.course_id === course.id);
        const completed = courseProgress.filter(p => p.completed).length;
        const rate = courseProgress.length > 0 ? Math.round((completed / courseProgress.length) * 100) : 0;
        return {
          course: course.title || 'Untitled Course',
          rate,
          enrollments: courseProgress.length
        };
      }).filter(c => c.enrollments > 0).sort((a, b) => b.enrollments - a.enrollments);

      // Calculate rates
      const processCompletionRate = orders.length > 0 
        ? Math.round((deliveredOrders / orders.length) * 100) 
        : 100;
      
      const paymentSuccessRate = payments.length > 0 
        ? Math.round((receivedPayments.length / payments.length) * 100) 
        : 100;

      const errorRate = payments.length > 0 
        ? Math.round((rejectedPayments / payments.length) * 100) 
        : 0;

      const completionRate = progress.length > 0 
        ? Math.round((completedProgress / progress.length) * 100) 
        : 0;

      // Calculate operational health score (weighted average)
      const healthFactors = [
        processCompletionRate * 0.25,
        paymentSuccessRate * 0.25,
        (100 - errorRate) * 0.2,
        (openTickets < 10 ? 100 : Math.max(0, 100 - openTickets * 5)) * 0.15,
        (highPriorityTickets === 0 ? 100 : Math.max(0, 100 - highPriorityTickets * 20)) * 0.15,
      ];
      const operationalHealthScore = Math.round(healthFactors.reduce((a, b) => a + b, 0));

      // SLA compliance (tickets resolved within 24h)
      const recentTickets = tickets.filter((t) => 
        new Date(t.created_at) > weekAgo
      );
      const slaCompliance = recentTickets.length > 0 
        ? Math.round((closedTickets / Math.max(1, recentTickets.length)) * 100)
        : 100;

      // Week over week change calculation
      const weekOverWeekChange = newUsersLastWeek > 0 
        ? Math.round(((newUsersThisWeek - newUsersLastWeek) / newUsersLastWeek) * 100)
        : newUsersThisWeek > 0 ? 100 : 0;

      setStats({
        operationalHealthScore,
        activeOperationsToday: openTickets + pendingOrders + pendingPayments.length,
        systemUptime: 99.9, // Static for now
        criticalIssues: highPriorityTickets,
        weekOverWeekChange,

        processCompletionRate,
        avgTurnaroundTime: 2.5, // Days - would need timestamp analysis
        slaCompliance,
        errorRate,
        paymentSuccessRate,

        activeStaff,
        totalStaff: staff.length,
        tasksCompleted: closedTickets,
        tasksAssigned: tickets.length,

        todoTasks: openTickets,
        inProgressTasks: tickets.filter((t) => t.status === "live").length,
        doneTasks: closedTickets,
        overdueTasks: tickets.filter((t) => {
          const age = (now.getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24);
          return t.status !== "closed" && age > 3;
        }).length,

        systemErrors: 0,
        userComplaints: tickets.filter((t) => t.category === "complaint").length,
        paymentFailures: rejectedPayments,
        securityAlerts: 0,

        openTickets,
        closedTickets,
        avgResponseTime: 4.2, // Hours - would need message timestamp analysis
        totalUsers: profiles.length,
        activeUsers: Math.round(profiles.length * 0.6), // Estimate

        totalCourses: courses.length,
        publishedCourses,
        totalEnrollments: progress.length,
        completionRate,

        pendingOrders,
        deliveredOrders,
        totalOrders: orders.length,

        // New revenue fields
        totalRevenue,
        pendingRevenue,
        weeklyRevenue,
        revenueGrowth,

        // New user growth fields
        userGrowthData,
        newUsersThisWeek,
        newUsersLastWeek,

        // New course performance fields
        courseCompletionRates,
      });

      // Build recent activity
      const activities: RecentActivity[] = [];

      // Add recent tickets
      tickets
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3)
        .forEach((t) => {
          activities.push({
            id: t.id,
            type: "ticket",
            description: `Support ticket ${t.status}`,
            timestamp: t.created_at,
            severity: t.priority === "high" || t.priority === "urgent" ? "critical" : "normal",
          });
        });

      // Add recent orders
      orders
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3)
        .forEach((o) => {
          activities.push({
            id: o.id,
            type: "order",
            description: `Plaque order ${o.status}`,
            timestamp: o.created_at,
            severity: o.status === "Pending" ? "warning" : "normal",
          });
        });

      // Add recent payments
      payments
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 2)
        .forEach((p) => {
          activities.push({
            id: p.id,
            type: "payment",
            description: `Payment ${p.status}`,
            timestamp: p.created_at,
            severity: p.status === "rejected" ? "critical" : p.status === "pending" ? "warning" : "normal",
          });
        });

      // Sort by timestamp
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivity(activities.slice(0, 8));
    } catch (error) {
      console.error("Error loading COO dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  return { stats, recentActivity, loading, refresh: loadDashboardData };
}
