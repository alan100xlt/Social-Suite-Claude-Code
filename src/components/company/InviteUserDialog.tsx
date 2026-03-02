import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useProfile } from '@/hooks/useProfile';

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName: string;
}

export function InviteUserDialog({ open, onOpenChange, companyId, companyName }: InviteUserDialogProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  const handleInvite = async () => {
    if (!email.trim() || !user?.id) return;

    setIsLoading(true);

    try {
      // Create invitation in the database
      const { data: invitation, error } = await supabase
        .from('company_invitations')
        .insert({
          company_id: companyId,
          email: email.trim().toLowerCase(),
          role,
          invited_by: user.id,
        })
        .select('token')
        .single();

      if (error) throw error;

      const appOrigin = window.location.origin;
      const inviteeEmail = encodeURIComponent(email.trim().toLowerCase());
      const signupUrl = `${appOrigin}/auth/signup?invite=${invitation.token}&email=${inviteeEmail}`;
      const inviterName = profile?.full_name || user.email || 'A team member';
      
      try {
        await supabase.functions.invoke('send-invite-email', {
          body: {
            email: email.trim().toLowerCase(),
            companyName,
            companyId,
            inviterName,
            role,
            signupUrl,
          },
        });
      } catch (emailError) {
        // Log but don't fail the invitation if email fails
        console.error('Failed to send invite email:', emailError);
      }

      // Invalidate pending invitations query
      queryClient.invalidateQueries({ queryKey: ['pending-invitations'] });

      toast({
        title: 'Invitation Sent',
        description: `An invitation has been sent to ${email}.`,
      });

      setEmail('');
      setRole('member');
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Invitation Failed',
        description: error instanceof Error ? error.message : 'Failed to create invitation',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to add someone to your company
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as 'admin' | 'member')}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Admins can invite users and manage RSS feeds. Members can create and schedule posts.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={isLoading || !email.trim()}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
