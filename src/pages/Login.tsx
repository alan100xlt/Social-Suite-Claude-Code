import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatform } from '@/contexts/PlatformContext';
import { LoginForm } from '@/components/auth/LoginForm';

export default function Login() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const platform = usePlatform();

  useEffect(() => {
    if (!loading && user) {
      navigate('/app');
    }
  }, [user, loading, navigate]);

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
        <LoginForm />
      </div>
    </div>
  );
}
