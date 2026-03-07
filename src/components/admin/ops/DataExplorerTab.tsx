import { useState, useMemo, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, type ColDef } from 'ag-grid-community';
import { gridTheme, gridThemeDark } from '@/lib/ag-grid-theme';
import { useTheme } from '@/contexts/ThemeContext';
import { DataGridToolbar } from '@/components/ui/data-grid-toolbar';
import { supabase } from '@/integrations/supabase/client';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Database } from 'lucide-react';
import { useAdminCompanies } from '@/hooks/useAdminInboxData';
import { format } from 'date-fns';

// ─── Table Registry ──────────────────────────────────────────
// All Supabase tables grouped by domain. Each entry defines the
// table name, display label, whether it has a company_id column,
// and the default sort column.

interface TableDef {
  table: string;
  label: string;
  hasCompanyId: boolean;
  sortColumn: string;
}

interface TableGroup {
  group: string;
  tables: TableDef[];
}

const TABLE_REGISTRY: TableGroup[] = [
  {
    group: 'Inbox',
    tables: [
      { table: 'inbox_conversations', label: 'Conversations', hasCompanyId: true, sortColumn: 'last_message_at' },
      { table: 'inbox_messages', label: 'Messages', hasCompanyId: true, sortColumn: 'created_at' },
      { table: 'inbox_contacts', label: 'Contacts', hasCompanyId: true, sortColumn: 'created_at' },
      { table: 'inbox_labels', label: 'Labels', hasCompanyId: true, sortColumn: 'created_at' },
      { table: 'inbox_conversation_labels', label: 'Conversation Labels', hasCompanyId: true, sortColumn: 'created_at' },
      { table: 'inbox_canned_replies', label: 'Canned Replies', hasCompanyId: true, sortColumn: 'created_at' },
      { table: 'inbox_read_status', label: 'Read Status', hasCompanyId: false, sortColumn: 'last_read_at' },
      { table: 'inbox_sync_state', label: 'Sync State', hasCompanyId: true, sortColumn: 'last_synced_at' },
      { table: 'inbox_auto_rules', label: 'Auto Rules', hasCompanyId: true, sortColumn: 'created_at' },
    ],
  },
  {
    group: 'Inbox AI',
    tables: [
      { table: 'inbox_ai_settings', label: 'AI Settings', hasCompanyId: true, sortColumn: 'updated_at' },
      { table: 'inbox_ai_results', label: 'AI Results', hasCompanyId: false, sortColumn: 'created_at' },
      { table: 'inbox_ai_feedback', label: 'AI Feedback', hasCompanyId: false, sortColumn: 'created_at' },
      { table: 'inbox_crisis_events', label: 'Crisis Events', hasCompanyId: true, sortColumn: 'created_at' },
      { table: 'inbox_backfill_jobs', label: 'Backfill Jobs', hasCompanyId: true, sortColumn: 'created_at' },
    ],
  },
  {
    group: 'Content & Posts',
    tables: [
      { table: 'post_drafts', label: 'Post Drafts', hasCompanyId: true, sortColumn: 'created_at' },
      { table: 'post_approvals', label: 'Post Approvals', hasCompanyId: false, sortColumn: 'created_at' },
      { table: 'rss_feeds', label: 'RSS Feeds', hasCompanyId: true, sortColumn: 'created_at' },
      { table: 'rss_feed_items', label: 'RSS Feed Items', hasCompanyId: false, sortColumn: 'published_at' },
      { table: 'automation_rules', label: 'Automation Rules', hasCompanyId: true, sortColumn: 'created_at' },
      { table: 'automation_logs', label: 'Automation Logs', hasCompanyId: true, sortColumn: 'created_at' },
    ],
  },
  {
    group: 'Analytics',
    tables: [
      { table: 'account_analytics_snapshots', label: 'Account Snapshots', hasCompanyId: true, sortColumn: 'snapshot_date' },
      { table: 'post_analytics_snapshots', label: 'Post Snapshots', hasCompanyId: true, sortColumn: 'snapshot_date' },
      { table: 'content_decay_cache', label: 'Content Decay Cache', hasCompanyId: false, sortColumn: 'updated_at' },
    ],
  },
  {
    group: 'Platform & Companies',
    tables: [
      { table: 'companies', label: 'Companies', hasCompanyId: false, sortColumn: 'created_at' },
      { table: 'company_memberships', label: 'Company Memberships', hasCompanyId: true, sortColumn: 'created_at' },
      { table: 'company_invitations', label: 'Company Invitations', hasCompanyId: true, sortColumn: 'created_at' },
      { table: 'company_email_settings', label: 'Company Email Settings', hasCompanyId: true, sortColumn: 'updated_at' },
      { table: 'company_voice_settings', label: 'Company Voice Settings', hasCompanyId: true, sortColumn: 'updated_at' },
      { table: 'profiles', label: 'User Profiles', hasCompanyId: false, sortColumn: 'updated_at' },
      { table: 'superadmins', label: 'Superadmins', hasCompanyId: false, sortColumn: 'created_at' },
      { table: 'user_roles', label: 'User Roles', hasCompanyId: false, sortColumn: 'created_at' },
      { table: 'discovery_leads', label: 'Discovery Leads', hasCompanyId: false, sortColumn: 'created_at' },
    ],
  },
  {
    group: 'Media Companies',
    tables: [
      { table: 'media_companies', label: 'Media Companies', hasCompanyId: false, sortColumn: 'created_at' },
      { table: 'media_company_analytics', label: 'Media Company Analytics', hasCompanyId: false, sortColumn: 'created_at' },
    ],
  },
  {
    group: 'Webhooks & Monitoring',
    tables: [
      { table: 'webhook_registrations', label: 'Webhook Registrations', hasCompanyId: true, sortColumn: 'created_at' },
      { table: 'webhook_event_log', label: 'Webhook Events', hasCompanyId: true, sortColumn: 'created_at' },
      { table: 'cron_health_logs', label: 'Cron Health Logs', hasCompanyId: false, sortColumn: 'created_at' },
      { table: 'cron_job_settings', label: 'Cron Job Settings', hasCompanyId: false, sortColumn: 'updated_at' },
      { table: 'api_call_logs', label: 'API Call Logs', hasCompanyId: true, sortColumn: 'created_at' },
      { table: 'getlate_changelog_checks', label: 'GetLate Changelog', hasCompanyId: false, sortColumn: 'checked_at' },
    ],
  },
  {
    group: 'Settings',
    tables: [
      { table: 'platform_settings', label: 'Platform Settings', hasCompanyId: false, sortColumn: 'updated_at' },
      { table: 'global_email_settings', label: 'Global Email Settings', hasCompanyId: false, sortColumn: 'updated_at' },
      { table: 'global_voice_defaults', label: 'Global Voice Defaults', hasCompanyId: false, sortColumn: 'updated_at' },
      { table: 'og_company_settings', label: 'OG Image Settings', hasCompanyId: true, sortColumn: 'updated_at' },
    ],
  },
  {
    group: 'Chat',
    tables: [
      { table: 'chat_threads', label: 'Chat Threads', hasCompanyId: true, sortColumn: 'updated_at' },
      { table: 'chat_messages', label: 'Chat Messages', hasCompanyId: false, sortColumn: 'created_at' },
    ],
  },
];

// Flat lookup for quick access
const ALL_TABLES = TABLE_REGISTRY.flatMap(g => g.tables);

const PAGE_SIZE = 50;

// ─── Auto Column Detection ──────────────────────────────────
// Build AG Grid column definitions from the first row of data.
// Handles common patterns: dates, booleans, IDs, JSON objects.

function buildColDefs(row: Record<string, unknown>): ColDef[] {
  if (!row) return [];
  return Object.keys(row).map((key) => {
    const value = row[key];
    const col: ColDef = {
      field: key,
      headerName: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      minWidth: 100,
      filter: true,
    };

    // ID columns — short display
    if (key === 'id' || key.endsWith('_id')) {
      col.width = 120;
      col.cellRenderer = (p: { value: unknown }) => {
        const v = String(p.value ?? '');
        return v.length > 12 ? v.slice(0, 8) + '...' : v;
      };
    }
    // Date columns
    else if (key.endsWith('_at') || key.endsWith('_date') || key === 'checked_at' || key === 'published_at') {
      col.width = 160;
      col.cellRenderer = (p: { value: unknown }) => {
        if (!p.value) return '';
        try {
          return format(new Date(p.value as string), 'MMM d, HH:mm:ss');
        } catch {
          return String(p.value);
        }
      };
    }
    // Boolean columns
    else if (typeof value === 'boolean') {
      col.width = 90;
      col.cellRenderer = (p: { value: unknown }) =>
        p.value === true ? '\u2705' : p.value === false ? '\u274C' : '';
    }
    // JSON/object columns — truncated display
    else if (typeof value === 'object' && value !== null) {
      col.flex = 1;
      col.minWidth = 180;
      col.cellRenderer = (p: { value: unknown }) => {
        if (!p.value) return '';
        const str = JSON.stringify(p.value);
        return str.length > 80 ? str.slice(0, 77) + '...' : str;
      };
    }
    // Long text columns
    else if (typeof value === 'string' && (value as string).length > 60) {
      col.flex = 1;
      col.minWidth = 200;
    }
    // Numeric columns
    else if (typeof value === 'number') {
      col.width = 100;
      col.type = 'numericColumn';
    }

    return col;
  });
}

// ─── Component ───────────────────────────────────────────────

export function DataExplorerTab() {
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark-pro' || currentTheme === 'aurora';
  const gridRef = useRef<AgGridReact>(null);

  const [selectedTable, setSelectedTable] = useState('inbox_conversations');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [quickFilter, setQuickFilter] = useState('');
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null);

  const tableDef = ALL_TABLES.find(t => t.table === selectedTable);
  const { data: companies } = useAdminCompanies();

  // Fetch data for selected table
  const { data, isLoading, error } = useQuery({
    queryKey: ['data-explorer', selectedTable, companyId, page],
    queryFn: async () => {
      let query = supabase
        .from(selectedTable as any)
        .select('*')
        .order(tableDef?.sortColumn || 'id', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (companyId && tableDef?.hasCompanyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Record<string, unknown>[];
    },
    staleTime: 15000,
  });

  // Row count for the selected table
  const { data: rowCount } = useQuery({
    queryKey: ['data-explorer-count', selectedTable, companyId],
    queryFn: async () => {
      let query = supabase
        .from(selectedTable as any)
        .select('*', { count: 'exact', head: true });

      if (companyId && tableDef?.hasCompanyId) {
        query = query.eq('company_id', companyId);
      }

      const { count, error } = await query;
      if (error) return null;
      return count;
    },
    staleTime: 30000,
  });

  // Auto-generate columns from first row
  const columnDefs = useMemo(() => {
    if (!data || data.length === 0) return [];
    return buildColDefs(data[0]);
  }, [data]);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
    cellStyle: { display: 'flex', alignItems: 'center', overflow: 'hidden' },
  }), []);

  const onExportCsv = useCallback(() => {
    gridRef.current?.api?.exportDataAsCsv({ fileName: `${selectedTable}-export.csv` });
  }, [selectedTable]);

  const onTableChange = useCallback((value: string) => {
    setSelectedTable(value);
    setPage(0);
    setQuickFilter('');
  }, []);

  const onCompanyChange = useCallback((value: string) => {
    setCompanyId(value === 'all' ? null : value);
    setPage(0);
  }, []);

  const totalPages = rowCount != null ? Math.ceil(rowCount / PAGE_SIZE) : null;

  return (
    <div className="space-y-4">
      {/* Table + Company selectors */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedTable} onValueChange={onTableChange}>
            <SelectTrigger className="w-[260px] bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border border-border z-50 max-h-[400px]">
              {TABLE_REGISTRY.map(group => (
                <SelectGroup key={group.group}>
                  <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.group}
                  </SelectLabel>
                  {group.tables.map(t => (
                    <SelectItem key={t.table} value={t.table}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        {tableDef?.hasCompanyId && (
          <Select value={companyId || 'all'} onValueChange={onCompanyChange}>
            <SelectTrigger className="w-[200px] bg-background">
              <SelectValue placeholder="All companies" />
            </SelectTrigger>
            <SelectContent className="bg-background border border-border z-50">
              <SelectItem value="all">All companies</SelectItem>
              {companies?.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Badge variant="outline" className="text-xs ml-auto">
          {selectedTable}
          {rowCount != null && ` \u2022 ${rowCount.toLocaleString()} rows`}
        </Badge>
      </div>

      {/* Search + Export toolbar */}
      <DataGridToolbar
        quickFilter={quickFilter}
        onQuickFilterChange={setQuickFilter}
        onExport={onExportCsv}
        quickFilterPlaceholder={`Search ${tableDef?.label || selectedTable}...`}
      />

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 p-4 text-sm text-red-600 dark:text-red-400">
          Failed to load table: {(error as Error).message}
        </div>
      )}

      {/* AG Grid */}
      <div className="border rounded-lg">
        <style>{`.ag-cell-wrapper { width: 100%; } .ag-cell-value { width: 100%; }`}</style>
        <AgGridReact
          ref={gridRef}
          theme={isDark ? gridThemeDark : gridTheme}
          modules={[AllCommunityModule]}
          rowData={data || []}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          quickFilterText={quickFilter}
          domLayout="autoHeight"
          suppressCellFocus
          animateRows
          loading={isLoading}
          onRowClicked={(e) => setSelectedRow(e.data)}
          getRowId={(params) => params.data.id || JSON.stringify(params.data)}
          noRowsOverlayComponent={() => (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Database className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No data in this table{companyId ? ' for this company' : ''}</p>
            </div>
          )}
        />
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {data?.length || 0} rows loaded
          {totalPages != null && ` \u2022 Page ${page + 1} of ${totalPages || 1}`}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <Button variant="outline" size="sm" disabled={(data?.length || 0) < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Row Detail Dialog */}
      <Dialog open={!!selectedRow} onOpenChange={() => setSelectedRow(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              {tableDef?.label || selectedTable} — Row Detail
            </DialogTitle>
          </DialogHeader>
          {selectedRow && (
            <div className="space-y-2">
              {Object.entries(selectedRow).map(([key, value]) => (
                <div key={key} className="grid grid-cols-[160px_1fr] gap-2 text-sm border-b border-border pb-2 last:border-0">
                  <span className="text-muted-foreground font-mono text-xs truncate" title={key}>{key}</span>
                  <span className="break-all">
                    {value === null ? (
                      <span className="text-muted-foreground italic">null</span>
                    ) : typeof value === 'object' ? (
                      <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32 whitespace-pre-wrap">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    ) : typeof value === 'boolean' ? (
                      <Badge variant={value ? 'default' : 'secondary'}>{String(value)}</Badge>
                    ) : (
                      String(value)
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
