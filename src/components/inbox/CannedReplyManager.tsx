import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, MessageSquare } from 'lucide-react';
import { useInboxCannedReplies, useCreateCannedReply } from '@/hooks/useInboxLabels';
import type { InboxCannedReply } from '@/lib/api/inbox';

interface CannedReplyFormData {
  title: string;
  content: string;
  shortcut: string;
  platform: string;
}

const emptyForm: CannedReplyFormData = { title: '', content: '', shortcut: '', platform: '' };

export function CannedReplyManager() {
  const { data: cannedReplies = [] } = useInboxCannedReplies();
  const createReply = useCreateCannedReply();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CannedReplyFormData>(emptyForm);

  const handleSave = () => {
    if (!form.title.trim() || !form.content.trim()) return;
    createReply.mutate({
      title: form.title,
      content: form.content,
      shortcut: form.shortcut || undefined,
      platform: form.platform || undefined,
    }, {
      onSuccess: () => {
        setForm(emptyForm);
        setFormOpen(false);
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Canned Replies</h3>
          <p className="text-xs text-muted-foreground">Quick responses for common questions. Use / in the composer to insert.</p>
        </div>

        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-7 text-xs gap-1">
              <Plus className="h-3.5 w-3.5" />
              New Reply
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Canned Reply</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <label className="text-xs font-medium">Title</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g., Greeting"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium">Content</label>
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Hi {{contact_name}}, thanks for reaching out!"
                  className="mt-1 min-h-[80px]"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Use {'{{contact_name}}'} for dynamic contact name</p>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-medium">Shortcut</label>
                  <Input
                    value={form.shortcut}
                    onChange={(e) => setForm(f => ({ ...f, shortcut: e.target.value }))}
                    placeholder="greeting"
                    className="mt-1"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium">Platform</label>
                  <Select value={form.platform} onValueChange={(v) => setForm(f => ({ ...f, platform: v === 'all' ? '' : v }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="All platforms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All platforms</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="twitter">Twitter/X</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={!form.title.trim() || !form.content.trim() || createReply.isPending}>
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {cannedReplies.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No canned replies yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {cannedReplies.map((reply: InboxCannedReply) => (
            <div key={reply.id} className="flex items-start gap-3 p-3 rounded-md border bg-background">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{reply.title}</span>
                  {reply.shortcut && (
                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">/{reply.shortcut}</span>
                  )}
                  {reply.platform && (
                    <span className="text-[10px] text-muted-foreground capitalize">{reply.platform}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{reply.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
