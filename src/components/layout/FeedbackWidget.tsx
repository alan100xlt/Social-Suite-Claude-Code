import { useState } from 'react';
import { MessageSquarePlus, X, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCompany } from '@/hooks/useCompany';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type FeedbackType = 'feature' | 'bug' | 'general';
type Priority = 'no_priority' | 'urgent' | 'high' | 'medium' | 'low';

const FEEDBACK_TYPES: { value: FeedbackType; label: string; emoji: string }[] = [
  { value: 'feature', label: 'Feature request', emoji: '✨' },
  { value: 'bug', label: 'Bug report', emoji: '🐛' },
  { value: 'general', label: 'General feedback', emoji: '💬' },
];

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'no_priority', label: 'No priority', color: 'text-muted-foreground' },
  { value: 'urgent', label: 'Urgent', color: 'text-destructive' },
  { value: 'high', label: 'High', color: 'text-orange-500' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-500' },
  { value: 'low', label: 'Low', color: 'text-muted-foreground' },
];

const PRIORITY_MAP: Record<Priority, number> = {
  no_priority: 0,
  urgent: 1,
  high: 2,
  medium: 3,
  low: 4,
};

interface BrandingData {
  [key: string]: unknown;
}

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('feature');
  const [priority, setPriority] = useState<Priority>('no_priority');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: company } = useCompany();
  const { data: profile } = useProfile();
  const { user } = useAuth();
  const { toast } = useToast();

  const branding = (company?.branding as BrandingData) || {};
  const companyWebsite = company?.website_url || '';
  const companyDomain = companyWebsite
    ? (() => { try { return new URL(companyWebsite).hostname.replace('www.', ''); } catch { return ''; } })()
    : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || loading) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

      const res = await fetch(`${SUPABASE_URL}/functions/v1/linear-feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          feedbackText: text.trim(),
          feedbackTitle: title.trim() || undefined,
          feedbackType,
          priority: PRIORITY_MAP[priority],
          companyName: company?.name || '',
          companyDomain,
          companyWebsite,
          companySize: (branding as Record<string, unknown>)?.size as string | undefined,
          userName: profile?.full_name || '',
          userEmail: profile?.email || user?.email || '',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      setSubmitted(true);
      setText('');
      setTitle('');
      setPriority('no_priority');
    } catch (err) {
      toast({
        title: 'Could not send feedback',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => setSubmitted(false), 300);
  };

  const handleOpen = () => {
    setOpen(true);
    setSubmitted(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
      {/* Popover panel */}
      <div
        className={cn(
          'w-84 rounded-2xl border border-border bg-card shadow-2xl transition-all duration-200 origin-bottom-right',
          open ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 translate-y-2 pointer-events-none'
        )}
        style={{ width: '340px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <p className="text-sm font-semibold text-foreground">Share feedback</p>
            <p className="text-xs text-muted-foreground">Help us improve the platform</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="p-4">
          {submitted ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="h-10 w-10 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Thanks for the feedback!</p>
                <p className="text-xs text-muted-foreground mt-0.5">We review every submission.</p>
              </div>
              <Button size="sm" variant="outline" className="mt-1" onClick={() => setSubmitted(false)}>
                Send more
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Type selector */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Type</Label>
                <div className="flex gap-1.5 flex-wrap">
                  {FEEDBACK_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setFeedbackType(t.value)}
                      className={cn(
                        'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors',
                        feedbackType === t.value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                      )}
                    >
                      <span>{t.emoji}</span>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority selector */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Priority</Label>
                <div className="flex gap-1.5 flex-wrap">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPriority(p.value)}
                      className={cn(
                        'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors',
                        priority === p.value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : `bg-background border-border hover:border-primary/50 ${p.color}`
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional title */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Title <span className="text-muted-foreground/60">(optional)</span></Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Short summary..."
                  className="text-sm h-8"
                  maxLength={120}
                />
              </div>

              {/* Description */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Description</Label>
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={
                    feedbackType === 'feature'
                      ? 'Describe the feature you would like to see...'
                      : feedbackType === 'bug'
                      ? 'What went wrong? Steps to reproduce...'
                      : 'Share your thoughts...'
                  }
                  className="resize-none text-sm min-h-[90px]"
                  autoFocus
                />
              </div>

              {/* Company context hint */}
              {company?.name && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono">{company.name}</span>
                  will be attached to this request
                </p>
              )}

              <Button
                type="submit"
                size="sm"
                className="w-full"
                disabled={!text.trim() || loading}
              >
                {loading ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Sending…</>
                ) : (
                  <><Send className="h-3.5 w-3.5 mr-1.5" />Send feedback</>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* FAB trigger */}
      <button
        onClick={open ? handleClose : handleOpen}
        className={cn(
          'flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-lg transition-all duration-200 pointer-events-auto',
          'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95',
          open && 'bg-primary/80'
        )}
      >
        {open ? (
          <X className="h-4 w-4" />
        ) : (
          <>
            <MessageSquarePlus className="h-4 w-4" />
            Feedback
          </>
        )}
      </button>
    </div>
  );
}
