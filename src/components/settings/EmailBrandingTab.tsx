import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Mail, Palette, Save, Eye, ShieldAlert, Send } from 'lucide-react';
import { VoiceDefaultsSection } from '@/components/settings/VoiceDefaultsSection';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

interface EmailSettings {
  id?: string;
  sender_name: string;
  from_email: string;
  reply_to_email: string | null;
  logo_url: string | null;
  accent_color: string;
  accent_color_end: string;
  header_text_color: string;
  body_background_color: string;
  body_text_color: string;
  footer_text: string | null;
}

const defaults: Omit<EmailSettings, 'id'> = {
  sender_name: 'GetLate',
  from_email: 'noreply@longtale.ai',
  reply_to_email: null,
  logo_url: null,
  accent_color: '#667eea',
  accent_color_end: '#764ba2',
  header_text_color: '#ffffff',
  body_background_color: '#ffffff',
  body_text_color: '#333333',
  footer_text: null,
};

function EmailPreviewShell({ form, headerEmoji, headerTitle, children }: {
  form: Omit<EmailSettings, 'id'>;
  headerEmoji: string;
  headerTitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded-lg overflow-hidden max-w-lg mx-auto">
      <div
        style={{
          background: `linear-gradient(135deg, ${form.accent_color} 0%, ${form.accent_color_end} 100%)`,
          padding: '24px',
          textAlign: 'center',
        }}
      >
        {form.logo_url && (
          <img src={form.logo_url} alt="Logo" style={{ maxHeight: 40, margin: '0 auto 12px' }} />
        )}
        <h1 style={{ color: form.header_text_color, margin: 0, fontSize: '20px', fontWeight: 600 }}>
          {headerTitle} {headerEmoji}
        </h1>
      </div>
      <div
        style={{
          background: form.body_background_color,
          padding: '24px',
          color: form.body_text_color,
          fontSize: '14px',
          lineHeight: 1.6,
        }}
      >
        {children}
        {form.footer_text && (
          <>
            <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '20px 0' }} />
            <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>{form.footer_text}</p>
          </>
        )}
      </div>
    </div>
  );
}

function EmailPreviewCTA({ form, label }: { form: Omit<EmailSettings, 'id'>; label: string }) {
  return (
    <div style={{ textAlign: 'center', margin: '24px 0' }}>
      <span
        style={{
          background: `linear-gradient(135deg, ${form.accent_color} 0%, ${form.accent_color_end} 100%)`,
          color: form.header_text_color,
          padding: '12px 28px',
          borderRadius: '8px',
          fontWeight: 600,
          display: 'inline-block',
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function EmailBrandingTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showPreview, setShowPreview] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [activePreviewTab, setActivePreviewTab] = useState('generic');

  const [form, setForm] = useState<Omit<EmailSettings, 'id'>>({ ...defaults });

  const { data: settings, isLoading, isError } = useQuery({
    queryKey: ['global-email-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_email_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as (EmailSettings & { id: string }) | null;
    },
  });

  useEffect(() => {
    if (settings) {
      setForm({
        sender_name: settings.sender_name,
        from_email: settings.from_email,
        reply_to_email: settings.reply_to_email,
        logo_url: settings.logo_url,
        accent_color: settings.accent_color,
        accent_color_end: settings.accent_color_end,
        header_text_color: settings.header_text_color,
        body_background_color: settings.body_background_color,
        body_text_color: settings.body_text_color,
        footer_text: settings.footer_text,
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (settings?.id) {
        const { error } = await supabase
          .from('global_email_settings')
          .update(form)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('global_email_settings')
          .insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-email-settings'] });
      toast({ title: 'Saved', description: 'Email branding settings have been saved for all companies.' });
    },
    onError: (err) => {
      toast({ title: 'Save Failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    },
  });

  const sendTestMutation = useMutation({
    mutationFn: async (template: string) => {
      if (!testEmail) throw new Error('Please enter an email address');
      const { data, error } = await supabase.functions.invoke('send-test-email', {
        body: { recipientEmail: testEmail, template, branding: form },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Test email sent', description: `Sent to ${testEmail}` });
    },
    onError: (err) => {
      toast({ title: 'Failed to send', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    },
  });

  const update = (key: keyof typeof form, value: string | null) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <ShieldAlert className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-sm font-medium">Access denied</p>
          <p className="text-xs text-muted-foreground">You don't have permission to manage email branding.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <ShieldAlert className="h-5 w-5 text-primary shrink-0" />
        <p className="text-sm text-muted-foreground">
          These settings apply <strong>globally</strong> to all companies and accounts. Only superadmins can modify email branding.
        </p>
      </div>

      {/* Sender Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle>Sender Settings</CardTitle>
          </div>
          <CardDescription>
            Configure the sender name and email address for all outgoing emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sender_name">Sender Name</Label>
              <Input
                id="sender_name"
                value={form.sender_name}
                onChange={(e) => update('sender_name', e.target.value)}
                placeholder="e.g. GetLate"
              />
              <p className="text-xs text-muted-foreground">
                Displayed as the "from" name in recipient inboxes
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="from_email">From Email</Label>
              <Input
                id="from_email"
                type="email"
                value={form.from_email}
                onChange={(e) => update('from_email', e.target.value)}
                placeholder="noreply@longtale.ai"
              />
              <p className="text-xs text-muted-foreground">
                Must be a verified domain
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reply_to_email">Reply-To Email (optional)</Label>
            <Input
              id="reply_to_email"
              type="email"
              value={form.reply_to_email || ''}
              onChange={(e) => update('reply_to_email', e.target.value || null)}
              placeholder="support@yourcompany.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Branding & Colors */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <CardTitle>Branding & Colors</CardTitle>
          </div>
          <CardDescription>
            Customize the look and feel of all system emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="logo_url">Logo URL (optional)</Label>
            <Input
              id="logo_url"
              value={form.logo_url || ''}
              onChange={(e) => update('logo_url', e.target.value || null)}
              placeholder="https://example.com/logo.png"
            />
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="accent_color">Gradient Start</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="accent_color"
                  value={form.accent_color}
                  onChange={(e) => update('accent_color', e.target.value)}
                  className="h-9 w-12 rounded border cursor-pointer"
                />
                <Input
                  value={form.accent_color}
                  onChange={(e) => update('accent_color', e.target.value)}
                  className="flex-1 font-mono text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accent_color_end">Gradient End</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="accent_color_end"
                  value={form.accent_color_end}
                  onChange={(e) => update('accent_color_end', e.target.value)}
                  className="h-9 w-12 rounded border cursor-pointer"
                />
                <Input
                  value={form.accent_color_end}
                  onChange={(e) => update('accent_color_end', e.target.value)}
                  className="flex-1 font-mono text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="header_text_color">Header Text</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="header_text_color"
                  value={form.header_text_color}
                  onChange={(e) => update('header_text_color', e.target.value)}
                  className="h-9 w-12 rounded border cursor-pointer"
                />
                <Input
                  value={form.header_text_color}
                  onChange={(e) => update('header_text_color', e.target.value)}
                  className="flex-1 font-mono text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="body_background_color">Body Background</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="body_background_color"
                  value={form.body_background_color}
                  onChange={(e) => update('body_background_color', e.target.value)}
                  className="h-9 w-12 rounded border cursor-pointer"
                />
                <Input
                  value={form.body_background_color}
                  onChange={(e) => update('body_background_color', e.target.value)}
                  className="flex-1 font-mono text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="body_text_color">Body Text</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="body_text_color"
                  value={form.body_text_color}
                  onChange={(e) => update('body_text_color', e.target.value)}
                  className="h-9 w-12 rounded border cursor-pointer"
                />
                <Input
                  value={form.body_text_color}
                  onChange={(e) => update('body_text_color', e.target.value)}
                  className="flex-1 font-mono text-sm"
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="footer_text">Footer Text (optional)</Label>
            <Textarea
              id="footer_text"
              value={form.footer_text || ''}
              onChange={(e) => update('footer_text', e.target.value || null)}
              placeholder="e.g. © 2025 Your Company. All rights reserved."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              <CardTitle>Email Preview</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
              {showPreview ? 'Hide' : 'Show'} Preview
            </Button>
          </div>
        </CardHeader>
        {showPreview && (
          <CardContent>
            <Tabs value={activePreviewTab} onValueChange={setActivePreviewTab} className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="generic">Generic</TabsTrigger>
                <TabsTrigger value="approval">Post Approval</TabsTrigger>
                <TabsTrigger value="invitation">Team Invitation</TabsTrigger>
              </TabsList>

              {/* Send test email controls */}
              <div className="flex items-center gap-2 mb-4 p-3 rounded-lg border bg-muted/50">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  type="email"
                  placeholder="recipient@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={() => sendTestMutation.mutate(activePreviewTab)}
                  disabled={sendTestMutation.isPending || !testEmail}
                >
                  {sendTestMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-1" />
                  )}
                  Send Test
                </Button>
              </div>

              <TabsContent value="generic">
                <EmailPreviewShell form={form} headerEmoji="🎉" headerTitle="Sample Email Header">
                  <p>Hi there,</p>
                  <p>
                    This is a preview of how your emails will look with the current branding
                    settings. The gradient header, text colors, and footer text will all match
                    your configuration.
                  </p>
                  <EmailPreviewCTA form={form} label="Call to Action" />
                </EmailPreviewShell>
              </TabsContent>

              <TabsContent value="approval">
                <EmailPreviewShell form={form} headerEmoji="📋" headerTitle="Post Approval Request">
                  <p>
                    <strong>Alan Smith</strong> has requested your approval for the following social media posts.
                  </p>
                  <p style={{ fontSize: '13px', color: '#6b7280' }}>
                    Article: <strong>How AI is Transforming Content Marketing in 2026</strong>
                  </p>
                  <div style={{ marginBottom: '16px', padding: '14px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fafafa' }}>
                    <h3 style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: 600, textTransform: 'capitalize' as const, color: '#374151' }}>linkedin</h3>
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap' as const, fontSize: '13px', color: '#1f2937', lineHeight: 1.5 }}>
                      🚀 AI isn't replacing marketers — it's supercharging them. Our latest deep dive explores how leading brands are using generative AI to scale content without sacrificing quality.{'\n\n'}Read the full breakdown 👇{'\n'}#ContentMarketing #AI #MarketingStrategy
                    </p>
                  </div>
                  <div style={{ marginBottom: '16px', padding: '14px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fafafa' }}>
                    <h3 style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: 600, textTransform: 'capitalize' as const, color: '#374151' }}>instagram</h3>
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap' as const, fontSize: '13px', color: '#1f2937', lineHeight: 1.5 }}>
                      AI + Content = 🔥{'\n\n'}We broke down how the top brands are using AI to create better content, faster. Spoiler: it's not about replacing humans.{'\n\n'}Link in bio for the full article ✨
                    </p>
                  </div>
                  <EmailPreviewCTA form={form} label="Review & Approve" />
                  <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center' as const }}>This link expires in 7 days.</p>
                </EmailPreviewShell>
              </TabsContent>

              <TabsContent value="invitation">
                <EmailPreviewShell form={form} headerEmoji="🎉" headerTitle="You're Invited!">
                  <p>
                    <strong>Sarah Johnson</strong> has invited you to join <strong>Acme Corp</strong> on GetLate
                    as a <strong>member</strong>.
                  </p>
                  <p>
                    GetLate helps teams manage and automate their social media presence. Click below to accept the invitation and get started.
                  </p>
                  <EmailPreviewCTA form={form} label="Accept Invitation" />
                  <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center' as const }}>This invitation expires in 7 days.</p>
                </EmailPreviewShell>
              </TabsContent>
            </Tabs>
          </CardContent>
        )}
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Email Settings
        </Button>
      </div>

      {/* Voice Defaults Section */}
      <Separator className="my-8" />
      <VoiceDefaultsSection />
    </div>
  );
}
