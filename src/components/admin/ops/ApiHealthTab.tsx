import { useState, useMemo, useRef, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, type ColDef } from 'ag-grid-community';
import { gridTheme, gridThemeDark } from '@/lib/ag-grid-theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DataGridToolbar } from '@/components/ui/data-grid-toolbar';
import { Activity, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAdminApiHealth, useAdminApiHealthSummary } from '@/hooks/useAdminSyncStatus';
import { useAdminCompanies } from '@/hooks/useAdminInboxData';
import { format } from 'date-fns';

export function ApiHealthTab() {
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark-pro' || currentTheme === 'aurora';
  const gridRef = useRef<AgGridReact>(null);

  const [functionFilter, setFunctionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [page, setPage] = useState(0);
  const [quickFilter, setQuickFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<Record<string, unknown> | null>(null);

  const { data: companies } = useAdminCompanies();
  const { data: summary } = useAdminApiHealthSummary();
  const { data: logs, isLoading } = useAdminApiHealth(
    functionFilter || undefined,
    undefined,
    statusFilter || undefined,
    companyFilter || undefined,
    page
  );

  const companyMap = useMemo(() => {
    const map: Record<string, string> = {};
    companies?.forEach(c => { map[c.id] = c.name; });
    return map;
  }, [companies]);

  const columnDefs = useMemo<ColDef[]>(() => [
    {
      field: 'success', headerName: 'Status', width: 90,
      cellRenderer: (p: any) =>
        p.value ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />,
    },
    {
      field: 'company_id', headerName: 'Company', width: 150, filter: true,
      cellRenderer: (p: any) => companyMap[p.value] || (p.value?.slice(0, 8) || '\u2014'),
    },
    {
      field: 'function_name', headerName: 'Function', width: 140, filter: true,
      cellRenderer: (p: any) => <Badge variant="outline" className="text-xs">{p.value}</Badge>,
    },
    { field: 'action', headerName: 'Action', width: 140, filter: true, cellClass: 'font-mono text-xs' },
    {
      field: 'platform', headerName: 'Platform', width: 110, filter: true,
      cellRenderer: (p: any) => p.value ? <Badge variant="secondary" className="text-xs">{p.value}</Badge> : '\u2014',
    },
    {
      field: 'duration_ms', headerName: 'Duration', width: 100, type: 'numericColumn',
      cellRenderer: (p: any) => p.value != null ? `${p.value}ms` : '\u2014',
    },
    {
      field: 'response_summary', headerName: 'Error', flex: 1, minWidth: 180,
      cellRenderer: (p: any) => {
        if (p.data?.success) return '';
        const msg = String(p.value || '').slice(0, 80);
        return <span className="text-red-500 text-xs">{msg}</span>;
      },
    },
    {
      field: 'created_at', headerName: 'Time', width: 150,
      cellRenderer: (p: any) => p.value ? format(new Date(p.value), 'MMM d, HH:mm:ss') : '',
    },
  ], [companyMap]);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
    cellStyle: { display: 'flex', alignItems: 'center' },
  }), []);

  const onExportCsv = useCallback(() => {
    gridRef.current?.api?.exportDataAsCsv({ fileName: 'api-health-export.csv' });
  }, []);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" /> Total Calls (24h)
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{summary?.total || 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${(summary?.successRate || 100) >= 95 ? 'text-green-500' : 'text-yellow-500'}`}>
              {summary?.successRate || 100}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" /> Avg Latency
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{summary?.avgLatency || 0}ms</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4" /> Errors (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${(summary?.errors || 0) > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {summary?.errors || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={functionFilter || 'all'} onValueChange={(v) => { setFunctionFilter(v === 'all' ? '' : v); setPage(0); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Function" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All functions</SelectItem>
            <SelectItem value="getlate-inbox">getlate-inbox</SelectItem>
            <SelectItem value="inbox-sync">inbox-sync</SelectItem>
            <SelectItem value="inbox-ai">inbox-ai</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter || 'all'} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(0); }}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>

        <Select value={companyFilter || 'all'} onValueChange={(v) => { setCompanyFilter(v === 'all' ? '' : v); setPage(0); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Company" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All companies</SelectItem>
            {companies?.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Toolbar + Grid */}
      <DataGridToolbar
        quickFilter={quickFilter}
        onQuickFilterChange={setQuickFilter}
        onExport={onExportCsv}
        quickFilterPlaceholder="Search API logs..."
      />

      <div className="border rounded-lg">
        <AgGridReact
          ref={gridRef}
          theme={isDark ? gridThemeDark : gridTheme}
          modules={[AllCommunityModule]}
          rowData={logs || []}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          quickFilterText={quickFilter}
          domLayout="autoHeight"
          suppressCellFocus
          animateRows
          loading={isLoading}
          onRowClicked={(e) => setSelectedLog(e.data)}
          getRowId={(p) => p.data.id}
        />
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
          <ChevronLeft className="h-4 w-4" /> Prev
        </Button>
        <span className="text-sm py-1 px-2">Page {page + 1}</span>
        <Button variant="outline" size="sm" disabled={(logs?.length || 0) < 50} onClick={() => setPage(p => p + 1)}>
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>API Call Detail</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Function:</span> {selectedLog?.function_name as string}</div>
              <div><span className="text-muted-foreground">Action:</span> {selectedLog?.action as string}</div>
              <div><span className="text-muted-foreground">Status:</span> {selectedLog?.success ? 'Success' : 'Error'}</div>
              <div><span className="text-muted-foreground">Duration:</span> {selectedLog?.duration_ms as number}ms</div>
              <div><span className="text-muted-foreground">Company:</span> {companyMap[selectedLog?.company_id as string] || (selectedLog?.company_id as string)}</div>
              <div><span className="text-muted-foreground">Time:</span> {selectedLog?.created_at ? format(new Date(selectedLog.created_at as string), 'PPpp') : ''}</div>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Request</p>
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-40">{selectedLog?.request_summary as string}</pre>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Response</p>
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-40">{selectedLog?.response_summary as string}</pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
