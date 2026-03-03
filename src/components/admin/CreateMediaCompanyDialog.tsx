import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useCreateMediaCompany } from '@/hooks/useMediaCompanyManagement';
import { useAuth } from '@/contexts/AuthContext';

interface CreateMediaCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateMediaCompanyDialog({ open, onOpenChange }: CreateMediaCompanyDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const createMutation = useCreateMediaCompany();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await createMutation.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      logo_url: logoUrl.trim() || undefined,
      website_url: websiteUrl.trim() || undefined,
      contact_email: contactEmail.trim() || undefined,
      firstAdminUserId: user?.id,
    });

    setName('');
    setDescription('');
    setLogoUrl('');
    setWebsiteUrl('');
    setContactEmail('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Media Company</DialogTitle>
          <DialogDescription>
            A media company groups multiple companies under one portfolio.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mc-name">Name *</Label>
            <Input
              id="mc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Media company name"
              required
              minLength={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mc-description">Description</Label>
            <Textarea
              id="mc-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mc-logo">Logo URL</Label>
            <Input
              id="mc-logo"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mc-website">Website</Label>
            <Input
              id="mc-website"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mc-email">Contact Email</Label>
            <Input
              id="mc-email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="contact@example.com"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || !name.trim()}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
