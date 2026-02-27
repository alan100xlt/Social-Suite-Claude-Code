import { useState, useEffect, useCallback } from 'react';
import { AutomationRule } from '@/hooks/useAutomationRules';
import { Platform } from '@/lib/api/getlate';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Globe, FileText, Send, Target, MousePointerClick, Sparkles, Check, Clock, Plus, RefreshCw } from 'lucide-react';
import { FaInstagram, FaTwitter, FaTiktok, FaLinkedin, FaFacebook, FaYoutube } from 'react-icons/fa';
import { SiBluesky, SiThreads } from 'react-icons/si';

const platformIcons: Partial<Record<Platform, React.ElementType>> = {
  instagram: FaInstagram,
  twitter: FaTwitter,
  facebook: FaFacebook,
  linkedin: FaLinkedin,
  tiktok: FaTiktok,
  youtube: FaYoutube,
  bluesky: SiBluesky,
  threads: SiThreads,
};

export type RuleFormData = Omit<AutomationRule, 'id' | 'company_id' | 'created_at' | 'updated_at'>;

export const defaultForm: RuleFormData = {
  name: '',
  is_active: true,
  feed_id: null,
  objective: 'auto',
  action: 'publish',
  scheduling: 'immediate',
  approval_emails: [],
  account_ids: [],
};

interface Account {
  id: string;
  platform: Platform;
  displayName?: string;
  username: string;
  isDummy?: boolean;
}

interface CompanyMember {
  id: string;
  email: string | null;
  full_name: string | null;
}

interface AutomationRuleWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRule: AutomationRule | null;
  form: RuleFormData;
  setForm: React.Dispatch<React.SetStateAction<RuleFormData>>;
  onSave: () => Promise<void>;
  isSaving: boolean;
  feeds: { id: string; name: string }[] | undefined;
  accounts: Account[];
  hasRealAccounts: boolean;
  currentUserEmail?: string;
  companyMembers?: CompanyMember[];
  lockedFeedId?: string;
}

const objectiveOptions = [
  { value: 'auto', label: 'AI Decides', description: 'Let AI pick the best strategy', icon: Sparkles },
  { value: 'reach', label: 'Reach', description: 'Maximize audience size', icon: Globe },
  { value: 'engagement', label: 'Engagement', description: 'Drive likes, comments & shares', icon: Target },
  { value: 'clicks', label: 'Clicks', description: 'Drive traffic to your site', icon: MousePointerClick },
];

const actionOptions = [
  { value: 'publish_immediate', label: 'Publish immediately', description: 'Post goes live as soon as it\'s generated', icon: Globe },
  { value: 'publish_optimal', label: 'Optimal time', description: 'Schedule for peak engagement (coming soon)', icon: Clock, disabled: true },
  { value: 'send_approval', label: 'Send for approval', description: 'Email reviewers before publishing', icon: Send },
  { value: 'draft', label: 'Save as draft', description: 'Save for manual review later', icon: FileText },
];

function generateName(
  form: RuleFormData,
  feeds: { id: string; name: string }[] | undefined,
  accounts: Account[]
): string {
  const actionLabel: Record<string, string> = { publish: 'Auto-publish', send_approval: 'Approve', draft: 'Draft' };
  const label = actionLabel[form.action] || 'Post';
  const platformNames = accounts
    .filter(a => form.account_ids.includes(a.id))
    .map(a => a.platform)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(', ');
  const feedName = form.feed_id
    ? feeds?.find(f => f.id === form.feed_id)?.name || 'selected feed'
    : 'all feeds';
  return `${label} ${platformNames || 'social'} posts from ${feedName}`;
}

export default function AutomationRuleWizard({
  open,
  onOpenChange,
  editingRule,
  form,
  setForm,
  onSave,
  isSaving,
  feeds,
  accounts,
  hasRealAccounts,
  currentUserEmail,
  companyMembers,
  lockedFeedId,
}: AutomationRuleWizardProps) {
  const [activeSection, setActiveSection] = useState('source');
  const [emailInput, setEmailInput] = useState('');
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const [nameManuallyEdited, setNameManuallyEdited] = useState(false);

  // Auto-generate name when relevant fields change (if not manually edited)
  const autoName = generateName(form, feeds, accounts);
  useEffect(() => {
    if (!nameManuallyEdited && !editingRule) {
      setForm(prev => ({ ...prev, name: autoName }));
    }
  }, [autoName, nameManuallyEdited, editingRule, setForm]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setActiveSection(lockedFeedId ? 'platforms' : 'source');
      setNameManuallyEdited(!!editingRule);
      if (lockedFeedId) {
        setForm(prev => ({ ...prev, feed_id: lockedFeedId }));
      }
    }
  }, [open, editingRule, lockedFeedId, setForm]);

  const ensureCurrentUserEmail = useCallback(() => {
    if (currentUserEmail && !form.approval_emails.includes(currentUserEmail)) {
      setForm(prev => ({ ...prev, approval_emails: [...prev.approval_emails, currentUserEmail] }));
    }
  }, [currentUserEmail, form.approval_emails, setForm]);

  const handleOpenChange = (val: boolean) => {
    onOpenChange(val);
  };

  const actionValue = form.action === 'publish' ? `publish_${form.scheduling}` : form.action;

  const setActionValue = (val: string) => {
    if (val === 'publish_immediate') {
      setForm(prev => ({ ...prev, action: 'publish', scheduling: 'immediate' }));
    } else if (val === 'publish_optimal') {
      setForm(prev => ({ ...prev, action: 'publish', scheduling: 'optimal' }));
    } else if (val === 'send_approval') {
      setForm(prev => ({ ...prev, action: 'send_approval', scheduling: 'immediate' }));
      setTimeout(ensureCurrentUserEmail, 0);
    } else {
      setForm(prev => ({ ...prev, action: val, scheduling: 'immediate' }));
    }
  };

  const toggleAccount = (accountId: string) => {
    setForm(prev => ({
      ...prev,
      account_ids: prev.account_ids.includes(accountId)
        ? prev.account_ids.filter(id => id !== accountId)
        : [...prev.account_ids, accountId],
    }));
  };

  const addEmail = () => {
    const emails = emailInput
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(e => e && e.includes('@') && !form.approval_emails.includes(e));
    if (emails.length > 0) {
      setForm(prev => ({ ...prev, approval_emails: [...prev.approval_emails, ...emails] }));
      setEmailInput('');
    }
  };

  const addMemberEmail = (email: string) => {
    if (email && !form.approval_emails.includes(email)) {
      setForm(prev => ({ ...prev, approval_emails: [...prev.approval_emails, email] }));
    }
    setMemberDropdownOpen(false);
  };

  const removeEmail = (email: string) => {
    setForm(prev => ({ ...prev, approval_emails: prev.approval_emails.filter(e => e !== email) }));
  };

  // Summaries for collapsed headers
  const sourceSummary = form.feed_id
    ? feeds?.find(f => f.id === form.feed_id)?.name || 'Selected feed'
    : 'All feeds';

  const platformSummary = (() => {
    const names = accounts
      .filter(a => form.account_ids.includes(a.id))
      .map(a => a.platform)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .map(p => p.charAt(0).toUpperCase() + p.slice(1));
    return names.length > 0 ? names.join(', ') : 'No platforms selected';
  })();

  const actionSummary = (() => {
    const labels: Record<string, string> = { publish: 'Auto-publish', send_approval: 'Send for approval', draft: 'Save as draft' };
    return labels[form.action] || form.action;
  })();

  // Validation
  const step1Valid = true; // feed selection is always valid (optional)
  const step2Valid = form.action === 'draft' || form.account_ids.length > 0;
  const step3Valid = (form.action !== 'send_approval' || form.approval_emails.length > 0) && !!form.name.trim();
  const canSave = step1Valid && step2Valid && step3Valid;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden max-h-[85vh] flex flex-col">
        <div className="px-6 pt-6 pb-2">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {editingRule ? 'Edit Rule' : 'Create Automation Rule'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Configure your automation in three steps
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-2">
          <Accordion
            type="single"
            value={activeSection}
            onValueChange={(val) => { if (val) setActiveSection(val); }}
            className="w-full"
          >
            {/* Section 1: Content Source */}
            <AccordionItem
              value="source"
              className={cn(
                'border rounded-lg mb-2 transition-all overflow-hidden',
                activeSection === 'source' ? 'border-primary/30 bg-primary/[0.03] shadow-sm' : 'border-border'
              )}
              style={activeSection === 'source' ? { borderLeftWidth: '3px', borderLeftColor: 'hsl(224 71% 25%)' } : {}}
            >
              <AccordionTrigger className="hover:no-underline px-4 py-3">
                <div className="flex items-center gap-3 text-left">
                  <span className={cn(
                    'flex items-center justify-center h-7 w-7 rounded-md text-xs font-bold shrink-0',
                    activeSection === 'source'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-foreground/70 border border-border'
                  )}>
                    1
                  </span>
                  <div>
                    <span className={cn('font-medium text-sm', activeSection === 'source' ? 'text-foreground' : 'text-foreground/80')}>Content Source</span>
                    {activeSection !== 'source' && (
                      <p className="text-xs text-foreground/50 mt-0.5">{sourceSummary}</p>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 animate-fade-in px-4 pb-3">
                  <div className="space-y-2">
                    <Label className="text-foreground/80 text-xs font-medium uppercase tracking-wide">RSS Feed Filter</Label>
                    <p className="text-xs text-muted-foreground">
                      Limit to articles from a specific feed, or leave as "All feeds"
                    </p>
                    <Select
                      value={form.feed_id || 'all'}
                      onValueChange={(val) => setForm(prev => ({ ...prev, feed_id: val === 'all' ? null : val }))}
                      disabled={!!lockedFeedId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All feeds" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All feeds</SelectItem>
                        {feeds?.map(feed => (
                          <SelectItem key={feed.id} value={feed.id}>{feed.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => setActiveSection('platforms')}>
                      Continue
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Section 2: Platforms & Objective */}
            <AccordionItem
              value="platforms"
              className={cn(
                'border rounded-lg mb-2 transition-all overflow-hidden',
                activeSection === 'platforms' ? 'border-primary/30 bg-primary/[0.03] shadow-sm' : 'border-border'
              )}
              style={activeSection === 'platforms' ? { borderLeftWidth: '3px', borderLeftColor: 'hsl(224 71% 25%)' } : {}}
            >
              <AccordionTrigger className="hover:no-underline px-4 py-3">
                <div className="flex items-center gap-3 text-left">
                  <span className={cn(
                    'flex items-center justify-center h-7 w-7 rounded-md text-xs font-bold shrink-0',
                    activeSection === 'platforms'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-foreground/70 border border-border'
                  )}>
                    2
                  </span>
                  <div>
                    <span className={cn('font-medium text-sm', activeSection === 'platforms' ? 'text-foreground' : 'text-foreground/80')}>Platforms & Objective</span>
                    {activeSection !== 'platforms' && (
                      <p className="text-xs text-foreground/50 mt-0.5">{platformSummary}</p>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-5 animate-fade-in px-4 pb-3">
                  <div className="space-y-2">
                    <Label className="text-foreground/80 text-xs font-medium uppercase tracking-wide">Post to Platforms</Label>
                    {!hasRealAccounts && accounts.length > 0 && (
                      <div className="rounded-md border border-dashed border-muted-foreground/40 bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                        ⚠️ No real accounts connected — these are <strong>demo accounts</strong> for preview only.
                      </div>
                    )}
                    {accounts.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {accounts.map(account => {
                          const Icon = platformIcons[account.platform] || Globe;
                          const selected = form.account_ids.includes(account.id);
                          return (
                            <button
                              key={account.id}
                              type="button"
                              onClick={() => toggleAccount(account.id)}
                              className={cn(
                                'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all',
                                selected
                                  ? 'border-primary bg-primary/10 text-primary font-medium'
                                  : 'border-border text-foreground/60 hover:border-primary/40 hover:bg-muted'
                              )}
                            >
                              {selected && <Check className="h-3 w-3" />}
                              <Icon className="h-3.5 w-3.5" />
                              <span>{account.displayName || account.username}</span>
                              {'isDummy' in account && <Badge variant="outline" className="text-[10px] px-1 py-0 ml-0.5">Demo</Badge>}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No connected accounts. Connect accounts first.</p>
                    )}
                    {form.action !== 'draft' && form.account_ids.length === 0 && (
                      <p className="text-xs text-destructive">Select at least one platform</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-foreground/80 text-xs font-medium uppercase tracking-wide">Objective</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {objectiveOptions.map(opt => {
                        const selected = form.objective === opt.value;
                        const OptIcon = opt.icon;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, objective: opt.value }))}
                            className={cn(
                              'flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all',
                              selected
                                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                : 'border-border hover:border-primary/40 hover:bg-muted/50'
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <OptIcon className={cn('h-4 w-4', selected ? 'text-primary' : 'text-foreground/40')} />
                              <span className={cn('text-sm font-medium', selected ? 'text-primary' : 'text-foreground/80')}>{opt.label}</span>
                            </div>
                            <span className="text-xs text-foreground/50">{opt.description}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => setActiveSection('finalize')}>
                      Continue
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Section 3: Action & Delivery */}
            <AccordionItem
              value="finalize"
              className={cn(
                'border rounded-lg mb-2 transition-all overflow-hidden',
                activeSection === 'finalize' ? 'border-primary/30 bg-primary/[0.03] shadow-sm' : 'border-border'
              )}
              style={activeSection === 'finalize' ? { borderLeftWidth: '3px', borderLeftColor: 'hsl(224 71% 25%)' } : {}}
            >
              <AccordionTrigger className="hover:no-underline px-4 py-3">
                <div className="flex items-center gap-3 text-left">
                  <span className={cn(
                    'flex items-center justify-center h-7 w-7 rounded-md text-xs font-bold shrink-0',
                    activeSection === 'finalize'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-foreground/70 border border-border'
                  )}>
                    3
                  </span>
                  <div>
                    <span className={cn('font-medium text-sm', activeSection === 'finalize' ? 'text-foreground' : 'text-foreground/80')}>Action & Delivery</span>
                    {activeSection !== 'finalize' && (
                      <p className="text-xs text-foreground/50 mt-0.5">{actionSummary}</p>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-5 animate-fade-in px-4 pb-3">
                  {/* Action cards */}
                  <div className="space-y-2">
                    <Label className="text-foreground/80 text-xs font-medium uppercase tracking-wide">Action</Label>
                    <div className="grid gap-2">
                      {actionOptions.map(opt => {
                        const selected = actionValue === opt.value;
                        const OptIcon = opt.icon;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            disabled={opt.disabled}
                            onClick={() => !opt.disabled && setActionValue(opt.value)}
                            className={cn(
                              'flex items-center gap-3 rounded-lg border p-3 text-left transition-all',
                              selected
                                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                : 'border-border hover:border-primary/40 hover:bg-muted/50',
                              opt.disabled && 'opacity-50 cursor-not-allowed hover:border-border hover:bg-transparent'
                            )}
                          >
                            <div className={cn(
                              'flex items-center justify-center h-8 w-8 rounded-lg shrink-0',
                              selected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground/50'
                            )}>
                              <OptIcon className="h-4 w-4" />
                            </div>
                            <div>
                              <div className={cn('text-sm font-medium', selected ? 'text-foreground' : 'text-foreground/80')}>
                                {opt.label}
                              </div>
                              <div className="text-xs text-foreground/50">{opt.description}</div>
                            </div>
                            {selected && <Check className="h-4 w-4 text-primary ml-auto shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Approval emails */}
                  {form.action === 'send_approval' && (
                    <div className="space-y-3">
                      <Label>Approval Emails</Label>
                      <p className="text-xs text-muted-foreground">
                        You're automatically included. Add team members or external reviewers.
                      </p>

                      {companyMembers && companyMembers.length > 0 && (
                        <div className="relative">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full justify-start text-muted-foreground"
                            onClick={() => setMemberDropdownOpen(!memberDropdownOpen)}
                          >
                            <Plus className="h-3.5 w-3.5 mr-2" />
                            Add team member
                          </Button>
                          {memberDropdownOpen && (
                            <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md border border-border bg-popover shadow-md max-h-40 overflow-y-auto">
                              {companyMembers
                                .filter(m => m.email && !form.approval_emails.includes(m.email))
                                .map(member => (
                                  <button
                                    key={member.id}
                                    type="button"
                                    onClick={() => addMemberEmail(member.email!)}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2"
                                  >
                                    <span className="font-medium text-foreground">{member.full_name || member.email}</span>
                                    {member.full_name && (
                                      <span className="text-xs text-muted-foreground">{member.email}</span>
                                    )}
                                  </button>
                                ))}
                              {companyMembers.filter(m => m.email && !form.approval_emails.includes(m.email)).length === 0 && (
                                <div className="px-3 py-2 text-sm text-muted-foreground">All members added</div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="Add emails (comma-separated)"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }}
                        />
                        <Button type="button" variant="outline" size="sm" onClick={addEmail}>Add</Button>
                      </div>

                      {form.approval_emails.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {form.approval_emails.map(email => {
                            const isCurrentUser = email === currentUserEmail;
                            return (
                              <Badge key={email} variant="secondary" className="gap-1">
                                {email}
                                {isCurrentUser && <span className="text-[10px] text-muted-foreground">(you)</span>}
                                {!isCurrentUser && (
                                  <button onClick={() => removeEmail(email)} className="ml-1 hover:text-destructive">×</button>
                                )}
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                      {form.approval_emails.length === 0 && (
                        <p className="text-xs text-destructive">Add at least one approval email</p>
                      )}
                    </div>
                  )}

                  {/* Rule name (auto-generated) */}
                  <div className="space-y-2">
                    <Label htmlFor="ruleName">Rule Name</Label>
                    <div className="flex gap-2">
                      <Input
                        id="ruleName"
                        placeholder="e.g. Auto-post blog articles"
                        value={form.name}
                        onChange={(e) => {
                          setNameManuallyEdited(true);
                          setForm(prev => ({ ...prev, name: e.target.value }));
                        }}
                        className={cn(!form.name.trim() && 'border-destructive/50')}
                      />
                      {nameManuallyEdited && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          title="Regenerate name"
                          onClick={() => {
                            setNameManuallyEdited(false);
                            setForm(prev => ({ ...prev, name: generateName(prev, feeds, accounts) }));
                          }}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {!form.name.trim() && (
                      <p className="text-xs text-destructive">Rule name is required</p>
                    )}
                  </div>

                  {/* Active toggle */}
                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <Label className="text-sm">Active</Label>
                      <p className="text-xs text-muted-foreground">Enable this rule immediately</p>
                    </div>
                    <Switch
                      checked={form.is_active}
                      onCheckedChange={(checked) => setForm(prev => ({ ...prev, is_active: checked }))}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={isSaving || !canSave}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editingRule ? 'Save Changes' : 'Create Rule'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
