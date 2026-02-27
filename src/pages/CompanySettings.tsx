import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useCompany, useCompanyMembers, useUserRole, useUpdateCompany } from '@/hooks/useCompany';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2, Users, Crown, Shield, User, Loader2, Plus, Link2, Check, X, Pencil, Key } from 'lucide-react';
import { InviteUserDialog } from '@/components/company/InviteUserDialog';
import { PendingInvitationsList } from '@/components/company/PendingInvitationsList';
import { SetUserPasswordDialog } from '@/components/company/SetUserPasswordDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';

export default function CompanySettings() {
  const { data: company, isLoading: companyLoading } = useCompany();
  const { data: members, isLoading: membersLoading } = useCompanyMembers();
  const { data: userRole } = useUserRole();
  const { data: profile } = useProfile();
  const { user, isSuperAdmin } = useAuth();
  const updateCompany = useUpdateCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [companyName, setCompanyName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  
  // Set password dialog state
  const [setPasswordDialogOpen, setSetPasswordDialogOpen] = useState(false);
  const [selectedMemberForPassword, setSelectedMemberForPassword] = useState<{ email: string; name?: string } | null>(null);
  
  // GetLate Profile linking
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileIdInput, setProfileIdInput] = useState('');
  const [availableProfiles, setAvailableProfiles] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  
  // GetLate Profile name editing
  const [isEditingProfileName, setIsEditingProfileName] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState('');
  const [savingProfileName, setSavingProfileName] = useState(false);
  const [currentProfileName, setCurrentProfileName] = useState<string | null>(null);
  const [loadingProfileName, setLoadingProfileName] = useState(false);

  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';

  // Fetch available GetLate profiles
  useEffect(() => {
    const fetchProfiles = async () => {
      if (!isEditingProfile) return;
      
      setLoadingProfiles(true);
      try {
        const { data, error } = await supabase.functions.invoke('getlate-connect', {
          body: { action: 'get-profiles' },
        });
        
        if (!error && data?.profiles) {
          setAvailableProfiles(data.profiles.map((p: { _id?: string; id?: string; name: string }) => ({
            id: p._id || p.id,
            name: p.name,
          })));
        }
      } catch (err) {
        console.error('Failed to fetch profiles:', err);
      } finally {
        setLoadingProfiles(false);
      }
    };

    fetchProfiles();
  }, [isEditingProfile]);

  // Fetch current GetLate profile name when profile is linked
  useEffect(() => {
    const fetchProfileName = async () => {
      if (!company?.getlate_profile_id) {
        setCurrentProfileName(null);
        return;
      }
      
      setLoadingProfileName(true);
      try {
        const { data, error } = await supabase.functions.invoke('getlate-connect', {
          body: { action: 'get-profiles' },
        });
        
        if (!error && data?.profiles) {
          const profile = data.profiles.find((p: { _id?: string; id?: string; name: string }) => 
            (p._id || p.id) === company.getlate_profile_id
          );
          if (profile) {
            setCurrentProfileName(profile.name);
          }
        }
      } catch (err) {
        console.error('Failed to fetch profile name:', err);
      } finally {
        setLoadingProfileName(false);
      }
    };

    fetchProfileName();
  }, [company?.getlate_profile_id]);

  const handleSaveCompany = async () => {
    if (!company?.id || !companyName.trim()) return;

    await updateCompany.mutateAsync({
      id: company.id,
      name: companyName.trim(),
    });
    setIsEditing(false);
  };

  const handleSaveProfileName = async () => {
    if (!company?.getlate_profile_id || !profileNameInput.trim()) return;

    setSavingProfileName(true);
    try {
      const { data, error } = await supabase.functions.invoke('getlate-connect', {
        body: {
          action: 'update-profile',
          profileId: company.getlate_profile_id,
          name: profileNameInput.trim(),
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to update profile');

      setCurrentProfileName(profileNameInput.trim());
      queryClient.invalidateQueries({ queryKey: ['getlate-accounts'] });
      
      toast({
        title: 'Profile Updated',
        description: 'GetLate profile name has been updated.',
      });
      setIsEditingProfileName(false);
    } catch (err) {
      toast({
        title: 'Update Failed',
        description: err instanceof Error ? err.message : 'Failed to update profile name',
        variant: 'destructive',
      });
    } finally {
      setSavingProfileName(false);
    }
  };

  const handleSaveProfileId = async () => {
    if (!company?.id || !profileIdInput.trim()) return;

    try {
      const { error } = await supabase
        .from('companies')
        .update({ getlate_profile_id: profileIdInput.trim() })
        .eq('id', company.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['company'] });
      queryClient.invalidateQueries({ queryKey: ['getlate-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['getlate-posts'] });
      
      toast({
        title: 'Profile Linked',
        description: 'GetLate profile has been linked to this company.',
      });
      setIsEditingProfile(false);
    } catch (err) {
      toast({
        title: 'Failed to Link',
        description: err instanceof Error ? err.message : 'Failed to link profile',
        variant: 'destructive',
      });
    }
  };

  const handleSelectProfile = (profileId: string) => {
    setProfileIdInput(profileId);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-warning" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-primary" />;
      default:
        return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (companyLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!company) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Company Found</h2>
          <p className="text-muted-foreground mb-4">
            You're not associated with any company yet.
          </p>
          <Button onClick={() => window.location.href = '/setup-company'}>
            Create a Company
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Company Settings</h1>
            <p className="text-muted-foreground">Manage your company and team</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Company Info Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle>Company Information</CardTitle>
              </div>
              <CardDescription>
                Basic information about your company
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                {isEditing ? (
                  <div className="flex gap-2">
                    <Input
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Company name"
                    />
                    <Button
                      onClick={handleSaveCompany}
                      disabled={updateCompany.isPending}
                      size="icon"
                    >
                      {updateCompany.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setIsEditing(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-medium">{company.name}</span>
                    {isOwnerOrAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCompanyName(company.name);
                          setIsEditing(true);
                        }}
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>URL Slug</Label>
                <p className="text-sm text-muted-foreground">
                  getlate.dev/<span className="font-mono">{company.slug}</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* GetLate Integration Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-primary" />
                <CardTitle>GetLate Integration</CardTitle>
              </div>
              <CardDescription>
                Link this company to a GetLate profile for social media management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>GetLate Profile ID</Label>
                {isEditingProfile ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        value={profileIdInput}
                        onChange={(e) => setProfileIdInput(e.target.value)}
                        placeholder="Enter profile ID or select below"
                      />
                      <Button
                        onClick={handleSaveProfileId}
                        disabled={!profileIdInput.trim()}
                        size="icon"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setIsEditingProfile(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {loadingProfiles ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading available profiles...
                      </div>
                    ) : availableProfiles.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Available profiles:</p>
                        <div className="flex flex-wrap gap-2">
                          {availableProfiles.map((profile) => (
                            <Button
                              key={profile.id}
                              variant={profileIdInput === profile.id ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => handleSelectProfile(profile.id)}
                            >
                              {profile.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    {company.getlate_profile_id ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono">
                          {company.getlate_profile_id}
                        </Badge>
                        <Badge variant="default" className="bg-success text-success-foreground">
                          Linked
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Not linked</span>
                    )}
                    {isOwnerOrAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setProfileIdInput(company.getlate_profile_id || '');
                          setIsEditingProfile(true);
                        }}
                      >
                        {company.getlate_profile_id ? 'Change' : 'Link Profile'}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {company.getlate_profile_id && (
                <>
                  <Separator />
                  
                  {/* GetLate Profile Name Editor */}
                  <div className="space-y-2">
                    <Label>Profile Name (on GetLate)</Label>
                    {isEditingProfileName ? (
                      <div className="flex gap-2">
                        <Input
                          value={profileNameInput}
                          onChange={(e) => setProfileNameInput(e.target.value)}
                          placeholder="Enter profile name"
                        />
                        <Button
                          onClick={handleSaveProfileName}
                          disabled={savingProfileName || !profileNameInput.trim()}
                          size="icon"
                        >
                          {savingProfileName ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setIsEditingProfileName(false)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        {loadingProfileName ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading...
                          </div>
                        ) : (
                          <span className="text-sm font-medium">
                            {currentProfileName || 'Unknown'}
                          </span>
                        )}
                        {isOwnerOrAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setProfileNameInput(currentProfileName || '');
                              setIsEditingProfileName(true);
                            }}
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      This is the name displayed for your profile on GetLate's platform.
                    </p>
                  </div>
                  
                  <Separator />
                  <p className="text-xs text-muted-foreground">
                    Social accounts connected to this profile will be available for this company's posts and analytics.
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Team Members Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <CardTitle>Team Members</CardTitle>
                </div>
                {isOwnerOrAdmin && (
                  <Button size="sm" onClick={() => setInviteDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Invite
                  </Button>
                )}
              </div>
              <CardDescription>
                People who have access to this company
              </CardDescription>
            </CardHeader>
            <CardContent>
              {membersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : members && members.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback>
                            {member.full_name?.charAt(0) || member.email?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {member.full_name || 'Unnamed User'}
                          </p>
                          <p className="text-sm text-muted-foreground truncate max-w-[150px]">
                            {member.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isSuperAdmin && member.email && member.id !== user?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setSelectedMemberForPassword({
                                email: member.email!,
                                name: member.full_name || undefined,
                              });
                              setSetPasswordDialogOpen(true);
                            }}
                            title="Set password for user"
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                        )}
                        <Badge variant={getRoleBadgeVariant(member.role)}>
                          <span className="flex items-center gap-1">
                            {getRoleIcon(member.role)}
                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          </span>
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No team members yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pending Invitations */}
      {isOwnerOrAdmin && company && (
        <PendingInvitationsList 
          companyId={company.id} 
          companyName={company.name}
          inviterName={profile?.full_name || user?.email || 'Your team'}
        />
      )}

      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        companyId={company.id}
        companyName={company.name}
      />

      {selectedMemberForPassword && (
        <SetUserPasswordDialog
          open={setPasswordDialogOpen}
          onOpenChange={setSetPasswordDialogOpen}
          userEmail={selectedMemberForPassword.email}
          userName={selectedMemberForPassword.name}
        />
      )}
    </DashboardLayout>
  );
}
