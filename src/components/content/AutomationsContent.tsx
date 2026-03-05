import { useState, useMemo, useCallback, useRef } from 'react';
import { useAutomationRules, useCreateAutomationRule, useUpdateAutomationRule, useDeleteAutomationRule, AutomationRule } from '@/hooks/useAutomationRules';
import { useRssFeeds } from '@/hooks/useRssFeeds';
import { useAccounts } from '@/hooks/useGetLateAccounts';
import { useUserRole, useCompany } from '@/hooks/useCompany';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Platform } from '@/lib/api/getlate';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Zap, Plus, Loader2, Trash2, Pencil, Send, Globe, FileText } from 'lucide-react';
import { FaInstagram, FaTwitter, FaTiktok, FaLinkedin, FaFacebook, FaYoutube } from 'react-icons/fa';
import { SiBluesky, SiThreads } from 'react-icons/si';
import AutomationRuleWizard, { RuleFormData, defaultForm } from '@/components/automations/AutomationRuleWizard';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, type ColDef, type ICellRendererParams, type GridReadyEvent } from 'ag-grid-community';
import { gridTheme, gridThemeDark } from '@/lib/ag-grid-theme';
import { useTheme } from '@/contexts/ThemeContext';
import { DataGridToolbar } from '@/components/ui/data-grid-toolbar';

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

export function AutomationsContent() {
  const { data: rules, isLoading } = useAutomationRules();
  const { data: feeds } = useRssFeeds();
  const { data: realAccounts } = useAccounts();
  const { data: userRole } = useUserRole();
  const { data: company } = useCompany();
  const { user } = useAuth();
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark-pro' || currentTheme === 'aurora';

  const createRule = useCreateAutomationRule();
  const updateRule = useUpdateAutomationRule();
  const deleteRule = useDeleteAutomationRule();

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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [form, setForm] = useState<RuleFormData>(defaultForm);
  const [quickFilter, setQuickFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const gridRef = useRef<AgGridReact<AutomationRule>>(null);

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

  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.sizeColumnsToFit();
  }, []);

  const onExportCsv = useCallback(() => {
    gridRef.current?.api?.exportDataAsCsv({ fileName: 'automation-rules.csv' });
  }, []);

  const colDefs = useMemo<ColDef<AutomationRule>[]>(() => {
    const cols: ColDef<AutomationRule>[] = [
      {
        headerName: 'Name',
        field: 'name',
        flex: 1,
        minWidth: 160,
        cellRenderer: (params: ICellRendererParams<AutomationRule>) => (
          <span className="font-medium">{params.value}</span>
        ),
        filter: 'agTextColumnFilter',
      },
      {
        headerName: 'Status',
        field: 'is_active',
        width: 100,
        cellRenderer: (params: ICellRendererParams<AutomationRule>) => (
          <Badge variant={params.value ? 'default' : 'secondary'}>
            {params.value ? 'Active' : 'Inactive'}
          </Badge>
        ),
        filter: 'agTextColumnFilter',
        filterValueGetter: (params) => params.data?.is_active ? 'Active' : 'Inactive',
      },
      {
        headerName: 'Feed',
        field: 'feed_id',
        width: 140,
        cellRenderer: (params: ICellRendererParams<AutomationRule>) => (
          <span className="text-muted-foreground text-sm">{getFeedName(params.value)}</span>
        ),
        filter: 'agTextColumnFilter',
        filterValueGetter: (params) => getFeedName(params.data?.feed_id ?? null),
      },
      {
        headerName: 'Action',
        field: 'action',
        width: 130,
        cellRenderer: (params: ICellRendererParams<AutomationRule>) => {
          const action = params.value;
          const Icon = action === 'publish' ? Globe : action === 'draft' ? FileText : Send;
          const label = action === 'publish' ? 'Auto-publish' : action === 'draft' ? 'Draft' : 'Approval';
          return (
            <span className="flex items-center gap-1 text-sm">
              <Icon className="h-3 w-3" />
              {label}
            </span>
          );
        },
        filter: 'agTextColumnFilter',
      },
      {
        headerName: 'Platforms',
        width: 120,
        cellRenderer: (params: ICellRendererParams<AutomationRule>) => {
          const rule = params.data;
          if (!rule) return null;
          return (
            <div className="flex items-center gap-1">
              {rule.account_ids.length > 0 && accounts && accounts.map(acc => {
                if (!rule.account_ids.includes(acc.id)) return null;
                const Icon = platformIcons[acc.platform] || Globe;
                return <Icon key={acc.id} className="h-4 w-4 text-muted-foreground" />;
              })}
            </div>
          );
        },
        sortable: false,
        filter: false,
      },
      {
        headerName: 'Objective',
        field: 'objective',
        width: 120,
        cellRenderer: (params: ICellRendererParams<AutomationRule>) => (
          <span className="text-sm capitalize">{params.value === 'auto' ? 'AI Decides' : params.value}</span>
        ),
        filter: 'agTextColumnFilter',
      },
    ];

    if (isOwnerOrAdmin) {
      cols.push({
        colId: 'actions',
        headerName: '',
        width: 130,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        pinned: 'right',
        cellRenderer: (params: ICellRendererParams<AutomationRule>) => {
          const rule = params.data;
          if (!rule) return null;
          return (
            <div className="flex items-center gap-1">
              <Switch
                checked={rule.is_active}
                onCheckedChange={() => handleToggleActive(rule)}
              />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(rule)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => setDeleteTarget(rule.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      });
    }

    return cols;
  }, [isOwnerOrAdmin, accounts, feeds]);

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      resizable: true,
      cellStyle: { display: 'flex', alignItems: 'center', overflow: 'hidden' },
    }),
    []
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <DataGridToolbar
          quickFilter={quickFilter}
          onQuickFilterChange={setQuickFilter}
          onExport={onExportCsv}
          quickFilterPlaceholder="Search rules..."
        />
        {isOwnerOrAdmin && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Rule
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : rules && rules.length > 0 ? (
        <div className="relative">
          <style>{`.ag-cell-wrapper { width: 100%; } .ag-cell-value { width: 100%; }`}</style>
          <AgGridReact<AutomationRule>
            ref={gridRef}
            theme={isDark ? gridThemeDark : gridTheme}
            modules={[AllCommunityModule]}
            rowData={rules}
            columnDefs={colDefs}
            defaultColDef={defaultColDef}
            quickFilterText={quickFilter}
            domLayout="autoHeight"
            suppressCellFocus
            animateRows
            onGridReady={onGridReady}
            getRowId={(params) => params.data.id}
          />
        </div>
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
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
              onClick={() => { if (deleteTarget) { deleteRule.mutateAsync(deleteTarget); setDeleteTarget(null); } }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
    </div>
  );
}
