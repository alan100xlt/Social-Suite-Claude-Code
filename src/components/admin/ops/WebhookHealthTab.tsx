import { useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, type ColDef } from 'ag-grid-community';
import { gridTheme, gridThemeDark } from '@/lib/ag-grid-theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowRight, AlertTriangle, Lightbulb, Wrench, RefreshCw } from 'lucide-react';
import { useAdminSyncStatus, type CronHealthLog } from '@/hooks/useAdminSyncStatus';
import { useAdminCompanies } from '@/hooks/useAdminInboxData';
import { format, formatDistanceToNow } from 'date-fns';
import { diagnoseCronLog, type DiagnosedRow } from '@/lib/diagnose-error';

// ─── Component ────────────────────────────────────────────────

export function WebhookHealthTab() {
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark-pro' || currentTheme === 'aurora';
  const pipelineGridRef = useRef<AgGridReact>(null);
  const errorGridRef = useRef<AgGridReact>(null);

  const { syncStates, cronLogs, messageCount24h } = useAdminSyncStatus();
  const { data: companies } = useAdminCompanies();
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<DiagnosedRow | null>(null);

  const companyMap = useMemo(() => {
    const map: Record<string, string> = {};
    companies?.forEach(c => { map[c.id] = c.name; });
    return map;
  }, [companies]);

  // Pipeline status rows
  const pipelineRows = useMemo(() => {
    const map: Record<string, { lastCommentSync: string | null; lastDmSync: string | null }> = {};
    for (const s of syncStates) {
      if (!map[s.company_id]) map[s.company_id] = { lastCommentSync: null, lastDmSync: null };
      if (s.sync_type === 'comments') map[s.company_id].lastCommentSync = s.last_synced_at;
      if (s.sync_type === 'dms') map[s.company_id].lastDmSync = s.last_synced_at;
    }

    return Object.entries(map).map(([companyId, entry]) => {
      const commentAge = entry.lastCommentSync ? Date.now() - new Date(entry.lastCommentSync).getTime() : Infinity;
      const dmAge = entry.lastDmSync ? Date.now() - new Date(entry.lastDmSync).getTime() : Infinity;
      const gapDetected = commentAge > 30 * 60 * 1000 || dmAge > 30 * 60 * 1000;
      return {
        companyId,
        companyName: companyMap[companyId] || companyId.slice(0, 8),
        lastCommentSync: entry.lastCommentSync,
        lastDmSync: entry.lastDmSync,
        gapDetected,
      };
    });
  }, [syncStates, companyMap]);

  // Diagnosed error rows
  const diagnosedRows = useMemo(() => {
    const errorLogs = cronLogs.filter((log: CronHealthLog) => {
      const details = log.details as Record<string, unknown>;
      if (log.status === 'error' || log.status === 'partial') return true;
      if (details?.totalErrors && (details.totalErrors as number) > 0) return true;
      return false;
    });
    return errorLogs.slice(0, 20).flatMap(log => diagnoseCronLog(log, companyMap));
  }, [cronLogs, companyMap]);

  const companiesWithGaps = pipelineRows.filter(r => r.gapDetected);

  // Pipeline grid columns
  const pipelineColDefs = useMemo<ColDef[]>(() => [
    { field: 'companyName', headerName: 'Company', flex: 1, minWidth: 150, filter: true },
    {
      field: 'lastCommentSync', headerName: 'Last Comment Sync', width: 180,
      cellRenderer: (p: any) => p.value ? formatDistanceToNow(new Date(p.value), { addSuffix: true }) : 'Never',
    },
    {
      field: 'lastDmSync', headerName: 'Last DM Sync', width: 180,
      cellRenderer: (p: any) => p.value ? formatDistanceToNow(new Date(p.value), { addSuffix: true }) : 'Never',
    },
    {
      field: 'gapDetected', headerName: 'Gap Detected', width: 130, filter: true,
      cellRenderer: (p: any) => p.value
        ? <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Gap</Badge>
        : <Badge variant="default">OK</Badge>,
    },
  ], []);

  // Error grid columns
  const errorColDefs = useMemo<ColDef[]>(() => [
    {
      field: 'logTime', headerName: 'Time', width: 140,
      cellRenderer: (p: any) => format(new Date(p.value), 'MMM d, HH:mm:ss'),
    },
    {
      field: 'categoryLabel', headerName: 'Category', width: 140, filter: true,
      cellRenderer: (p: any) => <Badge variant="outline" className="gap-1 text-xs">{p.value}</Badge>,
    },
    {
      field: 'severity', headerName: 'Severity', width: 100, filter: true,
      cellRenderer: (p: any) => {
        const colors: Record<string, string> = {
          critical: 'text-red-500 bg-red-500/10 border-red-500/20',
          warning: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
          info: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
        };
        return <Badge className={`text-[10px] border ${colors[p.value] || ''}`} variant="outline">{p.value}</Badge>;
      },
    },
    { field: 'companyName', headerName: 'Company', width: 130, filter: true },
    { field: 'reason', headerName: 'Reason', flex: 1, minWidth: 200 },
    {
      field: 'autoResolvable', headerName: 'Auto-Resolve?', width: 120,
      cellRenderer: (p: any) => p.value
        ? <Badge variant="default" className="text-[10px] bg-green-600/10 text-green-600 border-green-600/20 border">Yes</Badge>
        : <Badge variant="destructive" className="text-[10px]">Manual</Badge>,
    },
  ], []);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
    cellStyle: { display: 'flex', alignItems: 'center' },
  }), []);

  return (
    <div className="space-y-6">
      {/* Pipeline overview */}
      <Card>
        <CardHeader><CardTitle className="text-base">Pipeline Overview</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-3 py-6 flex-wrap">
            <div className="text-center p-3 border rounded-lg bg-muted/50 min-w-[90px]">
              <p className="text-sm font-medium">pg_cron</p>
              <p className="text-xs text-muted-foreground mt-1">Every 5 min</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="text-center p-3 border rounded-lg bg-primary/5 border-primary/20 min-w-[110px]">
              <p className="text-sm font-medium">cron-dispatcher</p>
              <p className="text-xs text-muted-foreground mt-1">Fan-out</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="text-center p-3 border rounded-lg bg-muted/50 min-w-[90px]">
              <p className="text-sm font-medium">inbox-sync</p>
              <p className="text-xs text-muted-foreground mt-1">Per company</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="text-center p-3 border rounded-lg bg-muted/50 min-w-[90px]">
              <p className="text-sm font-medium">GetLate API</p>
              <p className="text-xs text-muted-foreground mt-1">External</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="text-center p-3 border rounded-lg bg-muted/50 min-w-[90px]">
              <p className="text-sm font-medium">Supabase</p>
              <p className="text-xs text-muted-foreground mt-1">{messageCount24h} msgs/24h</p>
            </div>
          </div>
          <div className="flex justify-center gap-6 text-sm">
            <div>Companies: <span className="font-medium">{pipelineRows.length}</span></div>
            <div>Gaps detected: <span className={`font-medium ${companiesWithGaps.length > 0 ? 'text-yellow-500' : 'text-green-500'}`}>{companiesWithGaps.length}</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Per-company pipeline status grid */}
      <Card>
        <CardHeader><CardTitle className="text-base">Per-Company Pipeline Status</CardTitle></CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <AgGridReact
              ref={pipelineGridRef}
              theme={isDark ? gridThemeDark : gridTheme}
              modules={[AllCommunityModule]}
              rowData={pipelineRows}
              columnDefs={pipelineColDefs}
              defaultColDef={defaultColDef}
              domLayout="autoHeight"
              suppressCellFocus
              getRowId={(p) => p.data.companyId}
            />
          </div>
        </CardContent>
      </Card>

      {/* Diagnosed error log grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4" /> Diagnosed Error Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <AgGridReact
              ref={errorGridRef}
              theme={isDark ? gridThemeDark : gridTheme}
              modules={[AllCommunityModule]}
              rowData={diagnosedRows}
              columnDefs={errorColDefs}
              defaultColDef={defaultColDef}
              domLayout="autoHeight"
              suppressCellFocus
              onRowClicked={(e) => setSelectedDiagnosis(e.data)}
              getRowId={(p) => p.data.id}
            />
          </div>
        </CardContent>
      </Card>

      {/* Diagnosis Detail Dialog */}
      <Dialog open={!!selectedDiagnosis} onOpenChange={() => setSelectedDiagnosis(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">Error Diagnosis</DialogTitle>
          </DialogHeader>
          {selectedDiagnosis && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Badge variant="outline">{selectedDiagnosis.categoryLabel}</Badge>
                <Badge className={`border ${
                  selectedDiagnosis.severity === 'critical' ? 'text-red-500 bg-red-500/10 border-red-500/20' :
                  selectedDiagnosis.severity === 'warning' ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20' :
                  'text-blue-500 bg-blue-500/10 border-blue-500/20'
                }`} variant="outline">{selectedDiagnosis.severity}</Badge>
                {selectedDiagnosis.autoResolvable
                  ? <Badge variant="default" className="bg-green-600/10 text-green-600 border-green-600/20 border">Auto-resolvable</Badge>
                  : <Badge variant="destructive">Requires manual action</Badge>
                }
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Raw Error</p>
                <pre className="text-xs bg-red-500/5 border border-red-500/10 p-3 rounded-lg whitespace-pre-wrap">{selectedDiagnosis.error}</pre>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Why This Happened
                </p>
                <p className="text-sm bg-muted p-3 rounded-lg">{selectedDiagnosis.reason}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Wrench className="h-3 w-3" /> Mitigation Strategy
                </p>
                <p className="text-sm bg-primary/5 border border-primary/10 p-3 rounded-lg">{selectedDiagnosis.mitigation}</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                <span>Time: {format(new Date(selectedDiagnosis.logTime), 'PPpp')}</span>
                {selectedDiagnosis.companyId && <span>Company: {selectedDiagnosis.companyName}</span>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
