import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useRssFeeds, useCreateRssFeed, useUpdateRssFeed, useDeleteRssFeed } from '@/hooks/useRssFeeds';
import { useAutomationRules, useCreateAutomationRule, useUpdateAutomationRule, AutomationRule } from '@/hooks/useAutomationRules';
import { useAccounts } from '@/hooks/useGetLateAccounts';
import { useUserRole, useCompany } from '@/hooks/useCompany';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Platform } from '@/lib/api/getlate';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Rss, Plus, Loader2, ExternalLink, Trash2, Clock, Globe, Activity, FileText, Zap, Pencil } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import AutomationRuleWizard, { RuleFormData, defaultForm } from '@/components/automations/AutomationRuleWizard';
import { FeedFormDialog, FeedFormValues } from '@/components/content/FeedFormDialog';

export function FeedsTab() {
  const { data: feeds, isLoading } = useRssFeeds();
  const { data: userRole } = useUserRole();
  const { data: company } = useCompany();
  const { user } = useAuth();
  const createFeed = useCreateRssFeed();
  const updateFeed = useUpdateRssFeed();
  const deleteFeed = useDeleteRssFeed();
  const { data: rules } = useAutomationRules();
  const { data: realAccounts } = useAccounts();

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

  // Add dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingFeedId, setEditingFeedId] = useState<string | null>(null);

  // Wizard state for "create new rule" flow
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardFeedId, setWizardFeedId] = useState<string | undefined>(undefined);
  const [wizardForm, setWizardForm] = useState<RuleFormData>(defaultForm);
  const createRule = useCreateAutomationRule();
  const updateRule = useUpdateAutomationRule();

  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';

  const getLinkedRule = (feedId: string): AutomationRule | undefined => {
    return rules?.find(r => r.feed_id === feedId);
  };

  const handleAddFeed = async (values: FeedFormValues) => {
    if (!values.name.trim() || !values.url.trim()) return;
    const newFeed = await createFeed.mutateAsync({
      name: values.name.trim(),
      url: values.url.trim(),
      enableScraping: values.enableScraping,
    });

    if (values.selectedRuleId && values.selectedRuleId !== 'none' && values.selectedRuleId !== 'new') {
      await updateRule.mutateAsync({ id: values.selectedRuleId, feed_id: newFeed.id });
    }

    if (values.selectedRuleId === 'new') {
      setWizardFeedId(newFeed.id);
      setWizardForm({ ...defaultForm, feed_id: newFeed.id });
      setAddDialogOpen(false);
      setWizardOpen(true);
    } else {
      setAddDialogOpen(false);
    }
  };

  const handleEditFeed = async (values: FeedFormValues) => {
    if (!editingFeedId || !values.name.trim() || !values.url.trim()) return;

    // Update the feed itself
    await updateFeed.mutateAsync({
      id: editingFeedId,
      name: values.name.trim(),
      url: values.url.trim(),
      enable_scraping: values.enableScraping,
    });

    const currentLinkedRule = getLinkedRule(editingFeedId);

    // Handle rule changes
    if (values.selectedRuleId === 'none') {
      // Unlink any currently linked rule
      if (currentLinkedRule) {
        await updateRule.mutateAsync({ id: currentLinkedRule.id, feed_id: null });
      }
    } else if (values.selectedRuleId === 'new') {
      // Unlink current rule first
      if (currentLinkedRule) {
        await updateRule.mutateAsync({ id: currentLinkedRule.id, feed_id: null });
      }
      setWizardFeedId(editingFeedId);
      setWizardForm({ ...defaultForm, feed_id: editingFeedId });
      setEditDialogOpen(false);
      setWizardOpen(true);
      return;
    } else if (values.selectedRuleId !== currentLinkedRule?.id) {
      // Unlink old rule
      if (currentLinkedRule) {
        await updateRule.mutateAsync({ id: currentLinkedRule.id, feed_id: null });
      }
      // Link new rule
      await updateRule.mutateAsync({ id: values.selectedRuleId, feed_id: editingFeedId });
    }

    setEditDialogOpen(false);
    setEditingFeedId(null);
  };

  const openEditDialog = (feedId: string) => {
    setEditingFeedId(feedId);
    setEditDialogOpen(true);
  };

  const handleWizardSave = async () => {
    if (!wizardForm.name.trim()) return;
    if (wizardForm.action !== 'draft' && wizardForm.account_ids.length === 0) return;
    if (wizardForm.action === 'send_approval' && wizardForm.approval_emails.length === 0) return;
    await createRule.mutateAsync(wizardForm);
    setWizardOpen(false);
  };

  const handleToggleActive = async (feedId: string, isActive: boolean) => {
    await updateFeed.mutateAsync({ id: feedId, is_active: isActive });
  };

  const handleDeleteFeed = async (feedId: string) => {
    await deleteFeed.mutateAsync(feedId);
  };

  const activeCount = feeds?.filter(f => f.is_active).length || 0;
  const withAutomationCount = feeds?.filter(f => rules?.some(r => r.feed_id === f.id)).length || 0;
  const noAutomationCount = (feeds?.length || 0) - withAutomationCount;

  const editingFeed = editingFeedId ? feeds?.find(f => f.id === editingFeedId) : null;
  const editingFeedLinkedRule = editingFeedId ? getLinkedRule(editingFeedId) : undefined;

  const addFormInitial: FeedFormValues = { name: '', url: '', enableScraping: false, selectedRuleId: 'none' };
  const editFormInitial: FeedFormValues = editingFeed
    ? { name: editingFeed.name, url: editingFeed.url, enableScraping: editingFeed.enable_scraping, selectedRuleId: editingFeedLinkedRule?.id || 'none' }
    : addFormInitial;

  return (
    <div className="space-y-6">
      {/* Header row with Add button */}
      <div className="flex items-center justify-between">
        <div />
        {isOwnerOrAdmin && (
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Feed
          </Button>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid gap-3 grid-cols-3">
        <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground leading-none">{activeCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Active</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground leading-none">{withAutomationCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">With Automation</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <FileText className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground leading-none">{noAutomationCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">No Automation</p>
          </div>
        </div>
      </div>

      {/* Feeds List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : feeds && feeds.length > 0 ? (
        <div className="space-y-3">
          {feeds.map((feed) => {
            const linkedRule = getLinkedRule(feed.id);
            return (
              <div
                key={feed.id}
                className={cn(
                  "rounded-xl border bg-card transition-colors",
                  feed.is_active ? "border-border" : "border-border/50 opacity-70"
                )}
              >
                <div className="p-5">
                  {/* Top row: icon, name, badges */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                        feed.is_active ? "bg-primary/10" : "bg-muted"
                      )}>
                        <Rss className={cn("h-5 w-5", feed.is_active ? "text-primary" : "text-muted-foreground")} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground text-sm leading-tight">{feed.name}</h3>
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant={feed.is_active ? 'default' : 'secondary'}
                              className="text-[10px] py-0 h-5"
                            >
                              {feed.is_active ? 'Active' : 'Paused'}
                            </Badge>
                            <Badge
                              variant={linkedRule ? 'default' : 'outline'}
                              className="text-[10px] py-0 h-5"
                            >
                              {linkedRule ? linkedRule.name : 'No automation'}
                            </Badge>
                            {feed.enable_scraping && (
                              <Badge variant="outline" className="text-[10px] py-0 h-5 gap-1">
                                <Globe className="h-2.5 w-2.5" />Scraping
                              </Badge>
                            )}
                          </div>
                        </div>
                        <a
                          href={feed.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-1.5 truncate max-w-md"
                        >
                          <span className="truncate">{feed.url}</span>
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                      </div>
                    </div>

                    {/* Edit & Delete buttons */}
                    {isOwnerOrAdmin && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-8 w-8" onClick={() => openEditDialog(feed.id)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-8 w-8">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Feed</AlertDialogTitle>
                              <AlertDialogDescription>Are you sure you want to delete "{feed.name}"? This will also remove all associated articles. This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteFeed(feed.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>

                  {/* Controls row */}
                  {isOwnerOrAdmin && (
                    <>
                      <Separator className="my-4" />
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2.5">
                          <Switch
                            id={`active-${feed.id}`}
                            checked={feed.is_active}
                            onCheckedChange={(checked) => handleToggleActive(feed.id, checked)}
                            className="scale-90"
                          />
                          <Label htmlFor={`active-${feed.id}`} className="text-xs text-muted-foreground cursor-pointer">Active</Label>
                        </div>
                        <div className="ml-auto flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Every 5 min
                          </span>
                          {feed.last_polled_at && (
                            <span title={format(new Date(feed.last_polled_at), 'PPpp')}>
                              Polled {formatDistanceToNow(new Date(feed.last_polled_at), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Rss className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No RSS Feeds</h3>
            <p className="text-muted-foreground text-center text-sm mb-4">Add an RSS feed to automatically generate social posts from your content</p>
            {isOwnerOrAdmin && (
              <Button onClick={() => setAddDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Your First Feed</Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Feed Dialog */}
      <FeedFormDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        title="Add RSS Feed"
        description="Add a new RSS feed to automatically generate social posts from your content"
        initialValues={addFormInitial}
        onSubmit={handleAddFeed}
        isPending={createFeed.isPending}
        submitLabel="Add Feed"
        rules={rules}
        accounts={accounts}
      />

      {/* Edit Feed Dialog */}
      <FeedFormDialog
        key={editingFeedId || 'none'}
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setEditingFeedId(null);
        }}
        title="Edit RSS Feed"
        description="Update feed settings and automation rule"
        initialValues={editFormInitial}
        onSubmit={handleEditFeed}
        isPending={updateFeed.isPending}
        submitLabel="Save Changes"
        rules={rules}
        accounts={accounts}
      />

      {/* Automation Rule Wizard for "create new rule" flow */}
      <AutomationRuleWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        editingRule={null}
        form={wizardForm}
        setForm={setWizardForm}
        onSave={handleWizardSave}
        isSaving={createRule.isPending}
        feeds={feeds}
        accounts={accounts}
        hasRealAccounts={!!hasRealAccounts}
        currentUserEmail={user?.email || undefined}
        companyMembers={companyMembers}
        lockedFeedId={wizardFeedId}
      />
    </div>
  );
}
