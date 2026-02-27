import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { identifyUser, resetPostHog } from '@/lib/posthog';

// No more hardcoded superadmin – status is driven by the `superadmins` table.

const IMPERSONATION_KEY = 'impersonation_original_session';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isSuperAdmin: boolean;
  superAdminLoading: boolean;
  isImpersonating: boolean;
  impersonatingEmail: string | null;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  impersonateUser: (email: string) => Promise<{ error: Error | null }>;
  stopImpersonating: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [superAdminLoading, setSuperAdminLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatingEmail, setImpersonatingEmail] = useState<string | null>(null);

  // Check superadmin status from the database
  const checkSuperAdmin = async () => {
    setSuperAdminLoading(true);
    try {
      const storedImp = localStorage.getItem(IMPERSONATION_KEY);
      if (storedImp) {
        setIsSuperAdmin(false);
        return;
      }
      const { data } = await supabase.rpc('is_superadmin');
      setIsSuperAdmin(!!data);
    } finally {
      setSuperAdminLoading(false);
    }
  };

  useEffect(() => {
    // Check if we're currently impersonating
    const stored = localStorage.getItem(IMPERSONATION_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setIsImpersonating(true);
        setImpersonatingEmail(parsed.impersonatingEmail);
      } catch {}
    }

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Skip PostHog identify and superadmin check during password recovery
          // to avoid interfering with the ResetPassword page
          if (event !== "PASSWORD_RECOVERY") {
            identifyUser(session.user.id, session.user.email);
            // Schedule superadmin check outside the callback to avoid deadlocking
            // Supabase's auth listener blocks further Supabase calls when awaited
            setTimeout(async () => {
              await checkSuperAdmin();
              setLoading(false);
            }, 0);
          } else {
            setSuperAdminLoading(false);
            setLoading(false);
          }

          // Auto-claim discovery company on sign-in (magic link return)
          if (event === "SIGNED_IN") {
            const pendingCompanyId = localStorage.getItem('pendingCompanyId');
            if (pendingCompanyId) {
              setTimeout(async () => {
                try {
                  await supabase.functions.invoke('claim-discovery-company', {
                    body: { companyId: pendingCompanyId },
                  });
                  localStorage.removeItem('pendingCompanyId');
                  const path = window.location.pathname;
                  if (path === '/discover' || path === '/get-started' || path === '/') {
                    // Navigate to /app — ProtectedRoute will redirect to wizard if onboarding is in_progress
                    window.location.href = '/app';
                  }
                } catch (e) {
                  console.error('Auto-claim failed:', e);
                }
              }, 0);
            }
          }
        } else {
          resetPostHog();
          setIsSuperAdmin(false);
          setSuperAdminLoading(false);
          setLoading(false);
        }
      }
    );

    // Then get the initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setSession(session);
        setUser(session.user);
        await checkSuperAdmin();
      } else {
        setSuperAdminLoading(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    localStorage.removeItem(IMPERSONATION_KEY);
    setIsImpersonating(false);
    setImpersonatingEmail(null);
    await supabase.auth.signOut();
    setIsSuperAdmin(false);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error as Error | null };
  };

  const impersonateUser = async (email: string): Promise<{ error: Error | null }> => {
    try {
      // Save current session before impersonating
      const { data: currentSession } = await supabase.auth.getSession();
      if (!currentSession.session) {
        return { error: new Error('No current session') };
      }

      // Call edge function to get magic link token
      const { data, error } = await supabase.functions.invoke('impersonate-user', {
        body: { targetEmail: email },
      });

      if (error) return { error: error as Error };
      if (data?.error) return { error: new Error(data.error) };

      const { tokenHash } = data;

      // Store original session tokens for restoration
      localStorage.setItem(IMPERSONATION_KEY, JSON.stringify({
        accessToken: currentSession.session.access_token,
        refreshToken: currentSession.session.refresh_token,
        impersonatingEmail: email,
      }));

      // Verify the OTP to establish session as the target user
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'magiclink',
      });

      if (verifyError) {
        localStorage.removeItem(IMPERSONATION_KEY);
        return { error: verifyError as Error };
      }

      setIsImpersonating(true);
      setImpersonatingEmail(email);
      setIsSuperAdmin(false); // Hide all superadmin UI while impersonating

      return { error: null };
    } catch (err) {
      localStorage.removeItem(IMPERSONATION_KEY);
      return { error: err as Error };
    }
  };

  const stopImpersonating = async () => {
    const stored = localStorage.getItem(IMPERSONATION_KEY);
    if (!stored) return;

    try {
      const { accessToken, refreshToken } = JSON.parse(stored);
      
      // Restore the original superadmin session
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      localStorage.removeItem(IMPERSONATION_KEY);
      setIsImpersonating(false);
      setImpersonatingEmail(null);
      setIsSuperAdmin(true);

      // Reload to refresh all data
      window.location.reload();
    } catch (error) {
      console.error('Error restoring session:', error);
      // Fallback: sign out completely
      localStorage.removeItem(IMPERSONATION_KEY);
      await supabase.auth.signOut();
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isSuperAdmin,
        superAdminLoading,
        isImpersonating,
        impersonatingEmail,
        signUp,
        signIn,
        signOut,
        resetPassword,
        impersonateUser,
        stopImpersonating,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
