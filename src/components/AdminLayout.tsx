import { useState, useEffect } from "react";
import { Link, useLocation, Outlet, useNavigate, Navigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useStaffPermissions, SECTION_ACCESS_LEVELS } from "@/hooks/useStaffPermissions";
import { useAuth } from "@/components/auth/AuthProvider";
import { ROLE_SECTION_ACCESS } from "@/config/roles";
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

interface SystemSettings {
  value: { enabled: boolean; message: string };
}

interface StaffRecord {
  role: string;
}

// Unified admin navigation with access level requirements
const adminNavigation = [
  { name: "Overview", href: "/app/admin/ceo", icon: Crown, section: 'overview' },
  { name: "Staff Management", href: "/app/admin/staff-management", icon: Users, section: 'staff-management' },
  { name: "Role Management", href: "/app/admin/roles", icon: Settings, section: 'role-management' },
  { name: "COO Dashboard", href: "/app/admin/staff/coo", icon: Briefcase, section: 'staff/coo' },
  { name: "CTO Dashboard", href: "/app/admin/staff/cto", icon: Code, section: 'staff/cto' },
  { name: "CFO Dashboard", href: "/app/admin/staff/cfo", icon: DollarSign, section: 'staff/cfo' },
  { name: "Course Manager", href: "/app/admin/staff/course-manager", icon: GraduationCap, section: 'staff/course-manager' },
  { name: "Support Dashboard", href: "/app/admin/staff/support", icon: HeadphonesIcon, section: 'staff/support' },
  { name: "Analytics Dashboard", href: "/app/admin/staff/analytics", icon: BarChart3, section: 'staff/analytics' },
  { name: "QA Dashboard", href: "/app/admin/staff/qa", icon: CheckCircle2, section: 'staff/qa' },
  { name: "Plaque Orders", href: "/app/admin/staff/plaque-orders", icon: Package, section: 'staff/plaque-orders' },
  { name: "Marketing", href: "/app/admin/staff/marketing", icon: Activity, section: 'staff/marketing' },
  { name: "Telegram Bot", href: "/app/admin/telegram-bot", icon: Bot, section: 'telegram-bot' },
  { name: "Loyalty Ops", href: "/app/admin/loyalty-operations", icon: Gift, section: 'loyalty-operations' },
  { name: "Partner Ops", href: "/app/admin/partner-operations", icon: UserPlus, section: 'partner-operations' },
  { name: "Discount Rules", href: "/app/admin/discount-rules", icon: Percent, section: 'discount-rules' },
  { name: "System Settings", href: "/app/admin/settings", icon: Settings, section: 'settings' },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobile();
  const { user, signOut } = useAuth();
  const { isStaff, isAdmin, hasAccessToSection, hasReadOnlyAccess, hasWriteAccess, staffRoleName, loading: permLoading } = useStaffPermissions();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('adminSidebarCollapsed');
      return saved === 'true';
    } catch {
      return false;
    }
  });
  const [loading, setLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [staffRole, setStaffRole] = useState<string | null>(null);
  
  // On mobile/tablet, always show full sidebar content when opened
  const showCompactSidebar = sidebarCollapsed && !isMobile;
  
  const toggleSidebarCollapse = () => {
    const newValue = !sidebarCollapsed;
    setSidebarCollapsed(newValue);
    try {
      localStorage.setItem('adminSidebarCollapsed', String(newValue));
    } catch (error) {
      console.error('Failed to save sidebar state:', error);
    }
  };

  // Check maintenance mode status
  useEffect(() => {
    const checkMaintenance = async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .single();
      
      if (data) {
        const settings = data as SystemSettings;
        if (settings.value) {
          setMaintenanceMode(settings.value.enabled || false);
        }
      }
    };
    checkMaintenance();
  }, []);

  // Fetch staff role from staff table
  useEffect(() => {
    const fetchStaffRole = async () => {
      if (!user || isAdmin) {
        setStaffRole(null);
        return;
      }

      const { data } = await supabase
        .from('staff')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (data) {
        const staffData = data as StaffRecord;
        if (staffData.role) {
          setStaffRole(staffData.role);
        }
      }
    };

    fetchStaffRole();
  }, [user, isAdmin]);

  // Set loading complete once permissions are loaded
  useEffect(() => {
    if (!permLoading) {
      setLoading(false);
    }
  }, [permLoading]);

  // Redirect non-staff users to /unauthorized (never to user dashboard)
  useEffect(() => {
    // Wait for permission loading to complete
    if (permLoading) return;
    
    // Only redirect if we have confirmed the user is not staff
    if (user && !isStaff) {
      navigate("/unauthorized", { state: { from: location } });
    }
  }, [user, isStaff, permLoading, navigate, location]);

  const handleSignOut = async () => {
    await signOut();
  };

  const switchToUser = () => {
    navigate("/app/dashboard");
  };

  const switchToAdmin = () => {
    navigate("/app/admin/ceo");
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

  // SECURITY: If not authorized, redirect to /unauthorized
  // This check runs after loading is complete
  if (!loading && !isStaff) {
    return (
      <Navigate to="/unauthorized" state={{ from: location }} replace />
    );
  }

  // Get navigation based on role-specific section access
  const navigation = adminNavigation.filter(item => {
    // If user is admin (CEO), show all sections
    if (isAdmin) return true;

    // If staff role is defined, check role-specific access
    if (staffRoleName && ROLE_SECTION_ACCESS[staffRoleName]) {
      return ROLE_SECTION_ACCESS[staffRoleName].includes(item.section);
    }

    // Fallback to tier-based access
    return hasAccessToSection(item.section);
  });

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
                  staffRoleName={staffRole || (isAdmin ? 'Admin' : 'Staff')}
                  isStaff={true}
                  onSwitchToUser={switchToUser}
                  onSwitchToAdmin={switchToAdmin}
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
                staffRoleName={staffRole || (isAdmin ? 'Admin' : 'Staff')}
                isStaff={true}
                onSwitchToUser={switchToUser}
                onSwitchToAdmin={switchToAdmin}
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
