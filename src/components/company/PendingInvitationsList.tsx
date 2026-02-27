import { useState } from 'react';
import { usePendingInvitations, useRevokeInvitation } from '@/hooks/usePendingInvitations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mail, Clock, X, UserPlus, Copy, Eye, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PendingInvitationsListProps {
  companyId: string;
  companyName: string;
  inviterName: string;
}

interface EmailPreview {
  email: string;
  role: string;
}

export function PendingInvitationsList({ companyId, companyName, inviterName }: PendingInvitationsListProps) {
  const { data: invitations, isLoading } = usePendingInvitations(companyId);
  const revokeInvitation = useRevokeInvitation();
  const { toast } = useToast();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState<EmailPreview | null>(null);
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);

  const signupUrl = `${window.location.origin}/signup`;

  const getEmailSubject = () => {
    return `You've been invited to join ${companyName} on GetLate`;
  };

  const getEmailBody = (invite: EmailPreview) => {
    return `Hi there,

${inviterName} has invited you to join ${companyName} on GetLate as ${invite.role === 'admin' ? 'an' : 'a'} ${invite.role}.

GetLate is a social media management platform that helps teams schedule, publish, and analyze their content across multiple platforms.

To accept this invitation and set up your account, please visit:
${signupUrl}

Sign up using the email address: ${invite.email}

If you didn't expect this invitation, you can safely ignore this email.

Best regards,
The ${companyName} Team`;
  };

  const copyToClipboard = async (text: string, type: 'subject' | 'body') => {
    await navigator.clipboard.writeText(text);
    if (type === 'subject') {
      setCopiedSubject(true);
      setTimeout(() => setCopiedSubject(false), 2000);
    } else {
      setCopiedBody(true);
      setTimeout(() => setCopiedBody(false), 2000);
    }
    toast({
      title: "Copied!",
      description: `Email ${type} copied to clipboard.`,
    });
  };

  const openPreview = (email: string, role: string) => {
    setSelectedInvite({ email, role });
    setPreviewOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <CardTitle>Pending Invitations</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!invitations || invitations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <CardTitle>Pending Invitations</CardTitle>
          </div>
          <CardDescription>
            Outstanding invitations waiting to be accepted
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-6">
            No pending invitations
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <CardTitle>Pending Invitations</CardTitle>
          </div>
          <CardDescription>
            {invitations.length} invitation{invitations.length !== 1 ? 's' : ''} waiting to be accepted
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{invitation.email}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        Expires {formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openPreview(invitation.email, invitation.role)}
                    title="View email preview"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Revoke Invitation</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to revoke the invitation for{' '}
                          <strong>{invitation.email}</strong>? They will no longer be able to join using this invitation.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => revokeInvitation.mutate(invitation.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {revokeInvitation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          Revoke
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Email Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>
              Copy this email content to send manually to {selectedInvite?.email}
            </DialogDescription>
          </DialogHeader>
          
          {selectedInvite && (
            <div className="space-y-4 mt-4">
              {/* Subject Line */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Subject</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(getEmailSubject(), 'subject')}
                    className="h-8"
                  >
                    {copiedSubject ? (
                      <Check className="h-4 w-4 mr-1 text-primary" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1" />
                    )}
                    Copy
                  </Button>
                </div>
                <div className="p-3 rounded-md border bg-muted/50 text-sm">
                  {getEmailSubject()}
                </div>
              </div>

              {/* Email Body */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Body</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(getEmailBody(selectedInvite), 'body')}
                    className="h-8"
                  >
                    {copiedBody ? (
                      <Check className="h-4 w-4 mr-1 text-primary" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1" />
                    )}
                    Copy
                  </Button>
                </div>
                <div className="p-4 rounded-md border bg-muted/50 text-sm whitespace-pre-wrap font-mono">
                  {getEmailBody(selectedInvite)}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1"
                  onClick={() => {
                    const mailtoLink = `mailto:${selectedInvite.email}?subject=${encodeURIComponent(getEmailSubject())}&body=${encodeURIComponent(getEmailBody(selectedInvite))}`;
                    window.open(mailtoLink, '_blank');
                  }}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Open in Email Client
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
