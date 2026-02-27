import { useState, useEffect } from 'react';
import { useCompany, useCompanyMembers, useUserRole, useUpdateCompany } from '@/hooks/useCompany';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Users, Crown, Shield, User, Loader2, Plus, Check, X, Key, LogIn, Palette, Globe, MapPin } from 'lucide-react';
import { InviteUserDialog } from '@/components/company/InviteUserDialog';
import { PendingInvitationsList } from '@/components/company/PendingInvitationsList';
import { SetUserPasswordDialog } from '@/components/company/SetUserPasswordDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';

interface BrandingData {
  logo?: string;
  colors?: string[];
  description?: string;
  tagline?: string;
  location?: string;
  [key: string]: unknown;
}

export function CompanyTab() {
  const { data: company, isLoading: companyLoading } = useCompany();
  const { data: members, isLoading: membersLoading } = useCompanyMembers();
  const { data: userRole } = useUserRole();
  const { data: profile } = useProfile();
  const { user, isSuperAdmin, impersonateUser } = useAuth();
  const updateCompany = useUpdateCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [companyName, setCompanyName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [setPasswordDialogOpen, setSetPasswordDialogOpen] = useState(false);
  const [selectedMemberForPassword, setSelectedMemberForPassword] = useState<{ email: string; name?: string } | null>(null);

  // Branding edit state
  const [isEditingBranding, setIsEditingBranding] = useState(false);
  const [brandingForm, setBrandingForm] = useState<BrandingData>({});
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [savingBranding, setSavingBranding] = useState(false);

  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';

  const branding = (company?.branding as BrandingData) || {};

  useEffect(() => {
    if (company) {
      setBrandingForm({
        logo: branding.logo || '',
        colors: branding.colors || [],
        description: branding.description || '',
        tagline: branding.tagline || '',
        location: branding.location || '',
      });
      setWebsiteUrl(company.website_url || '');
    }
  }, [company]);

  const handleSaveCompany = async () => {
    if (!company?.id || !companyName.trim()) return;
    await updateCompany.mutateAsync({ id: company.id, name: companyName.trim() });
    setIsEditing(false);
  };

  const handleSaveBranding = async () => {
    if (!company?.id) return;
    setSavingBranding(true);
    try {
      const updatedBranding = { ...branding, ...brandingForm };
      const { error } = await supabase
        .from('companies')
        .update({
          branding: updatedBranding as any,
          website_url: websiteUrl.trim() || null,
        })
        .eq('id', company.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['company'] });
      toast({ title: 'Branding Updated', description: 'Your brand identity has been saved.' });
      setIsEditingBranding(false);
    } catch (err) {
      toast({ title: 'Update Failed', description: err instanceof Error ? err.message : 'Failed to save branding', variant: 'destructive' });
    } finally {
      setSavingBranding(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="h-4 w-4 text-warning" />;
      case 'admin': return <Shield className="h-4 w-4 text-primary" />;
      default: return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) { case 'owner': return 'default' as const; case 'admin': return 'secondary' as const; default: return 'outline' as const; }
  };

  if (companyLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!company) {
    return (
      <div className="text-center py-12">
        <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Company Found</h2>
        <p className="text-muted-foreground mb-4">You're not associated with any company yet.</p>
        <Button onClick={() => window.location.href = '/app/onboarding/setup'}>Create a Company</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Company Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /><CardTitle>Company Information</CardTitle></div>
            <CardDescription>Basic information about your company</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              {isEditing ? (
                <div className="flex gap-2">
                  <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company name" />
                  <Button onClick={handleSaveCompany} disabled={updateCompany.isPending} size="icon">
                    {updateCompany.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setIsEditing(false)}><X className="h-4 w-4" /></Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium">{company.name}</span>
                  {isOwnerOrAdmin && <Button variant="outline" size="sm" onClick={() => { setCompanyName(company.name); setIsEditing(true); }}>Edit</Button>}
                </div>
              )}
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>URL Slug</Label>
              <p className="text-sm text-muted-foreground">longtale.ai/<span className="font-mono">{company.slug}</span></p>
            </div>
          </CardContent>
        </Card>

        {/* Brand Identity Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary" /><CardTitle>Brand Identity</CardTitle></div>
              {isOwnerOrAdmin && !isEditingBranding && (
                <Button variant="outline" size="sm" onClick={() => setIsEditingBranding(true)}>Edit</Button>
              )}
            </div>
            <CardDescription>Your brand data captured during setup</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Logo */}
            {(branding.logo || isEditingBranding) && (
              <div className="space-y-2">
                <Label>Logo</Label>
                {isEditingBranding ? (
                  <Input
                    value={brandingForm.logo || ''}
                    onChange={(e) => setBrandingForm(prev => ({ ...prev, logo: e.target.value }))}
                    placeholder="https://example.com/logo.png"
                  />
                ) : branding.logo ? (
                  <div className="flex items-center">
                    <img
                      src={branding.logo}
                      alt="Company logo"
                      className="h-12 max-w-[200px] object-contain rounded border border-border bg-background p-1"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                ) : null}
              </div>
            )}

            {/* Brand Colors */}
            {((branding.colors && branding.colors.length > 0) || isEditingBranding) && (
              <div className="space-y-2">
                <Label>Brand Colors</Label>
                {isEditingBranding ? (
                  <Input
                    value={(brandingForm.colors || []).join(', ')}
                    onChange={(e) => setBrandingForm(prev => ({
                      ...prev,
                      colors: e.target.value.split(',').map(c => c.trim()).filter(Boolean),
                    }))}
                    placeholder="#667eea, #764ba2"
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(branding.colors || []).map((color, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-md border border-border px-2 py-1">
                        <div className="h-5 w-5 rounded-full border border-border" style={{ backgroundColor: color }} />
                        <span className="text-xs font-mono text-muted-foreground">{color}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Description / Tagline */}
            <div className="space-y-2">
              <Label>Description</Label>
              {isEditingBranding ? (
                <Textarea
                  value={brandingForm.description || ''}
                  onChange={(e) => setBrandingForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="A short description of your brand"
                  rows={3}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{branding.description || 'No description captured'}</p>
              )}
            </div>

            {/* Location */}
            {(branding.location || isEditingBranding) && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />Location</Label>
                {isEditingBranding ? (
                  <Input
                    value={brandingForm.location || ''}
                    onChange={(e) => setBrandingForm(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="City, Country"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">{branding.location}</p>
                )}
              </div>
            )}

            {/* Website URL */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" />Website</Label>
              {isEditingBranding ? (
                <Input
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://example.com"
                />
              ) : (
                company.website_url ? (
                  <a href={company.website_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                    {company.website_url}
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground">No website set</p>
                )
              )}
            </div>

            {/* Save / Cancel buttons for edit mode */}
            {isEditingBranding && (
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSaveBranding} disabled={savingBranding}>
                  {savingBranding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Save Branding
                </Button>
                <Button variant="outline" onClick={() => setIsEditingBranding(false)}>Cancel</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Members Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><CardTitle>Team Members</CardTitle></div>
              {isOwnerOrAdmin && <Button size="sm" onClick={() => setInviteDialogOpen(true)}><Plus className="h-4 w-4 mr-1" />Invite</Button>}
            </div>
            <CardDescription>People who have access to this company</CardDescription>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : members && members.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback>{member.full_name?.charAt(0) || member.email?.charAt(0) || '?'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.full_name || 'Unnamed User'}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-[150px]">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSuperAdmin && member.email && member.id !== user?.id && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={async () => {
                            const { error } = await impersonateUser(member.email!);
                            if (error) {
                              toast({ title: 'Impersonation Failed', description: error.message, variant: 'destructive' });
                            }
                          }} title="Login as this user">
                            <LogIn className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedMemberForPassword({ email: member.email!, name: member.full_name || undefined }); setSetPasswordDialogOpen(true); }} title="Set password for user">
                            <Key className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        <span className="flex items-center gap-1">{getRoleIcon(member.role)}{member.role.charAt(0).toUpperCase() + member.role.slice(1)}</span>
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-center text-muted-foreground py-8">No team members yet</p>}
          </CardContent>
        </Card>
      </div>

      {isOwnerOrAdmin && company && (
        <PendingInvitationsList companyId={company.id} companyName={company.name} inviterName={profile?.full_name || user?.email || 'Your team'} />
      )}

      <InviteUserDialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen} companyId={company.id} companyName={company.name} />

      {selectedMemberForPassword && (
        <SetUserPasswordDialog open={setPasswordDialogOpen} onOpenChange={setSetPasswordDialogOpen} userEmail={selectedMemberForPassword.email} userName={selectedMemberForPassword.name} />
      )}
    </div>
  );
}
