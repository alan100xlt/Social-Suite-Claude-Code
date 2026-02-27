import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/hooks/useCompany';
import { useRssFeeds } from '@/hooks/useRssFeeds';
import { useAccounts } from '@/hooks/useGetLateAccounts';
import { useAutomationRules, useCreateAutomationRule, useUpdateAutomationRule } from '@/hooks/useAutomationRules';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Platform } from '@/lib/api/getlate';
import { CheckCircle } from 'lucide-react';
import { posthog } from '@/lib/posthog';
import AutomationRuleWizard, { RuleFormData, defaultForm } from '@/components/automations/AutomationRuleWizard';
import { Button } from '@/components/ui/button';

export function AutomationStep() {
  const { user } = useAuth();
  const { data: company } = useCompany();
  const { data: feeds } = useRssFeeds();
  const { data: realAccounts } = useAccounts();
  const { data: existingRules } = useAutomationRules();
  const createRule = useCreateAutomationRule();
  const updateRule = useUpdateAutomationRule();

  const { data: companyMembers } = useQuery({
    queryKey: ['company-members', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('company_id', company.id);
      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });

  const dummyAccounts: { id: string; platform: Platform; displayName: string; username: string; isDummy: true }[] = [
    { id: 'dummy-facebook', platform: 'facebook', displayName: 'Facebook Page (Demo)', username: 'demo', isDummy: true },
    { id: 'dummy-instagram', platform: 'instagram', displayName: 'Instagram Account (Demo)', username: 'demo', isDummy: true },
  ];
  const hasRealAccounts = realAccounts && realAccounts.length > 0;
  const accounts = hasRealAccounts ? realAccounts : dummyAccounts;

  const [wizardOpen, setWizardOpen] = useState(false);
  const [form, setForm] = useState<RuleFormData>({
    ...defaultForm,
    action: 'send_approval',
    scheduling: 'immediate',
  });
  const [saved, setSaved] = useState(false);

  // Pre-fill defaults when data loads
  useEffect(() => {
    if (feeds && feeds.length > 0 && !form.feed_id) {
      setForm(prev => ({ ...prev, feed_id: feeds[0].id }));
    }
  }, [feeds, form.feed_id]);

  useEffect(() => {
    if (accounts && accounts.length > 0 && form.account_ids.length === 0) {
      setForm(prev => ({ ...prev, account_ids: accounts.map(a => a.id) }));
    }
  }, [accounts, form.account_ids.length]);

  useEffect(() => {
    if (user?.email && form.approval_emails.length === 0) {
      setForm(prev => ({ ...prev, approval_emails: [user.email!] }));
    }
  }, [user?.email, form.approval_emails.length]);

  useEffect(() => {
    if (existingRules && existingRules.length > 0) {
      setSaved(true);
    }
  }, [existingRules]);

  const handleSave = async () => {
    if (!company?.id) return;

    if (existingRules && existingRules.length > 0) {
      await updateRule.mutateAsync({
        id: existingRules[0].id,
        ...form,
      });
    } else {
      await createRule.mutateAsync(form);
    }

    posthog.capture('onboarding_automation_created', {
      action: form.action,
      platformCount: form.account_ids.length,
    });
    setSaved(true);
    setWizardOpen(false);
  };

  const isSaving = createRule.isPending || updateRule.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Setup Your First Automation</h2>
        <p className="text-muted-foreground mt-1">
          When new content is published on your RSS feed, we'll generate social posts and send them for your approval.
        </p>
      </div>

      {saved && (
        <div className="flex items-center gap-2 text-sm text-primary bg-primary/5 rounded-lg p-3 border border-primary/20">
          <CheckCircle className="w-4 h-4" />
          Automation rule is active! You can customize it further in Settings.
        </div>
      )}

      <Button onClick={() => setWizardOpen(true)} className="w-full sm:w-auto">
        {saved ? 'Edit Automation Rule' : 'Create Automation Rule'}
      </Button>

      <AutomationRuleWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        editingRule={existingRules?.[0] || null}
        form={form}
        setForm={setForm}
        onSave={handleSave}
        isSaving={isSaving}
        feeds={feeds}
        accounts={accounts}
        hasRealAccounts={!!hasRealAccounts}
        currentUserEmail={user?.email || undefined}
        companyMembers={companyMembers}
        lockedFeedId={feeds?.[0]?.id}
      />
    </div>
  );
}
