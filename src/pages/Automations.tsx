import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAutomationRules, useCreateAutomationRule, useUpdateAutomationRule, useDeleteAutomationRule, AutomationRule } from '@/hooks/useAutomationRules';
import { useRssFeeds } from '@/hooks/useRssFeeds';
import { useAccounts } from '@/hooks/useGetLateAccounts';
import { useUserRole, useCompany } from '@/hooks/useCompany';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Platform } from '@/lib/api/getlate';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Zap, Plus, Loader2, Trash2, Pencil, Send, Globe, FileText, RefreshCw, Search, CheckCircle2, XCircle, SkipForward, ChevronLeft, ChevronRight, ExternalLink, Building2 } from 'lucide-react';
import { FaInstagram, FaTwitter, FaTiktok, FaLinkedin, FaFacebook, FaYoutube } from 'react-icons/fa';
import { SiBluesky, SiThreads } from 'react-icons/si';
import AutomationRuleWizard, { RuleFormData, defaultForm } from '@/components/automations/AutomationRuleWizard';
import { useCompanies } from '@/hooks/useCompanies';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';

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

// --- Automation Logs types & config ---
interface AutomationLog {
  id: string;
  company_id: string;
  rule_id: string | null;
  rule_name: string;
  feed_id: string | null;
  feed_item_id: string | null;
  article_title: string | null;
  article_link: string | null;
  action: string;
  result: "success" | "error" | "skipped";
  error_message: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

const PAGE_SIZE = 50;

const resultConfig = {
  success: { icon: CheckCircle2, className: "text-green-500", label: "Success" },
  error: { icon: XCircle, className: "text-destructive", label: "Error" },
  skipped: { icon: SkipForward, className: "text-yellow-500", label: "Skipped" },
};

const actionLabels: Record<string, string> = {
  draft: "Leave in Draft",
  send_approval: "Send for Approval",
  publish: "Publish",
  strategy_generation: "Strategy Generation",
  post_generation: "Post Generation",
  publish_as_draft_dummy: "Draft (Demo)",
  publish_pending: "Publish (Pending)",
};

export default function AutomationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'rules';

  const { data: rules, isLoading } = useAutomationRules();
  const { data: feeds } = useRssFeeds();
  const { data: realAccounts } = useAccounts();
  const { data: userRole } = useUserRole();
  const { data: company } = useCompany();
  const { user } = useAuth();
  const { isSuperAdmin } = useAuth();
  const createRule = useCreateAutomationRule();

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
  const updateRule = useUpdateAutomationRule();
  const deleteRule = useDeleteAutomationRule();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [form, setForm] = useState<RuleFormData>(defaultForm);

  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';

  const openCreate = () => {
    setEditingRule(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (rule: AutomationRule) => {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      is_active: rule.is_active,
      feed_id: rule.feed_id,
      objective: rule.objective,
      action: rule.action,
      scheduling: rule.scheduling,
      approval_emails: rule.approval_emails,
      account_ids: rule.account_ids,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (form.action !== 'draft' && form.account_ids.length === 0) return;
    if (form.action === 'send_approval' && form.approval_emails.length === 0) return;

    if (editingRule) {
      await updateRule.mutateAsync({ id: editingRule.id, ...form });
    } else {
      await createRule.mutateAsync(form);
    }
    setDialogOpen(false);
  };

  const handleToggleActive = async (rule: AutomationRule) => {
    await updateRule.mutateAsync({ id: rule.id, is_active: !rule.is_active });
  };

  const getFeedName = (feedId: string | null) => {
    if (!feedId) return 'All feeds';
    return feeds?.find(f => f.id === feedId)?.name || 'Unknown feed';
  };

  const isSaving = createRule.isPending || updateRule.isPending;

  // --- Logs state ---
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [resultFilter, setResultFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AutomationLog | null>(null);

  const { data: companies } = useCompanies();
  const companyNameMap = new Map(companies?.map(c => [c.id, c.name]) || []);

  const { data: logs, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ["automation-logs", companyFilter, resultFilter, actionFilter, searchQuery, page],
    queryFn: async () => {
      let query = supabase
        .from("automation_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (companyFilter !== "all") query = query.eq("company_id", companyFilter);
      if (resultFilter !== "all") query = query.eq("result", resultFilter);
      if (actionFilter !== "all") query = query.eq("action", actionFilter);
      if (searchQuery) {
        query = query.or(`rule_name.ilike.%${searchQuery}%,article_title.ilike.%${searchQuery}%,error_message.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as AutomationLog[];
    },
    enabled: activeTab === 'logs',
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Automations</h1>
            <p className="text-muted-foreground">
              Set up rules to automatically create and publish posts from your content
            </p>
          </div>
          {isOwnerOrAdmin && activeTab === 'rules' && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Rule
            </Button>
          )}
          {activeTab === 'logs' && (
            <Button variant="outline" size="sm" onClick={() => refetchLogs()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })}>
          <TabsList>
            <TabsTrigger value="rules">Rules</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          {/* Rules Tab */}
          <TabsContent value="rules" className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : rules && rules.length > 0 ? (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Feed</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Platforms</TableHead>
                      <TableHead>Objective</TableHead>
                      {isOwnerOrAdmin && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">{rule.name}</TableCell>
                        <TableCell>
                          <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{getFeedName(rule.feed_id)}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1 text-sm">
                            {rule.action === 'publish' ? <Globe className="h-3 w-3" /> : rule.action === 'draft' ? <FileText className="h-3 w-3" /> : <Send className="h-3 w-3" />}
                            {rule.action === 'publish' ? 'Auto-publish' : rule.action === 'draft' ? 'Draft' : 'Approval'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {rule.account_ids.length > 0 && accounts && accounts.map(acc => {
                              if (!rule.account_ids.includes(acc.id)) return null;
                              const Icon = platformIcons[acc.platform] || Globe;
                              return <Icon key={acc.id} className="h-4 w-4 text-muted-foreground" />;
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm capitalize">{rule.objective === 'auto' ? 'AI Decides' : rule.objective}</TableCell>
                        {isOwnerOrAdmin && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Switch
                                checked={rule.is_active}
                                onCheckedChange={() => handleToggleActive(rule)}
                              />
                              <Button variant="ghost" size="icon" onClick={() => openEdit(rule)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Rule</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this automation rule? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteRule.mutateAsync(rule.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Zap className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Automation Rules</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Create your first automation rule to automatically generate posts from new articles
                  </p>
                  {isOwnerOrAdmin && (
                    <Button onClick={openCreate}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Rule
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="mt-4 space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search rules, articles, errors..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                  className="pl-9"
                />
              </div>
              {isSuperAdmin && companies && companies.length > 1 && (
                <Select value={companyFilter} onValueChange={(v) => { setCompanyFilter(v); setPage(0); }}>
                  <SelectTrigger className="w-[180px]">
                    <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Companies</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={resultFilter} onValueChange={(v) => { setResultFilter(v); setPage(0); }}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Results</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Errors</SelectItem>
                  <SelectItem value="skipped">Skipped</SelectItem>
                </SelectContent>
              </Select>
              <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="draft">Leave in Draft</SelectItem>
                  <SelectItem value="send_approval">Send for Approval</SelectItem>
                  <SelectItem value="publish">Publish</SelectItem>
                  <SelectItem value="strategy_generation">Strategy Generation</SelectItem>
                  <SelectItem value="post_generation">Post Generation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Logs Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Result</TableHead>
                    {isSuperAdmin && <TableHead>Company</TableHead>}
                    <TableHead>Rule</TableHead>
                    <TableHead>Article</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading logs...</TableCell>
                    </TableRow>
                  ) : !logs?.length ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No automation logs yet. Logs will appear here when automation rules are triggered by RSS feed polls.
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => {
                      const config = resultConfig[log.result] || resultConfig.error;
                      const ResultIcon = config.icon;
                      return (
                        <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedLog(log)}>
                          <TableCell><ResultIcon className={`w-4 h-4 ${config.className}`} /></TableCell>
                          {isSuperAdmin && (
                            <TableCell><span className="text-xs text-muted-foreground">{companyNameMap.get(log.company_id) || '—'}</span></TableCell>
                          )}
                          <TableCell><span className="text-sm font-medium">{log.rule_name}</span></TableCell>
                          <TableCell className="max-w-[250px]">
                            {log.article_title ? (
                              <span className="text-sm truncate block" title={log.article_title}>{log.article_title}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{actionLabels[log.action] || log.action}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            {log.error_message && (
                              <span className="text-xs text-destructive truncate block">{log.error_message}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Page {page + 1} • Showing {logs?.length || 0} results</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={(logs?.length || 0) < PAGE_SIZE} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Wizard Dialog */}
        <AutomationRuleWizard
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editingRule={editingRule}
          form={form}
          setForm={setForm}
          onSave={handleSave}
          isSaving={isSaving}
          feeds={feeds}
          accounts={accounts}
          hasRealAccounts={!!hasRealAccounts}
          currentUserEmail={user?.email || undefined}
          companyMembers={companyMembers}
        />

        {/* Log Detail Dialog */}
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedLog && (() => {
                  const config = resultConfig[selectedLog.result] || resultConfig.error;
                  const ResultIcon = config.icon;
                  return <ResultIcon className={`w-5 h-5 ${config.className}`} />;
                })()}
                {selectedLog?.rule_name} → {actionLabels[selectedLog?.action || ""] || selectedLog?.action}
              </DialogTitle>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Timestamp</p>
                    <p className="font-mono">{format(new Date(selectedLog.created_at), "yyyy-MM-dd HH:mm:ss")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Result</p>
                    <Badge variant={selectedLog.result === "success" ? "default" : selectedLog.result === "error" ? "destructive" : "secondary"}>
                      {selectedLog.result}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Rule Name</p>
                    <p className="font-medium">{selectedLog.rule_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Action</p>
                    <p>{actionLabels[selectedLog.action] || selectedLog.action}</p>
                  </div>
                </div>
                {selectedLog.article_title && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Article</p>
                    <div className="p-3 rounded-md bg-muted">
                      <p className="text-sm font-medium">{selectedLog.article_title}</p>
                      {selectedLog.article_link && (
                        <a href={selectedLog.article_link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                          {selectedLog.article_link}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
                {selectedLog.error_message && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Error</p>
                    <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm font-mono break-all">{selectedLog.error_message}</div>
                  </div>
                )}
                {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Details</p>
                    <pre className="p-3 rounded-md bg-muted text-xs font-mono overflow-x-auto max-h-[200px]">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
