import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useCreateCompany } from '@/hooks/useCompany';
import { usePlatform } from '@/contexts/PlatformContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Building2, UserPlus, Mail, Shield, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface PendingInvitation {
  id: string;
  company_id: string;
  role: 'owner' | 'admin' | 'member';
  company_name: string;
}

export default function SetupCompany() {
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useProfile();
  const platform = usePlatform();
  const createCompany = useCreateCompany();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAddingNew = searchParams.get('addNew') === 'true';
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [checkingInvitation, setCheckingInvitation] = useState(true);
  const [acceptingInvitation, setAcceptingInvitation] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Auto-generate slug from name
  useEffect(() => {
    const generatedSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setSlug(generatedSlug);
  }, [name]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth/login');
    }
  }, [user, authLoading, navigate]);

  // Check for existing memberships
  const [hasMembership, setHasMembership] = useState<boolean | null>(null);
  useEffect(() => {
    const checkMembership = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('company_memberships')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      setHasMembership(!!data);
    };
    if (!authLoading && user) checkMembership();
  }, [user, authLoading]);

  // Redirect if already has a company membership (unless explicitly adding a new company)
  useEffect(() => {
    if (hasMembership === true && !isAddingNew) {
      navigate('/app');
    }
  }, [hasMembership, navigate, isAddingNew]);

  // Check for pending invitations
  useEffect(() => {
    const checkPendingInvitations = async () => {
      if (!user?.email) {
        setCheckingInvitation(false);
        return;
      }

      try {
        const { data: invitations, error } = await supabase
          .from('company_invitations')
          .select('id, company_id, role')
          .eq('email', user.email.toLowerCase())
          .is('accepted_at', null)
          .gt('expires_at', new Date().toISOString());

        if (error) {
          console.error('Error checking invitations:', error);
          setCheckingInvitation(false);
          return;
        }

        if (invitations && invitations.length > 0) {
          // Get company names for all invitations
          const companyIds = invitations.map(inv => inv.company_id);
          const { data: companies } = await supabase
            .from('companies')
            .select('id, name')
            .in('id', companyIds);

          const companyMap = new Map(companies?.map(c => [c.id, c.name]) || []);

          setPendingInvitations(
            invitations.map(inv => ({
              ...inv,
              company_name: companyMap.get(inv.company_id) || 'Unknown Company',
            }))
          );
        }
      } catch (error) {
        console.error('Error checking invitations:', error);
      } finally {
        setCheckingInvitation(false);
      }
    };

    if (user?.email && !authLoading) {
      checkPendingInvitations();
    }
  }, [user, authLoading]);

  const handleAcceptInvitation = async (invitation: PendingInvitation) => {
    if (!user) return;

    setAcceptingInvitation(true);

    try {
      // Verify the invitation email matches the current user
      const { data: inv, error: invCheckError } = await supabase
        .from('company_invitations')
        .select('email')
        .eq('id', invitation.id)
        .single();

      if (invCheckError || !inv) throw new Error('Invitation not found');
      if (inv.email.toLowerCase() !== user.email?.toLowerCase()) {
        throw new Error('This invitation was sent to a different email address');
      }

      const { error: membershipError } = await supabase
        .from('company_memberships')
        .insert({
          user_id: user.id,
          company_id: invitation.company_id,
          role: invitation.role,
        });

      if (membershipError) throw membershipError;

      const { error: inviteError } = await supabase
        .from('company_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);

      if (inviteError) throw inviteError;

      toast({
        title: 'Welcome to the team!',
        description: `You've joined ${invitation.company_name}`,
      });

      await refetchProfile();
      navigate('/app');
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to accept invitation',
        variant: 'destructive',
      });
    } finally {
      setAcceptingInvitation(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    try {
      await createCompany.mutateAsync({ name: name.trim(), slug: slug.trim() });
      navigate('/app');
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  if (authLoading || profileLoading || checkingInvitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show invitations + option to create company
  const hasInvitations = pendingInvitations.length > 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center mb-2">
          {platform.platform_logo_url ? (
            <img src={platform.platform_logo_url} alt={platform.platform_name} className="h-10 mx-auto mb-3 object-contain" />
          ) : null}
          <h1 className="text-3xl font-bold text-primary">{platform.platform_name}</h1>
          <p className="text-muted-foreground mt-2">
            {hasInvitations ? 'Welcome! You have pending invitations' : 'Set up your company'}
          </p>
          {user?.email && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <Mail className="h-3 w-3" />
              Signed in as {user.email}
            </p>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate('/auth/login');
            }}
          >
            <LogOut className="h-3 w-3 mr-1" />
            Sign out &amp; use a different account
          </Button>
        </div>

        {/* Pending Invitations */}
        {hasInvitations && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Pending Invitations ({pendingInvitations.length})
            </h2>
            {pendingInvitations.map((invitation) => (
              <Card key={invitation.id} className="border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{invitation.company_name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Shield className="h-3 w-3 text-muted-foreground" />
                          <Badge variant="secondary" className="text-xs capitalize">
                            {invitation.role}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAcceptInvitation(invitation)}
                      disabled={acceptingInvitation}
                    >
                      {acceptingInvitation && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
                      Accept
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Divider when both sections shown */}
        {hasInvitations && !showCreateForm && (
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>
        )}

        {/* Create Company Section */}
        {hasInvitations && !showCreateForm ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowCreateForm(true)}
          >
            <Building2 className="mr-2 h-4 w-4" />
            Create My Own Company Instead
          </Button>
        ) : (
          <Card>
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-2xl font-bold">Create Your Company</CardTitle>
              </div>
              <CardDescription>
                Set up your publishing company to start managing your social media presence
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Company Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Acme Publishing"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">{platform.platform_domain || 'social.longtale.ai'}/</span>
                    <Input
                      id="slug"
                      type="text"
                      placeholder="acme-publishing"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This will be your unique identifier. Use lowercase letters, numbers, and hyphens only.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createCompany.isPending || !name.trim() || !slug.trim()}
                >
                  {createCompany.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Company
                </Button>
                {hasInvitations && showCreateForm && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setShowCreateForm(false)}
                  >
                    ← Back to invitations
                  </Button>
                )}
              </CardFooter>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
