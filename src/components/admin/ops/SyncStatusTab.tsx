import { useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, type ColDef } from 'ag-grid-community';
import { gridTheme, gridThemeDark } from '@/lib/ag-grid-theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Server, AlertTriangle, MessageSquare } from 'lucide-react';
import { useAdminSyncStatus, type SyncStateEntry, type CronHealthLog } from '@/hooks/useAdminSyncStatus';
import { useAdminCompanies } from '@/hooks/useAdminInboxData';
import { format, formatDistanceToNow } from 'date-fns';

function getSyncHealthStatus(lastSynced: string | null): { label: string; color: string } {
  if (!lastSynced) return { label: 'Never', color: 'text-muted-foreground' };
  const diffMs = Date.now() - new Date(lastSynced).getTime();
  if (diffMs < 15 * 60 * 1000) return { label: 'Healthy', color: 'text-green-500' };
  if (diffMs < 60 * 60 * 1000) return { label: 'Stale', color: 'text-yellow-500' };
  return { label: 'Error', color: 'text-red-500' };
}

export function SyncStatusTab() {
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark-pro' || currentTheme === 'aurora';
  const syncGridRef = useRef<AgGridReact>(null);
  const execGridRef = useRef<AgGridReact>(null);

  const { syncStates, cronLogs, messageCount24h, isLoading } = useAdminSyncStatus();
  const { data: companies } = useAdminCompanies();

  const companyMap = useMemo(() => {
    const map: Record<string, string> = {};
    companies?.forEach(c => { map[c.id] = c.name; });
    return map;
  }, [companies]);

  // Group sync states by company
  const companySyncRows = useMemo(() => {
    const map: Record<string, { comments?: SyncStateEntry; dms?: SyncStateEntry }> = {};
    for (const s of syncStates) {
      if (!map[s.company_id]) map[s.company_id] = {};
      if (s.sync_type === 'comments') map[s.company_id].comments = s;
      if (s.sync_type === 'dms') map[s.company_id].dms = s;
    }

    return Object.entries(map).map(([companyId, s]) => {
      const commentHealth = getSyncHealthStatus(s.comments?.last_synced_at || null);
      const dmHealth = getSyncHealthStatus(s.dms?.last_synced_at || null);
      const worstHealth = commentHealth.label === 'Error' || dmHealth.label === 'Error' ? 'Error'
        : commentHealth.label === 'Stale' || dmHealth.label === 'Stale' ? 'Stale' : 'Healthy';
      return {
        companyId,
        companyName: companyMap[companyId] || companyId.slice(0, 8),
        commentsLastSynced: s.comments?.last_synced_at || null,
        dmsLastSynced: s.dms?.last_synced_at || null,
        status: worstHealth,
      };
    });
  }, [syncStates, companyMap]);

  const companiesWithErrors = companySyncRows.filter(r => r.status === 'Error');
  const lastGlobalSync = cronLogs[0]?.created_at;

  // Column defs for per-company sync table
  const syncColDefs = useMemo<ColDef[]>(() => [
    { field: 'companyName', headerName: 'Company', flex: 1, minWidth: 150, filter: true },
    {
      field: 'commentsLastSynced', headerName: 'Comments Last Synced', width: 180,
      cellRenderer: (p: any) => p.value ? formatDistanceToNow(new Date(p.value), { addSuffix: true }) : 'Never',
    },
    {
      field: 'dmsLastSynced', headerName: 'DMs Last Synced', width: 180,
      cellRenderer: (p: any) => p.value ? formatDistanceToNow(new Date(p.value), { addSuffix: true }) : 'Never',
    },
    {
      field: 'status', headerName: 'Status', width: 120, filter: true,
      cellRenderer: (p: any) => {
        const variant = p.value === 'Healthy' ? 'default' : p.value === 'Stale' ? 'secondary' : 'destructive';
        return <Badge variant={variant as any}>{p.value}</Badge>;
      },
    },
  ], []);

  // Column defs for recent sync executions
  const execColDefs = useMemo<ColDef[]>(() => [
    {
      field: 'created_at', headerName: 'Time', width: 160,
      cellRenderer: (p: any) => format(new Date(p.value), 'MMM d, HH:mm:ss'),
    },
    {
      field: 'status', headerName: 'Status', width: 110, filter: true,
      cellRenderer: (p: any) => {
        const variant = p.value === 'success' ? 'default' : p.value === 'partial' ? 'secondary' : 'destructive';
        return <Badge variant={variant as any}>{p.value}</Badge>;
      },
    },
    {
      field: 'duration_ms', headerName: 'Duration', width: 110, type: 'numericColumn',
      cellRenderer: (p: any) => p.value != null ? `${p.value}ms` : '\u2014',
    },
    {
      field: 'details', headerName: 'Details', flex: 1, minWidth: 200,
      cellRenderer: (p: any) => {
        const d = p.value as Record<string, unknown> | null;
        if (!d) return '';
        if (d.totalNew != null) return `${d.totalNew} new, ${d.totalErrors} errors`;
        return JSON.stringify(d).slice(0, 100);
      },
    },
  ], []);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
    cellStyle: { display: 'flex', alignItems: 'center' },
  }), []);

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><RefreshCw className="h-5 w-5 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Server className="h-4 w-4" /> Companies Syncing
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{companySyncRows.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> Last Global Sync
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{lastGlobalSync ? formatDistanceToNow(new Date(lastGlobalSync), { addSuffix: true }) : 'Never'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Companies with Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${companiesWithErrors.length > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {companiesWithErrors.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Messages (24h)
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{messageCount24h}</p></CardContent>
        </Card>
      </div>

      {/* Per-company sync grid */}
      <Card>
        <CardHeader><CardTitle className="text-base">Per-Company Sync Status</CardTitle></CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <AgGridReact
              ref={syncGridRef}
              theme={isDark ? gridThemeDark : gridTheme}
              modules={[AllCommunityModule]}
              rowData={companySyncRows}
              columnDefs={syncColDefs}
              defaultColDef={defaultColDef}
              domLayout="autoHeight"
              suppressCellFocus
              getRowId={(p) => p.data.companyId}
            />
          </div>
        </CardContent>
      </Card>

      {/* Recent sync executions grid */}
      <Card>
        <CardHeader><CardTitle className="text-base">Recent Sync Executions</CardTitle></CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <AgGridReact
              ref={execGridRef}
              theme={isDark ? gridThemeDark : gridTheme}
              modules={[AllCommunityModule]}
              rowData={cronLogs.slice(0, 50)}
              columnDefs={execColDefs}
              defaultColDef={defaultColDef}
              domLayout="autoHeight"
              suppressCellFocus
              getRowId={(p) => p.data.id}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
