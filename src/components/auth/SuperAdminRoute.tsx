import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SuperAdminRouteProps {
  children: React.ReactNode;
}

export function SuperAdminRoute({ children }: SuperAdminRouteProps) {
  const { isSuperAdmin, superAdminLoading } = useAuth();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (superAdminLoading || isSuperAdmin) return;

    if (countdown <= 0) {
      navigate('/app', { replace: true });
      return;
    }

    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [isSuperAdmin, superAdminLoading, countdown, navigate]);

  if (superAdminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-sm">
          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 p-4">
              <ShieldX className="h-10 w-10 text-destructive" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Access Restricted</h1>
          <p className="text-muted-foreground text-sm">
            This page is restricted to platform administrators.
          </p>
          <p className="text-muted-foreground text-sm">
            Redirecting you to the dashboard in{' '}
            <span className="font-semibold text-foreground">{countdown}</span>{' '}
            {countdown === 1 ? 'second' : 'seconds'}...
          </p>
          <Button onClick={() => navigate('/app', { replace: true })} variant="outline" size="sm">
            Go to Dashboard now
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
