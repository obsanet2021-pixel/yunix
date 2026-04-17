import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider";
import { useCapacitor } from "./hooks/use-capacitor";
import UserLayout from "./components/UserLayout";
import AdminLayout from "./components/AdminLayout";
import Dashboard from "./pages/Dashboard";
import TradeJournal from "./pages/TradeJournal";
import JournalDetail from "./pages/JournalDetail";
import TradeManagement from "./pages/TradeManagement";
import Analytics from "./pages/Analytics";
import PropFirms from "./pages/PropFirms";
import PropFirmDetail from "./pages/PropFirmDetail";
import Certificates from "./pages/Certificates";
import EconomicCalendar from "./pages/EconomicCalendar";
import AIChat from "./pages/AIChat";
import TradePlanner from "./pages/TradePlanner";
import Sessions from "./pages/Sessions";
import Backtesting from "./pages/Backtesting";
import BacktestSessions from "./pages/BacktestSessions";
import BacktestReplay from "./pages/BacktestReplay";
import Welcome from "./pages/Welcome";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import HomePage from "./pages/HomePage";
import Courses from "./pages/Courses";
import CourseView from "./pages/CourseView";
import AdminProfile from "./pages/AdminProfile";
import UserProfile from "./pages/UserProfile";
import UserSupport from "./pages/UserSupport";
import UserOrders from "./pages/UserOrders";
import OrderDetail from "./pages/OrderDetail";
import HelpCenter from "./pages/HelpCenter";
import NotFound from "./pages/NotFound";
import CEODashboard from "./pages/admin/CEODashboard";
import StaffManagement from "./pages/admin/StaffManagement";
import RoleManagement from "./pages/admin/RoleManagement";
import SystemSettings from "./pages/admin/SystemSettings";
import AdminFinance from "./pages/admin/AdminFinance";
import AdminSupport from "./pages/admin/AdminSupport";
import StaffDashboard from "./pages/admin/StaffDashboard";
import QADashboard from "./pages/admin/staff/QADashboard";
import DataAnalystDashboard from "./pages/admin/staff/DataAnalystDashboard";
import CourseManagerDashboard from "./pages/admin/staff/CourseManagerDashboard";
import SupportDashboard from "./pages/admin/staff/SupportDashboard";
import MarketingDashboard from "./pages/admin/staff/MarketingDashboard";
import SocialMediaDashboard from "./pages/admin/staff/SocialMediaDashboard";
import CFODashboard from "./pages/admin/staff/CFODashboard";
import CTODashboard from "./pages/admin/staff/CTODashboard";
import COODashboard from "./pages/admin/staff/COODashboard";
import PlaqueOrdersManagement from "./pages/admin/PlaqueOrdersManagement";
import PlaqueOrdersDashboard from "./pages/admin/staff/PlaqueOrdersDashboard";
import AnalyticsDashboard from "./pages/admin/staff/AnalyticsDashboard";
import TelegramBotManagement from "./pages/admin/TelegramBotManagement";
import TelegramBroadcasts from "./pages/admin/TelegramBroadcasts";
import AcceptInvite from "./pages/auth/AcceptInvite";
import UpdatePassword from "./pages/auth/UpdatePassword";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import About from "./pages/About";
import Careers from "./pages/Careers";
import Blog from "./pages/Blog";
import Contact from "./pages/Contact";
import CookiePolicy from "./pages/CookiePolicy";
import CEOBotManagement from "./pages/admin/CEOBotManagement";
import DeliveryBotManagement from "./pages/admin/DeliveryBotManagement";
import Loyalty from "./pages/Loyalty";
import Partners from "./pages/Partners";
import Payouts from "./pages/Payouts";
import InvitationContest from "./pages/InvitationContest";
import LoyaltyOperations from "./pages/admin/LoyaltyOperations";
import PartnerOperations from "./pages/admin/PartnerOperations";
import DiscountRules from "./pages/admin/DiscountRules";

const queryClient = new QueryClient();

const AppContent = () => {
  useCapacitor();
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/landing" element={<Landing />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/auth/accept-invite" element={<AcceptInvite />} />
      <Route path="/auth/update-password" element={<UpdatePassword />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/about" element={<About />} />
      <Route path="/careers" element={<Careers />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/cookies" element={<CookiePolicy />} />
      <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />

      {/* User App Routes (Protected) - USER Layout */}
      <Route path="/app" element={<UserLayout />}>
        <Route index element={<Welcome />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="trade-management" element={<TradeManagement />} />
        <Route path="trade-journal" element={<TradeJournal />} />
        <Route path="journal/:id" element={<JournalDetail />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="backtesting" element={<Backtesting />} />
        <Route path="backtest-sessions" element={<BacktestSessions />} />
        <Route path="backtest-replay/:sessionId" element={<BacktestReplay />} />
        <Route path="prop-firms" element={<PropFirms />} />
        <Route path="prop-firms/:id" element={<PropFirmDetail />} />
        <Route path="certificates" element={<Certificates />} />
        <Route path="calendar" element={<EconomicCalendar />} />
        <Route path="ai-chat" element={<AIChat />} />
        <Route path="trade-planner" element={<TradePlanner />} />
        <Route path="sessions" element={<Sessions />} />
        <Route path="courses" element={<Courses />} />
        <Route path="courses/:slug" element={<CourseView />} />
        <Route path="profile" element={<UserProfile />} />
        <Route path="support" element={<UserSupport />} />
        <Route path="orders" element={<UserOrders />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route path="help" element={<HelpCenter />} />
        <Route path="loyalty" element={<Loyalty />} />
        <Route path="partners" element={<Partners />} />
        <Route path="payouts" element={<Payouts />} />
        <Route path="contest" element={<InvitationContest />} />
      </Route>

      {/* Admin Routes (Protected) - ADMIN Layout */}
      <Route path="/app/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/app/admin/ceo" replace />} />
        <Route path="profile" element={<AdminProfile />} />
        <Route path="ceo" element={<CEODashboard />} />
        <Route path="staff" element={<StaffDashboard />} />
        <Route path="staff-management" element={<StaffManagement />} />
        <Route path="roles" element={<RoleManagement />} />
        <Route path="settings" element={<SystemSettings />} />
        <Route path="finance" element={<AdminFinance />} />
        <Route path="support" element={<AdminSupport />} />
        <Route path="plaque-orders" element={<PlaqueOrdersManagement />} />
        <Route path="telegram-bot" element={<TelegramBotManagement />} />
        <Route path="telegram-updates" element={<TelegramBroadcasts />} />
        <Route path="ceo-bot" element={<CEOBotManagement />} />
        <Route path="delivery-bot" element={<DeliveryBotManagement />} />
        <Route path="loyalty-operations" element={<LoyaltyOperations />} />
        <Route path="partner-operations" element={<PartnerOperations />} />
        <Route path="discount-rules" element={<DiscountRules />} />

        {/* Staff Role Dashboards */}
        <Route path="staff/coo" element={<COODashboard />} />
        <Route path="staff/cto" element={<CTODashboard />} />
        <Route path="staff/cfo" element={<CFODashboard />} />
        <Route path="staff/course-manager" element={<CourseManagerDashboard />} />
        <Route path="staff/support" element={<SupportDashboard />} />
        <Route path="staff/qa" element={<QADashboard />} />
        <Route path="staff/data-analyst" element={<DataAnalystDashboard />} />
        <Route path="staff/marketing" element={<MarketingDashboard />} />
        <Route path="staff/social-media" element={<SocialMediaDashboard />} />
        <Route path="staff/plaque-orders" element={<PlaqueOrdersDashboard />} />
        <Route path="staff/analytics" element={<AnalyticsDashboard />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="trading-app-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
