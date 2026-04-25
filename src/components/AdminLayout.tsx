import { useState, useEffect } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useStaffPermissions } from "@/hooks/useStaffPermissions";
import { useAuth } from "@/components/auth/AuthProvider";
import { 
  Crown, Users, BookOpen, Settings, DollarSign, HeadphonesIcon, 
  Menu, X, LogOut, Sun, Moon, UserCog, BarChart3, Package,
  Briefcase, Code, GraduationCap, CheckCircle2, Activity, Bot,
  ChevronLeft, ChevronRight, Gift, UserPlus, Percent
} from "lucide-react";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "./ThemeProvider";
import YunixLogo from "./YunixLogo";
import RoleSwitcher from "./RoleSwitcher";
import { useIsMobile } from "@/hooks/use-mobile";

interface StaffRole {
  name: string;
}

// CEO navigation - full access
const ceoNavigation = [
  { name: "Overview", href: "/app/admin/ceo", icon: Crown },
  { name: "Staff Management", href: "/app/admin/staff-management", icon: Users },
  { name: "Role Management", href: "/app/admin/roles", icon: Settings },
  { name: "COO Dashboard", href: "/app/admin/staff/coo", icon: Briefcase },
  { name: "CTO Dashboard", href: "/app/admin/staff/cto", icon: Code },
  { name: "CFO Dashboard", href: "/app/admin/staff/cfo", icon: DollarSign },
  { name: "Course Manager", href: "/app/admin/staff/course-manager", icon: GraduationCap },
  { name: "Support Dashboard", href: "/app/admin/staff/support", icon: HeadphonesIcon },
  { name: "Analytics Dashboard", href: "/app/admin/staff/analytics", icon: BarChart3 },
  { name: "QA Dashboard", href: "/app/admin/staff/qa", icon: CheckCircle2 },
  { name: "Plaque Orders", href: "/app/admin/staff/plaque-orders", icon: Package },
  { name: "Marketing", href: "/app/admin/staff/marketing", icon: Activity },
  { name: "Telegram Bot", href: "/app/admin/telegram-bot", icon: Bot },
  { name: "Loyalty Ops", href: "/app/admin/loyalty-operations", icon: Gift },
  { name: "Partner Ops", href: "/app/admin/partner-operations", icon: UserPlus },
  { name: "Discount Rules", href: "/app/admin/discount-rules", icon: Percent },
  { name: "System Settings", href: "/app/admin/settings", icon: Settings },
];

// Role-specific navigation based on exact requirements
const roleNavigation: Record<string, { name: string; href: string; icon: any }[]> = {
  // COO: All sections except System Settings
  'COO': [
    { name: "Overview", href: "/app/admin/ceo", icon: Crown },
    { name: "Staff Management", href: "/app/admin/staff-management", icon: Users },
    { name: "Role Management", href: "/app/admin/roles", icon: Settings },
    { name: "COO Dashboard", href: "/app/admin/staff/coo", icon: Briefcase },
    { name: "CTO Dashboard", href: "/app/admin/staff/cto", icon: Code },
    { name: "CFO Dashboard", href: "/app/admin/staff/cfo", icon: DollarSign },
    { name: "Course Manager", href: "/app/admin/staff/course-manager", icon: GraduationCap },
    { name: "Support Dashboard", href: "/app/admin/staff/support", icon: HeadphonesIcon },
    { name: "Analytics Dashboard", href: "/app/admin/staff/analytics", icon: BarChart3 },
    { name: "QA Dashboard", href: "/app/admin/staff/qa", icon: CheckCircle2 },
    { name: "Plaque Orders", href: "/app/admin/staff/plaque-orders", icon: Package },
    { name: "Marketing", href: "/app/admin/staff/marketing", icon: Activity },
  ],
  // CTO: View Only/Read Only - just CTO Dashboard
  'CTO': [
    { name: "CTO Dashboard", href: "/app/admin/staff/cto", icon: Code },
  ],
  // CFO: CFO Dashboard, Analytics, QA, Plaque Orders (Payment + Pricing), Marketing
  'CFO': [
    { name: "CFO Dashboard", href: "/app/admin/staff/cfo", icon: DollarSign },
    { name: "Analytics Dashboard", href: "/app/admin/staff/analytics", icon: BarChart3 },
    { name: "QA Dashboard", href: "/app/admin/staff/qa", icon: CheckCircle2 },
    { name: "Plaque Orders", href: "/app/admin/staff/plaque-orders", icon: Package },
    { name: "Marketing", href: "/app/admin/staff/marketing", icon: Activity },
  ],
  // Course Manager: Course Manager, Analytics Dashboard
  'Course Manager': [
    { name: "Course Manager", href: "/app/admin/staff/course-manager", icon: GraduationCap },
    { name: "Analytics Dashboard", href: "/app/admin/staff/analytics", icon: BarChart3 },
  ],
  // QA & Support combined role: Support Dashboard, QA Dashboard
  'QA & Support': [
    { name: "Support Dashboard", href: "/app/admin/staff/support", icon: HeadphonesIcon },
    { name: "QA Dashboard", href: "/app/admin/staff/qa", icon: CheckCircle2 },
  ],
  // QA Tester: Support Dashboard, QA Dashboard
  'QA Tester': [
    { name: "Support Dashboard", href: "/app/admin/staff/support", icon: HeadphonesIcon },
    { name: "QA Dashboard", href: "/app/admin/staff/qa", icon: CheckCircle2 },
  ],
  // Support Agent: Support Dashboard, QA Dashboard
  'Support Agent': [
    { name: "Support Dashboard", href: "/app/admin/staff/support", icon: HeadphonesIcon },
    { name: "QA Dashboard", href: "/app/admin/staff/qa", icon: CheckCircle2 },
  ],
  'Support Specialist': [
    { name: "Support Dashboard", href: "/app/admin/staff/support", icon: HeadphonesIcon },
    { name: "QA Dashboard", href: "/app/admin/staff/qa", icon: CheckCircle2 },
  ],
  // Order Manager: Plaque Orders (Orders only - tabs restricted in component)
  'Plaque Order Manager': [
    { name: "Plaque Orders", href: "/app/admin/staff/plaque-orders", icon: Package },
  ],
  'order Manager': [
    { name: "Plaque Orders", href: "/app/admin/staff/plaque-orders", icon: Package },
  ],
  // Marketing Agent: Marketing only
  'Marketing': [
    { name: "Marketing", href: "/app/admin/staff/marketing", icon: Activity },
  ],
  'Marketing Agent': [
    { name: "Marketing", href: "/app/admin/staff/marketing", icon: Activity },
  ],
  // Social Media Manager: Marketing only
  'Social Media Manager': [
    { name: "Marketing", href: "/app/admin/staff/marketing", icon: Activity },
  ],
  // Data Analyst: Analytics Dashboard
  'Data Analyst': [
    { name: "Analytics Dashboard", href: "/app/admin/staff/analytics", icon: BarChart3 },
  ],
  'Data Analyts': [
    { name: "Analytics Dashboard", href: "/app/admin/staff/analytics", icon: BarChart3 },
  ],
  // Developers: CTO Dashboard (read-only)
  'Backend Developer': [
    { name: "CTO Dashboard", href: "/app/admin/staff/cto", icon: Code },
  ],
  'Frontend Developer': [
    { name: "CTO Dashboard", href: "/app/admin/staff/cto", icon: Code },
  ],
};

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { isStaff, isAdmin } = useStaffPermissions();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('adminSidebarCollapsed');
    return saved === 'true';
  });
  const [loading, setLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  
  // On mobile/tablet, always show full sidebar content when opened
  const showCompactSidebar = sidebarCollapsed && !isMobile;
  
  const toggleSidebarCollapse = () => {
    const newValue = !sidebarCollapsed;
    setSidebarCollapsed(newValue);
    localStorage.setItem('adminSidebarCollapsed', String(newValue));
  };

  // Check maintenance mode status
  useEffect(() => {
    const checkMaintenance = async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .single();
      
      if (data?.value) {
        const value = data.value as { enabled: boolean; message: string };
        setMaintenanceMode(value.enabled || false);
      }
    };
    checkMaintenance();
  }, []);

  // ✅ Server-side validation - redirect if not staff
  useEffect(() => {
    if (user && !loading) {
      if (!isStaff) {
        navigate("/app/dashboard");
      }
    }
    setLoading(false);
  }, [user, isStaff, loading, navigate]);

  const handleSignOut = async () => {
    const { signOut } = useAuth();
    await signOut();
  };

  const switchToUser = () => {
    navigate("/app/dashboard");
  };

  const getAdminRoute = () => {
    if (isAdmin) return '/app/admin/ceo';
    return '/app/admin/ceo';
  };

  // Show loading while checking authorization
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // SECURITY: If not authorized, don't render admin layout
  if (!isStaff || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Get navigation based on role
  const navigation = isAdmin 
    ? ceoNavigation 
    : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Maintenance Mode Banner for Staff */}
      {maintenanceMode && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-500/90 text-amber-950 px-4 py-2 text-center text-sm font-medium">
          <span className="inline-flex items-center gap-2">
            <Settings className="h-4 w-4 animate-spin" style={{ animationDuration: '3s' }} />
            Maintenance Mode Active - You are viewing as Staff
          </span>
        </div>
      )}

      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      <aside className={cn(
        "fixed z-50 transition-all duration-300 lg:translate-x-0",
        "bg-card/30 backdrop-blur-xl border border-border/30 shadow-xl",
        "lg:inset-y-3 lg:left-3 lg:rounded-2xl",
        "inset-y-0 left-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
        sidebarCollapsed ? "lg:w-16" : "lg:w-64",
        "w-64",
        maintenanceMode && "lg:top-12"
      )}>
        <div className="flex flex-col h-full">
          <div className={cn(
            "flex items-center justify-between border-b border-border/30",
            showCompactSidebar ? "p-3 justify-center" : "p-4"
          )}>
            <YunixLogo isAdmin={true} adminRoute={getAdminRoute()} collapsed={showCompactSidebar} />
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden" 
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {!showCompactSidebar && (
            <div className="px-4 py-2 border-b border-border/30">
              <p className="text-xs text-muted-foreground">{isAdmin ? 'Admin' : 'Staff'} Panel</p>
            </div>
          )}

          <nav className={cn(
            "flex-1 space-y-1 overflow-y-auto",
            showCompactSidebar ? "p-2" : "p-3"
          )}>
            {navigation.map(item => {
              const isActive = location.pathname === item.href;
              return (
                <Link 
                  key={item.name} 
                  to={item.href} 
                    className={cn(
                      "flex items-center transition-all duration-200",
                      showCompactSidebar 
                        ? "justify-center p-3 rounded-xl" 
                        : "gap-3 px-4 py-2.5 rounded-xl",
                      isActive
                      ? "bg-yellow-500 text-yellow-950 shadow-md" 
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )} 
                    onClick={() => setSidebarOpen(false)}
                    title={showCompactSidebar ? item.name : undefined}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!showCompactSidebar && <span className="font-medium text-sm">{item.name}</span>}
                  </Link>
              );
            })}
          </nav>

          <div className={cn(
            "border-t border-border/30 space-y-2",
            showCompactSidebar ? "p-2" : "p-3"
          )}>
            {/* Collapse toggle for desktop */}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={toggleSidebarCollapse}
              className="hidden lg:flex w-full justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl"
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
            
            {!showCompactSidebar ? (
              <>
                <RoleSwitcher
                  currentMode="admin"
                  staffRoleName={isAdmin ? 'Admin' : 'Staff'}
                  isStaff={true}
                  onSwitchToUser={switchToUser}
                  onSwitchToAdmin={() => {}}
                  onSignOut={handleSignOut}
                />
                
                <Link to="/app/admin/profile">
                  <Button 
                    variant="ghost" 
                    onClick={() => setSidebarOpen(false)} 
                    className="w-full justify-start hover:bg-muted/50 rounded-xl"
                  >
                    <UserCog className="mr-3 h-5 w-5" />
                    Admin Profile
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")} 
                  className="w-full justify-start hover:bg-muted/50 rounded-xl"
                >
                  {theme === "dark" ? <Sun className="mr-3 h-5 w-5" /> : <Moon className="mr-3 h-5 w-5" />}
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={switchToUser} 
                  className="w-full hover:bg-muted/50 rounded-xl"
                  title="Switch to User"
                >
                  <UserCog className="h-5 w-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")} 
                  className="w-full hover:bg-muted/50 rounded-xl"
                  title={theme === "dark" ? "Light Mode" : "Dark Mode"}
                >
                  {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleSignOut} 
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
                  title="Sign Out"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </aside>

      <div className={cn("transition-all duration-300", sidebarCollapsed ? "lg:pl-20" : "lg:pl-[17rem]")}>
        <header className="sticky top-0 z-30 mx-3 rounded-b-2xl bg-card/30 backdrop-blur-xl border border-border/30 shadow-lg">
          <div className="flex items-center justify-between px-4 py-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden" 
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <RoleSwitcher
                currentMode="admin"
                staffRoleName={isAdmin ? 'Admin' : 'Staff'}
                isStaff={true}
                onSwitchToUser={switchToUser}
                onSwitchToAdmin={() => {}}
                onSignOut={handleSignOut}
              />
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </header>

        <main className="p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
