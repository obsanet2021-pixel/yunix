import { useState, useEffect } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { useStaffPermissions } from "@/hooks/useStaffPermissions";
import { useAuth } from "@/components/auth/AuthProvider";
import { 
  LayoutDashboard, BookOpen, MessageSquare, Clock, TrendingUp, Award, 
  Calendar, Menu, X, LogOut, Sun, Moon, Activity, UserCog, HelpCircle, Send, Package,
  ChevronLeft, ChevronRight, Gift, Users, Settings, Calculator, Camera, Plus, Wallet, BarChart3, Building2,
  Shield, Trophy
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "./ThemeProvider";

import MaintenancePage from "@/pages/MaintenancePage";
import YunixLogo from "./YunixLogo";

// Telegram bot button expires 24 hours from deployment (Dec 19, 2025 ~11:00 UTC)
const TELEGRAM_BUTTON_EXPIRY = new Date('2025-12-19T11:00:00Z').getTime();

// User navigation items ONLY - no admin pages
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

// Rewards section - separate from main nav
const rewardsNavigation = [
  { name: "Loyalty Rewards", href: "/app/loyalty", icon: Gift },
  { name: "Partner Program", href: "/app/partners", icon: Users },
  { name: "Invitation Contest", href: "/app/contest", icon: Trophy },
];

const roleRoutes: Record<string, string> = {
  'CEO': '/app/admin/ceo',
  'COO': '/app/admin/staff/coo',
  'CTO': '/app/admin/staff/cto',
  'CFO': '/app/admin/staff/cfo',
  'Course Manager': '/app/admin/staff/course-manager',
  'Support Specialist': '/app/admin/staff/support',
  'Support Agent': '/app/admin/staff/support',
  'QA & Support': '/app/admin/staff/support',
  'QA Tester': '/app/admin/staff/qa',
  'Data Analyst': '/app/admin/staff/analytics',
  'Data Analyts': '/app/admin/staff/analytics',
  'Plaque Order Manager': '/app/admin/staff/plaque-orders',
  'order Manager': '/app/admin/staff/plaque-orders',
  'Social Media Manager': '/app/admin/staff/social-media',
  'Social Media': '/app/admin/staff/social-media',
  'Marketing': '/app/admin/staff/marketing',
  'Marketing Agent': '/app/admin/staff/marketing',
  'Backend Developer': '/app/admin/staff/cto',
  'Frontend Developer': '/app/admin/staff/cto',
};

export default function UserLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { isEnabled } = useFeatureToggles();
  const isMobile = useIsMobile();
  const { user, signOut } = useAuth();
  const { isStaff } = useStaffPermissions();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('userSidebarCollapsed');
      return saved === 'true';
    } catch {
      return false;
    }
  });
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [checkingMaintenance, setCheckingMaintenance] = useState(true);
  const [showAddAccountSheet, setShowAddAccountSheet] = useState(false);

  // Native haptic feedback (disabled for web builds)
  const triggerHaptic = async () => {
    // Haptic feedback only available in native apps
  };

  // Filter rewards navigation based on feature toggles
  const filteredRewardsNavigation = rewardsNavigation.filter(item => {
    if (item.href === '/app/loyalty') return isEnabled('loyalty_program');
    if (item.href === '/app/partners') return isEnabled('partner_program');
    if (item.href === '/app/contest') return isEnabled('invitation_contest');
    return true;
  });
  
  const toggleSidebarCollapse = () => {
    const newValue = !sidebarCollapsed;
    setSidebarCollapsed(newValue);
    try {
      localStorage.setItem('userSidebarCollapsed', String(newValue));
    } catch (error) {
      console.error('Failed to save sidebar state:', error);
    }
  };

  // Auto-collapse sidebar when navigating to AI Chat
  useEffect(() => {
    if (location.pathname === '/app/ai-chat') {
      setSidebarCollapsed(true);
    }
  }, [location.pathname]);

  // Check maintenance mode
  useEffect(() => {
    const checkMaintenance = async () => {
      const result = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .single();

      const data = result.data as unknown as { value: { enabled: boolean; message: string } | null } | null;

      if (data?.value) {
        setMaintenanceMode(data.value.enabled || false);
        setMaintenanceMessage(data.value.message || '');
      }
      setCheckingMaintenance(false);
    };
    checkMaintenance();
  }, []);

  const handleSignOut = async () => {
    await signOut();
  };

  const switchToAdmin = () => {
    // ✅ UI only - RLS protects data on backend
    if (isStaff) {
      navigate('/app/admin/ceo');
    }
  };

  if (checkingMaintenance) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (maintenanceMode && !isStaff) {
    return <MaintenancePage message={maintenanceMessage} />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Maintenance Mode Banner for Staff */}
      {maintenanceMode && isStaff && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-500/90 text-amber-950 px-4 py-2 text-center text-sm font-medium">
          <span className="inline-flex items-center gap-2">
            <Settings className="h-4 w-4 animate-spin" style={{ animationDuration: '3s' }} />
            Maintenance Mode Active - Visible to staff only
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
        maintenanceMode && isStaff && "lg:top-12"
      )}>
        <div className="flex flex-col h-full">
          <div className={cn(
            "flex items-center justify-between border-b border-border/30",
            sidebarCollapsed ? "p-3 justify-center" : "p-4"
          )}>
            <YunixLogo isAdmin={false} collapsed={sidebarCollapsed} />
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden" 
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <nav className={cn(
            "flex-1 space-y-1 overflow-y-auto",
            sidebarCollapsed ? "p-2" : "p-3"
          )}>
            {userNavigation.map(item => {
              const isActive = location.pathname === item.href;
              return (
                <Link 
                  key={item.name} 
                  to={item.href} 
                  className={cn(
                    "flex items-center transition-all duration-200",
                    sidebarCollapsed 
                      ? "justify-center p-3 rounded-xl" 
                      : "gap-3 px-4 py-2.5 rounded-xl",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-md" 
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )} 
                  onClick={() => { setSidebarOpen(false); triggerHaptic(); }}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!sidebarCollapsed && <span className="font-medium text-sm">{item.name}</span>}
                </Link>
              );
            })}
            
            {/* Rewards Section - Only show if there are items */}
            {filteredRewardsNavigation.length > 0 && (
              <div className="pt-2 mt-2 border-t border-border/30">
                {!sidebarCollapsed && (
                  <p className="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rewards</p>
                )}
                {filteredRewardsNavigation.map(item => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link 
                      key={item.name} 
                      to={item.href} 
                      className={cn(
                        "flex items-center transition-all duration-200",
                        sidebarCollapsed 
                          ? "justify-center p-3 rounded-xl" 
                          : "gap-3 px-4 py-2.5 rounded-xl",
                        isActive 
                          ? "bg-primary text-primary-foreground shadow-md" 
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )} 
                      onClick={() => { setSidebarOpen(false); triggerHaptic(); }}
                      title={sidebarCollapsed ? item.name : undefined}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!sidebarCollapsed && <span className="font-medium text-sm">{item.name}</span>}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Help Section */}
            <div className="pt-2 mt-2 border-t border-border/30">
              <Link 
                to="/app/help" 
                className={cn(
                  "flex items-center transition-all duration-200",
                  sidebarCollapsed 
                    ? "justify-center p-3 rounded-xl" 
                    : "gap-3 px-4 py-2.5 rounded-xl",
                  location.pathname === "/app/help" || location.pathname === "/app/support"
                    ? "bg-primary text-primary-foreground shadow-md" 
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )} 
                onClick={() => { setSidebarOpen(false); triggerHaptic(); }}
                title={sidebarCollapsed ? "Help Center" : undefined}
              >
                <HelpCircle className="h-5 w-5 shrink-0" />
                {!sidebarCollapsed && <span className="font-medium text-sm">Help Center</span>}
              </Link>
            </div>
          </nav>

          <div className={cn(
            "border-t border-border/30 space-y-2",
            sidebarCollapsed ? "p-2" : "p-3"
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
            
            {/* Admin Switch Button - ONLY for staff members */}
            {!sidebarCollapsed && isStaff ? (
              <Button
                variant="ghost"
                onClick={switchToAdmin}
                className="w-full justify-start text-yellow-500 hover:text-yellow-600 hover:bg-yellow-500/10 rounded-xl"
              >
                <Shield className="mr-3 h-5 w-5" />
                Switch to Admin
              </Button>
            ) : !sidebarCollapsed ? (
              <Button 
                variant="ghost" 
                onClick={handleSignOut} 
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
              >
                <LogOut className="mr-3 h-5 w-5" />
                Sign Out
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleSignOut} 
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
                title="Sign Out"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            )}
            
            {!sidebarCollapsed ? (
              <>
                <Link to="/app/profile">
                  <Button 
                    variant="ghost" 
                    onClick={() => { setSidebarOpen(false); triggerHaptic(); }}
                    className="w-full justify-start hover:bg-muted/50 rounded-xl"
                  >
                    <UserCog className="mr-3 h-5 w-5" />
                    Profile
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
                <div className="text-xs text-muted-foreground space-y-0.5 pt-2 px-1">
                  <p>Version 1.0.0</p>
                  <p>Built for Traders</p>
                </div>
              </>
            ) : (
              <>
                <Link to="/app/profile">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => { setSidebarOpen(false); triggerHaptic(); }}
                    className="w-full hover:bg-muted/50 rounded-xl"
                    title="Profile"
                  >
                    <UserCog className="h-5 w-5" />
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")} 
                  className="w-full hover:bg-muted/50 rounded-xl"
                  title={theme === "dark" ? "Light Mode" : "Dark Mode"}
                >
                  {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
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
              {/* Temporary Telegram Bot Connect Button - expires in 24 hours */}
              {Date.now() < TELEGRAM_BUTTON_EXPIRY && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="hidden sm:flex items-center gap-2 border-primary/50 hover:bg-primary/10 rounded-xl"
                  onClick={() => window.open(`https://t.me/YunixOfficialBot?start=link_${user?.id}`, '_blank')}
                >
                  <Send className="h-4 w-4" />
                  <span className="hidden md:inline">Connect Telegram</span>
                </Button>
              )}
              
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

        <main className={cn("p-4 sm:p-6 animate-fade-in", isMobile && "pb-24")}>
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/50 px-2 py-1.5 lg:hidden pb-safe">
          <div className="flex items-center justify-around">
            {[
              { icon: LayoutDashboard, label: "Home", href: "/app/dashboard" },
              { icon: BarChart3, label: "My Stats", href: "/app/analytics" },
              { icon: Plus, label: "New", href: "", isCenter: true },
              { icon: Wallet, label: "Payouts", href: "/app/payouts" },
              { icon: Award, label: "Certs", href: "/app/certificates" },
            ].map((item) => {
              const isActive = item.href ? location.pathname === item.href : false;
              
              if (item.isCenter) {
                return (
                  <button
                    key={item.label}
                    onClick={() => { setShowAddAccountSheet(true); triggerHaptic(); }}
                    className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-colors min-w-[48px] relative text-muted-foreground"
                  >
                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center -mt-4 shadow-lg">
                      <Plus className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <span className="text-[10px] font-medium">New</span>
                  </button>
                );
              }
              
              return (
                <Link
                  key={item.label}
                  to={item.href}
                  onClick={triggerHaptic}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-colors min-w-[48px]",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {/* Add Account Bottom Sheet */}
      {showAddAccountSheet && (
        <div className="fixed inset-0 z-[60] lg:hidden" onClick={() => setShowAddAccountSheet(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div 
            className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl p-6 space-y-4 animate-in slide-in-from-bottom duration-300 pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto" />
            <h3 className="text-lg font-semibold text-center">Add New Account</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setShowAddAccountSheet(false); triggerHaptic(); navigate('/app/prop-firms?add=propfirm'); }}
                className="flex flex-col items-center gap-3 p-4 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors"
              >
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-center">Prop Firm Account</span>
              </button>
              <button
                onClick={() => { setShowAddAccountSheet(false); triggerHaptic(); navigate('/app/prop-firms?add=personal'); }}
                className="flex flex-col items-center gap-3 p-4 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors"
              >
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCog className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-center">Personal Account</span>
              </button>
            </div>
            <Button variant="ghost" className="w-full" onClick={() => { setShowAddAccountSheet(false); triggerHaptic(); }}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
