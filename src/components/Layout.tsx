import { useState, useEffect } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { 
  LayoutDashboard, BookOpen, MessageSquare, Clock, TrendingUp, Award, 
  Calendar, Menu, X, LogOut, Sun, Moon, Activity, UserCog, Crown, 
  Briefcase, GraduationCap, DollarSign, HeadphonesIcon, CheckCircle2,
  BarChart3, Package, Code
} from "lucide-react";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "./ThemeProvider";

// User navigation items
const userNavigation = [
  { name: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
  { name: "Trade Management", href: "/app/trade-management", icon: TrendingUp },
  { name: "Trade Journal", href: "/app/trade-journal", icon: BookOpen },
  { name: "Analytics", href: "/app/analytics", icon: LayoutDashboard },
  { name: "Backtesting", href: "/app/backtesting", icon: Activity },
  { name: "Accounts", href: "/app/prop-firms", icon: TrendingUp },
  { name: "Certificates", href: "/app/certificates", icon: Award },
  { name: "Economic Calendar", href: "/app/calendar", icon: Calendar },
  { name: "AI Assistant", href: "/app/ai-chat", icon: MessageSquare },
  { name: "Sessions", href: "/app/sessions", icon: Clock },
  { name: "Courses", href: "/app/courses", icon: BookOpen },
];

// Role-based dashboard routes
const roleDashboards: Record<string, { name: string; href: string; icon: any; color: string; gradient: string }> = {
  'CEO': { 
    name: 'CEO Dashboard', 
    href: '/app/admin/ceo', 
    icon: Crown, 
    color: 'text-yellow-400',
    gradient: 'from-yellow-500/10 to-yellow-600/10 border-yellow-500/30'
  },
  'COO': { 
    name: 'COO Dashboard', 
    href: '/app/admin/staff/coo', 
    icon: Briefcase, 
    color: 'text-blue-400',
    gradient: 'from-blue-500/10 to-blue-600/10 border-blue-500/30'
  },
  'CTO': { 
    name: 'CTO Dashboard', 
    href: '/app/admin/staff/cto', 
    icon: Code, 
    color: 'text-cyan-400',
    gradient: 'from-cyan-500/10 to-cyan-600/10 border-cyan-500/30'
  },
  'CFO': { 
    name: 'CFO Dashboard', 
    href: '/app/admin/staff/cfo', 
    icon: DollarSign, 
    color: 'text-green-400',
    gradient: 'from-green-500/10 to-green-600/10 border-green-500/30'
  },
  'Course Manager': { 
    name: 'Course Manager', 
    href: '/app/admin/staff/course-manager', 
    icon: GraduationCap, 
    color: 'text-purple-400',
    gradient: 'from-purple-500/10 to-purple-600/10 border-purple-500/30'
  },
  'Support Specialist': { 
    name: 'Support Dashboard', 
    href: '/app/admin/staff/support', 
    icon: HeadphonesIcon, 
    color: 'text-pink-400',
    gradient: 'from-pink-500/10 to-pink-600/10 border-pink-500/30'
  },
  'QA Tester': { 
    name: 'QA Dashboard', 
    href: '/app/admin/staff/qa', 
    icon: CheckCircle2, 
    color: 'text-orange-400',
    gradient: 'from-orange-500/10 to-orange-600/10 border-orange-500/30'
  },
  'Data Analyts': { 
    name: 'Analytics Dashboard', 
    href: '/app/admin/staff/analytics', 
    icon: BarChart3, 
    color: 'text-indigo-400',
    gradient: 'from-indigo-500/10 to-indigo-600/10 border-indigo-500/30'
  },
  'Plaque Order Manager': { 
    name: 'Plaque Orders', 
    href: '/app/admin/staff/plaque-orders', 
    icon: Package, 
    color: 'text-amber-400',
    gradient: 'from-amber-500/10 to-amber-600/10 border-amber-500/30'
  },
  'Social Media Manager': { 
    name: 'Social Media Dashboard', 
    href: '/app/admin/staff/social-media', 
    icon: Activity, 
    color: 'text-rose-400',
    gradient: 'from-rose-500/10 to-rose-600/10 border-rose-500/30'
  },
};

interface StaffRole {
  name: string;
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [staffRoleName, setStaffRoleName] = useState<string | null>(null);
  const [isCEO, setIsCEO] = useState(false);

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        checkAdminStatus(session.user.id);
        checkStaffRole(session.user.id, session.user.email);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        checkAdminStatus(session.user.id);
        checkStaffRole(session.user.id, session.user.email);
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAdminStatus = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .single();
    setIsAdmin(!!data);
  };

  const checkStaffRole = async (userId: string, userEmail?: string | null) => {
    // First try to find by user_id
    let { data: staff } = await supabase
      .from("staff")
      .select(`id, user_id, role:admin_roles(name)`)
      .eq("user_id", userId)
      .single();

    // If not found by user_id, try by email (for pending staff / email-based recognition)
    if (!staff && userEmail) {
      const { data: staffByEmail } = await supabase
        .from("staff")
        .select(`id, user_id, role:admin_roles(name)`)
        .eq("email", userEmail.toLowerCase())
        .single();
      
      staff = staffByEmail;
      
      // If found by email but no user_id, link the account
      if (staffByEmail && !staffByEmail.user_id) {
        await supabase
          .from("staff")
          .update({ user_id: userId, status: 'active' })
          .eq("id", staffByEmail.id);
      }
    }

    if (staff) {
      const role = Array.isArray(staff.role) ? staff.role[0] : staff.role;
      const roleName = (role as StaffRole)?.name || null;
      setStaffRoleName(roleName);
      setIsCEO(roleName === "CEO");
    } else {
      setStaffRoleName(null);
      setIsCEO(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (!user) {
    return null;
  }

  // Get the dashboard for current role
  const currentRoleDashboard = staffRoleName ? roleDashboards[staffRoleName] : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card/50 backdrop-blur-xl border-r border-border/50 transition-transform duration-300 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-border/50 bg-primary-foreground px-[30px] py-[10px]">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                YUNIX
              </h1>
              <p className="text-xs text-muted-foreground mt-1 py-0 my-0 px-[2px]">
                Trading Assistant
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden" 
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto border-none rounded-sm shadow-sm px-[17px] py-[17px] bg-primary-foreground text-primary">
            {/* Role-specific Dashboard Button - Dynamic based on staff role */}
            {currentRoleDashboard && (
              <Link 
                to={currentRoleDashboard.href} 
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 bg-gradient-to-r border",
                  currentRoleDashboard.gradient,
                  location.pathname === currentRoleDashboard.href 
                    ? `bg-opacity-20 ${currentRoleDashboard.color}` 
                    : `${currentRoleDashboard.color} hover:bg-opacity-20`
                )} 
                onClick={() => setSidebarOpen(false)}
              >
                <currentRoleDashboard.icon className="h-5 w-5" />
                <span className="font-medium">{currentRoleDashboard.name}</span>
              </Link>
            )}

            {/* CEO sees all staff dashboards */}
            {isCEO && (
              <div className="space-y-1 pt-2 pb-2 border-b border-border/30 mb-2">
                <p className="text-xs text-muted-foreground px-4 mb-2 uppercase tracking-wider">
                  Staff Dashboards
                </p>
                {Object.entries(roleDashboards)
                  .filter(([name]) => name !== 'CEO')
                  .slice(0, 5)
                  .map(([roleName, dashboard]) => (
                    <Link 
                      key={roleName}
                      to={dashboard.href} 
                      className={cn(
                        "flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 text-sm",
                        location.pathname === dashboard.href 
                          ? `bg-muted ${dashboard.color}` 
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )} 
                      onClick={() => setSidebarOpen(false)}
                    >
                      <dashboard.icon className="h-4 w-4" />
                      <span>{dashboard.name}</span>
                    </Link>
                  ))
                }
              </div>
            )}

            {/* User Navigation */}
            {userNavigation.map(item => {
              const isActive = location.pathname === item.href;
              return (
                <Link 
                  key={item.name} 
                  to={item.href} 
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                    isActive 
                      ? "bg-primary/10 text-primary border border-primary/20" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )} 
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium text-primary">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Bottom section */}
          <div className="p-4 border-t border-border/50 space-y-4 rounded-sm shadow-sm bg-primary-foreground">
            {/* Role Badge */}
            {staffRoleName && (
              <div className="px-4 py-2 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground">Logged in as</p>
                <p className="font-medium text-sm">{staffRoleName}</p>
              </div>
            )}
            
            <Link to={isAdmin || staffRoleName ? "/app/admin/profile" : "/app/profile"}>
              <Button 
                variant="ghost" 
                onClick={() => setSidebarOpen(false)} 
                className="w-full justify-start text-primary"
              >
                <UserCog className="mr-3 h-5 w-5" />
                {isAdmin || staffRoleName ? "Admin Profile" : "Profile"}
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")} 
              className="w-full justify-start text-primary"
            >
              {theme === "dark" ? <Sun className="mr-3 h-5 w-5" /> : <Moon className="mr-3 h-5 w-5" />}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </Button>
            <Button 
              variant="ghost" 
              onClick={handleSignOut} 
              className="w-full justify-start text-primary"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sign Out
            </Button>
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="text-primary">Version 1.0.0</p>
              <p className="text-primary">Built for Traders</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
          <div className="flex items-center justify-between px-4 py-4 bg-primary-foreground">
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

        {/* Page content */}
        <main className="p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
