import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useHasMembership, useCompany } from '@/hooks/useCompany';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading: authLoading, isSuperAdmin, superAdminLoading } = useAuth();
  const { data: hasMembership, isLoading: membershipLoading } = useHasMembership();
  const { data: company, isLoading: companyLoading } = useCompany();
  const location = useLocation();

  if (authLoading || membershipLoading || superAdminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // If user has no memberships and is not a superadmin, redirect to setup
  if (!hasMembership && !isSuperAdmin && location.pathname !== '/app/onboarding/setup') {
    return <Navigate to="/app/onboarding/setup" replace />;
  }

  // If company is in onboarding and user is not already on wizard/setup pages, redirect to wizard
  const isOnboardingPage = location.pathname.startsWith('/app/onboarding');
  if (
    hasMembership &&
    !isSuperAdmin &&
    !isOnboardingPage &&
    !companyLoading &&
    company &&
    (company as any).onboarding_status === 'in_progress' &&
    (company as any).onboarding_status !== 'wizard_complete'
  ) {
    return <Navigate to="/app/onboarding/wizard" replace />;
  }

  return <>{children}</>;
}
