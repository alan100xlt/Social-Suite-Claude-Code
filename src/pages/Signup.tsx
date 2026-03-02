import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatform } from '@/contexts/PlatformContext';
import { SignupForm } from '@/components/auth/SignupForm';

export default function Signup() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const platform = usePlatform();

  useEffect(() => {
    if (!loading && user) {
      navigate(inviteToken ? '/app/onboarding/wizard' : '/app');
    }
  }, [user, loading, navigate, inviteToken]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
         {platform.platform_logo_url ? (
            <img src={platform.platform_logo_url} alt={platform.platform_name} className="h-10 mx-auto mb-3 object-contain" />
          ) : (
            <img src="/images/longtale-logo-light.png" alt="Longtale.ai" className="h-10 mx-auto mb-3 object-contain" />
          )}
          <h1 className="text-3xl font-bold text-primary">{platform.platform_name}</h1>
          <p className="text-muted-foreground mt-2">Social Media Dashboard</p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
