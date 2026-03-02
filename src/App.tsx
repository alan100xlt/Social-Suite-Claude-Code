import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PostHogPageviewTracker } from "@/components/PostHogPageviewTracker";
import { AuthProvider } from "@/contexts/AuthContext";
import { SelectedCompanyProvider } from "@/contexts/SelectedCompanyContext";
import { CourierTokenProvider } from "@/contexts/CourierContext";
import { PlatformProvider } from "@/contexts/PlatformContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SuperAdminRoute } from "@/components/auth/SuperAdminRoute";
import Index from "./pages/Index";
import Connections from "./pages/Connections";
import Content from "./pages/Content";
import Analytics from "./pages/Analytics";
import AnalyticsV2 from "./pages/AnalyticsV2";
import AnalyticsV3 from "./pages/AnalyticsV3";
import Settings from "./pages/Settings";
import OAuthCallback from "./pages/OAuthCallback";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import SetupCompany from "./pages/SetupCompany";
import GetLateMapping from "./pages/GetLateMapping";
import ApprovePost from "./pages/ApprovePost";
import ApiLogs from "./pages/ApiLogs";
import WizardVariations from "./pages/WizardVariations";
import EmailBranding from "./pages/EmailBranding";
import PlatformSettings from "./pages/PlatformSettings";
import DesignPreview from "./pages/DesignPreview";
import NivoShowcase from "./pages/NivoShowcase";
import LandingPage from "./pages/LandingPage";
import LandingPageV2 from "./pages/LandingPageV2";
import LandingPageV3 from "./pages/LandingPageV3";
import LandingPageV4 from "./pages/LandingPageV4";
import { VersionSwitcher } from "./components/landing/VersionSwitcher";
import GetStarted from "./pages/GetStarted";
import Discover from "./pages/Discover";
import ResetPassword from "./pages/ResetPassword";
import OnboardingWizard from "./pages/OnboardingWizard";
import SuperadminCompanies from "./pages/SuperadminCompanies";
import AdminUsers from "./pages/AdminUsers";
import CronHealth from "./pages/CronHealth";
import Progress from "./pages/Progress";
import MediaCompanyDashboard from "./pages/MediaCompanyDashboard";
import { MediaCompanyWorkspace } from "./pages/MediaCompanyWorkspace";
import ThemeSettings from "./pages/ThemeSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <PlatformProvider>
      <AuthProvider>
        <SelectedCompanyProvider>
          <CourierTokenProvider>
            <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <PostHogPageviewTracker />
            <VersionSwitcher />
            <Routes>
              {/* Marketing (public, root level) */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/v2" element={<LandingPageV2 />} />
              <Route path="/v3" element={<LandingPageV3 />} />
              <Route path="/v4" element={<LandingPageV4 />} />
              <Route path="/get-started" element={<GetStarted />} />
              <Route path="/discover" element={<Discover />} />

              {/* Auth (public, /auth/) */}
              <Route path="/auth/login" element={<Login />} />
              <Route path="/auth/signup" element={<Signup />} />
              <Route path="/auth/reset-password" element={<ResetPassword />} />
              <Route path="/auth/callback" element={<OAuthCallback />} />

              {/* Standalone public */}
              <Route path="/approve/:token" element={<ApprovePost />} />

              {/* Dev-only */}
              <Route path="/design-preview" element={<DesignPreview />} />
              <Route path="/nivo-showcase" element={<NivoShowcase />} />

              {/* Protected: App core */}
              <Route path="/app" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/app/content" element={<ProtectedRoute><Content /></ProtectedRoute>} />
              <Route path="/app/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
              <Route path="/app/analytics-v2" element={<ProtectedRoute><AnalyticsV2 /></ProtectedRoute>} />
              <Route path="/app/analytics-v3" element={<ProtectedRoute><AnalyticsV3 /></ProtectedRoute>} />
              <Route path="/app/connections" element={<ProtectedRoute><Connections /></ProtectedRoute>} />
              <Route path="/app/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/app/theme" element={<ProtectedRoute><ThemeSettings /></ProtectedRoute>} />

              {/* Protected: Onboarding */}
              <Route path="/app/onboarding/setup" element={<ProtectedRoute><SetupCompany /></ProtectedRoute>} />
              <Route path="/app/onboarding/wizard" element={<ProtectedRoute><OnboardingWizard /></ProtectedRoute>} />

              {/* Protected: Automations — redirect to Content */}
              <Route path="/app/automations" element={<Navigate to="/app/content?tab=automations" replace />} />
              <Route path="/app/automations/logs" element={<Navigate to="/app/content?tab=logs" replace />} />

              {/* Protected: Admin / Superadmin */}
              <Route path="/app/admin/api-logs" element={<ProtectedRoute><SuperAdminRoute><ApiLogs /></SuperAdminRoute></ProtectedRoute>} />
              <Route path="/app/admin/mapping" element={<ProtectedRoute><SuperAdminRoute><GetLateMapping /></SuperAdminRoute></ProtectedRoute>} />
              <Route path="/app/admin/email-branding" element={<ProtectedRoute><SuperAdminRoute><EmailBranding /></SuperAdminRoute></ProtectedRoute>} />
              <Route path="/app/admin/platform" element={<ProtectedRoute><SuperAdminRoute><PlatformSettings /></SuperAdminRoute></ProtectedRoute>} />
              <Route path="/app/admin/companies" element={<ProtectedRoute><SuperAdminRoute><SuperadminCompanies /></SuperAdminRoute></ProtectedRoute>} />
              <Route path="/app/admin/cron-health" element={<ProtectedRoute><SuperAdminRoute><CronHealth /></SuperAdminRoute></ProtectedRoute>} />
              <Route path="/app/admin/wizard" element={<ProtectedRoute><SuperAdminRoute><WizardVariations /></SuperAdminRoute></ProtectedRoute>} />
              <Route path="/app/admin/users" element={<ProtectedRoute><SuperAdminRoute><AdminUsers /></SuperAdminRoute></ProtectedRoute>} />
              <Route path="/app/admin/progress" element={<ProtectedRoute><SuperAdminRoute><Progress /></SuperAdminRoute></ProtectedRoute>} />

              {/* Media Company Routes */}
              <Route path="/app/media-company/:mediaCompanyId" element={<ProtectedRoute><MediaCompanyDashboard /></ProtectedRoute>} />
              <Route path="/app/media-company/:mediaCompanyId/workspace" element={<ProtectedRoute><MediaCompanyWorkspace /></ProtectedRoute>} />

              {/* Backward-compatible redirects */}
              <Route path="/landing" element={<Navigate to="/" replace />} />
              <Route path="/login" element={<Navigate to="/auth/login" replace />} />
              <Route path="/signup" element={<Navigate to="/auth/signup" replace />} />
              <Route path="/reset-password" element={<Navigate to="/auth/reset-password" replace />} />
              <Route path="/oauth-callback" element={<Navigate to="/auth/callback" replace />} />
              <Route path="/setup-company" element={<Navigate to="/app/onboarding/setup" replace />} />
              <Route path="/app/posts" element={<Navigate to="/app/content?tab=posts" replace />} />
              <Route path="/analytics" element={<Navigate to="/app/analytics" replace />} />
              <Route path="/connections" element={<Navigate to="/app/connections" replace />} />
              <Route path="/settings" element={<Navigate to="/app/settings" replace />} />
              <Route path="/automations" element={<Navigate to="/app/content?tab=automations" replace />} />
              <Route path="/app/automations/logs" element={<Navigate to="/app/content?tab=logs" replace />} />
              <Route path="/api-logs" element={<Navigate to="/app/admin/api-logs" replace />} />
              <Route path="/getlate-mapping" element={<Navigate to="/app/admin/mapping" replace />} />
              <Route path="/email-branding" element={<Navigate to="/app/admin/email-branding" replace />} />
              <Route path="/platform-settings" element={<Navigate to="/app/admin/platform" replace />} />
              <Route path="/wizard-variations" element={<Navigate to="/app/admin/wizard" replace />} />

              {/* Legacy redirects updated to new paths */}
              <Route path="/create" element={<Navigate to="/app/content?tab=posts" replace />} />
              <Route path="/schedule" element={<Navigate to="/app/content?tab=calendar" replace />} />
              <Route path="/posts" element={<Navigate to="/app/content?tab=posts" replace />} />
              <Route path="/content" element={<Navigate to="/app/content" replace />} />
              <Route path="/company-settings" element={<Navigate to="/app/settings?tab=company" replace />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
        </CourierTokenProvider>
      </SelectedCompanyProvider>
    </AuthProvider>
    </PlatformProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
