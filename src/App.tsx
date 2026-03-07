import React, { Suspense } from "react";
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
import { DemoDataProvider } from "@/lib/demo/DemoDataProvider";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SuperAdminRoute } from "@/components/auth/SuperAdminRoute";

// Eager imports — high-traffic routes that should load immediately
import Index from "./pages/Index";
import Inbox from "./pages/Inbox";
import Connections from "./pages/Connections";
import Content from "./pages/Content";
import ContentV2 from "./pages/ContentV2";
import ContentSources from "./pages/ContentSources";
import Settings from "./pages/Settings";
import OAuthCallback from "./pages/OAuthCallback";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import SetupCompany from "./pages/SetupCompany";
import ApprovePost from "./pages/ApprovePost";
import LandingPage from "./pages/LandingPage";
import LandingPageV2 from "./pages/LandingPageV2";
import LandingPageV3 from "./pages/LandingPageV3";
import LandingPageV4 from "./pages/LandingPageV4";
import MarketingPage from "./pages/MarketingPage";
import { VersionSwitcher } from "./components/landing/VersionSwitcher";
import GetStarted from "./pages/GetStarted";
import Discover from "./pages/Discover";
import ResetPassword from "./pages/ResetPassword";
import OnboardingWizard from "./pages/OnboardingWizard";
import MediaCompanyDashboard from "./pages/MediaCompanyDashboard";
import { MediaCompanyWorkspace } from "./pages/MediaCompanyWorkspace";

// Lazy imports — analytics, admin, and showcase routes
const Analytics = React.lazy(() => import("./pages/Analytics"));
const AdminUsers = React.lazy(() => import("./pages/AdminUsers"));
const AdminPlatformConfig = React.lazy(() => import("./pages/AdminPlatformConfig"));
const AdminDataManagement = React.lazy(() => import("./pages/AdminDataManagement"));
const SuperadminCompanies = React.lazy(() => import("./pages/SuperadminCompanies"));
const CronHealth = React.lazy(() => import("./pages/CronHealth"));
const DataExplorer = React.lazy(() => import("./pages/DataExplorer"));
// AdminAIHealth merged into CronHealth (System Health unified dashboard)
const GetLateMapping = React.lazy(() => import("./pages/GetLateMapping"));
const AgGridShowcase = React.lazy(() => import("./pages/AgGridShowcase"));
const AgGridShowcaseV1 = React.lazy(() => import("./pages/AgGridShowcaseV1"));
const AutomationLogsPage = React.lazy(() => import("./pages/AutomationLogsPage"));
const ApiLogs = React.lazy(() => import("./pages/ApiLogs"));
const WizardVariations = React.lazy(() => import("./pages/WizardVariations"));
const EmailBranding = React.lazy(() => import("./pages/EmailBranding"));
const PlatformSettings = React.lazy(() => import("./pages/PlatformSettings"));
const Progress = React.lazy(() => import("./pages/Progress"));
// OperationsCenter merged into CronHealth (System Health unified dashboard)
const DesignPreview = React.lazy(() => import("./pages/DesignPreview"));
const NivoShowcase = React.lazy(() => import("./pages/NivoShowcase"));
const SocialIntelligence = React.lazy(() => import("./pages/SocialIntelligence"));
const ContentJourney = React.lazy(() => import("./pages/ContentJourney"));

const LazyFallback = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <PlatformProvider>
      <AuthProvider>
        <SelectedCompanyProvider>
        <DemoDataProvider>
          <CourierTokenProvider>
            <ThemeProvider>
            <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <PostHogPageviewTracker />
            <VersionSwitcher />
            <Suspense fallback={<LazyFallback />}>
            <Routes>
              {/* Marketing (public, root level) */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/v2" element={<LandingPageV2 />} />
              <Route path="/v3" element={<LandingPageV3 />} />
              <Route path="/v4" element={<LandingPageV4 />} />
              <Route path="/marketing" element={<MarketingPage />} />
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
              <Route path="/app/content" element={<ProtectedRoute><ContentV2 /></ProtectedRoute>} />
              <Route path="/app/content/sources" element={<ProtectedRoute><ContentSources /></ProtectedRoute>} />
              <Route path="/app/content-legacy" element={<ProtectedRoute><Content /></ProtectedRoute>} />
              <Route path="/app/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
              <Route path="/app/analytics-v2" element={<Navigate to="/app/analytics" replace />} />
              <Route path="/app/analytics-v3" element={<Navigate to="/app/analytics" replace />} />
              <Route path="/app/analytics-v4" element={<Navigate to="/app/analytics" replace />} />
              <Route path="/app/analytics/content-journey" element={<ProtectedRoute><ContentJourney /></ProtectedRoute>} />
              <Route path="/app/inbox" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
              <Route path="/app/connections" element={<ProtectedRoute><Connections /></ProtectedRoute>} />
              <Route path="/app/intelligence" element={<ProtectedRoute><SocialIntelligence /></ProtectedRoute>} />
              <Route path="/app/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />


              {/* Protected: Onboarding */}
              <Route path="/app/onboarding/setup" element={<ProtectedRoute><SetupCompany /></ProtectedRoute>} />
              <Route path="/app/onboarding/wizard" element={<ProtectedRoute><OnboardingWizard /></ProtectedRoute>} />

              {/* Protected: Automations — redirect to Content Sources */}
              <Route path="/app/automations" element={<Navigate to="/app/content/sources" replace />} />
              <Route path="/app/automations/logs" element={<Navigate to="/app/admin/automation-logs" replace />} />

              {/* Protected: Admin / Superadmin */}
              <Route path="/app/admin/platform-config" element={<ProtectedRoute><SuperAdminRoute><AdminPlatformConfig /></SuperAdminRoute></ProtectedRoute>} />
              <Route path="/app/admin/data" element={<ProtectedRoute><SuperAdminRoute><AdminDataManagement /></SuperAdminRoute></ProtectedRoute>} />
              <Route path="/app/admin/api-logs" element={<ProtectedRoute><SuperAdminRoute><ApiLogs /></SuperAdminRoute></ProtectedRoute>} />
              <Route path="/app/admin/mapping" element={<ProtectedRoute><SuperAdminRoute><GetLateMapping /></SuperAdminRoute></ProtectedRoute>} />
              <Route path="/app/admin/cron-health" element={<ProtectedRoute><SuperAdminRoute><CronHealth /></SuperAdminRoute></ProtectedRoute>} />
              <Route path="/app/admin/data-explorer" element={<ProtectedRoute><SuperAdminRoute><DataExplorer /></SuperAdminRoute></ProtectedRoute>} />
              <Route path="/app/admin/ai-health" element={<Navigate to="/app/admin/cron-health" replace />} />
              <Route path="/app/admin/wizard" element={<ProtectedRoute><SuperAdminRoute><WizardVariations /></SuperAdminRoute></ProtectedRoute>} />
              <Route path="/app/admin/progress" element={<ProtectedRoute><SuperAdminRoute><Progress /></SuperAdminRoute></ProtectedRoute>} />
              <Route path="/app/admin/automation-logs" element={<ProtectedRoute><SuperAdminRoute><AutomationLogsPage /></SuperAdminRoute></ProtectedRoute>} />
              <Route path="/app/admin/operations" element={<Navigate to="/app/admin/cron-health" replace />} />
              <Route path="/app/admin/ag-grid-showcase" element={<ProtectedRoute><SuperAdminRoute><AgGridShowcase /></SuperAdminRoute></ProtectedRoute>} />
              <Route path="/app/admin/ag-grid-showcase-v1" element={<ProtectedRoute><SuperAdminRoute><AgGridShowcaseV1 /></SuperAdminRoute></ProtectedRoute>} />

              {/* Admin redirects (old routes → new tabbed pages) */}
              <Route path="/app/admin/platform" element={<Navigate to="/app/admin/platform-config?tab=branding" replace />} />
              <Route path="/app/admin/email-branding" element={<Navigate to="/app/admin/platform-config?tab=email" replace />} />
              <Route path="/app/admin/companies" element={<Navigate to="/app/admin/data?tab=companies" replace />} />
              <Route path="/app/admin/users" element={<Navigate to="/app/admin/data?tab=users" replace />} />

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
              <Route path="/automations" element={<Navigate to="/app/content/sources" replace />} />
              <Route path="/api-logs" element={<Navigate to="/app/admin/api-logs" replace />} />
              <Route path="/getlate-mapping" element={<Navigate to="/app/admin/mapping" replace />} />
              <Route path="/email-branding" element={<Navigate to="/app/admin/platform-config?tab=email" replace />} />
              <Route path="/platform-settings" element={<Navigate to="/app/admin/platform-config?tab=branding" replace />} />
              <Route path="/wizard-variations" element={<Navigate to="/app/admin/wizard" replace />} />

              {/* Legacy redirects updated to new paths */}
              <Route path="/create" element={<Navigate to="/app/content?tab=posts" replace />} />
              <Route path="/schedule" element={<Navigate to="/app/content?tab=calendar" replace />} />
              <Route path="/posts" element={<Navigate to="/app/content?tab=posts" replace />} />
              <Route path="/content" element={<Navigate to="/app/content" replace />} />
              <Route path="/company-settings" element={<Navigate to="/app/settings?tab=company" replace />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
        </ThemeProvider>
        </CourierTokenProvider>
        </DemoDataProvider>
      </SelectedCompanyProvider>
    </AuthProvider>
    </PlatformProvider>
  </QueryClientProvider>
);

export default App;
