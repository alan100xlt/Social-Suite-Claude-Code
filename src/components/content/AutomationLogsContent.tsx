import { useState, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RefreshCw, CheckCircle2, XCircle, SkipForward, ChevronLeft, ChevronRight, ExternalLink, Building2 } from 'lucide-react';
import { useCompanies } from '@/hooks/useCompanies';
import { format } from 'date-fns';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, type ColDef, type ICellRendererParams, type GridReadyEvent, type RowClickedEvent } from 'ag-grid-community';
import { gridTheme, gridThemeDark } from '@/lib/ag-grid-theme';
import { useTheme } from '@/contexts/ThemeContext';
import { DataGridToolbar } from '@/components/ui/data-grid-toolbar';

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

export function AutomationLogsContent() {
  const { isSuperAdmin } = useAuth();
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark-pro' || currentTheme === 'aurora';

  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [resultFilter, setResultFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [quickFilter, setQuickFilter] = useState("");
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AutomationLog | null>(null);
  const gridRef = useRef<AgGridReact<AutomationLog>>(null);

  const { data: companies } = useCompanies();
  const companyNameMap = useMemo(
    () => new Map(companies?.map(c => [c.id, c.name]) || []),
    [companies]
  );

  const { data: logs, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ["automation-logs", companyFilter, resultFilter, actionFilter, page],
    queryFn: async () => {
      let query = supabase
        .from("automation_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (companyFilter !== "all") query = query.eq("company_id", companyFilter);
      if (resultFilter !== "all") query = query.eq("result", resultFilter);
      if (actionFilter !== "all") query = query.eq("action", actionFilter);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as AutomationLog[];
    },
  });

  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.sizeColumnsToFit();
  }, []);

  const onExportCsv = useCallback(() => {
    gridRef.current?.api?.exportDataAsCsv({ fileName: 'automation-logs.csv' });
  }, []);

  const onRowClicked = useCallback((event: RowClickedEvent<AutomationLog>) => {
    if (event.data) setSelectedLog(event.data);
  }, []);

  const colDefs = useMemo<ColDef<AutomationLog>[]>(() => {
    const cols: ColDef<AutomationLog>[] = [
      {
        headerName: 'Result',
        field: 'result',
        width: 80,
        cellRenderer: (params: ICellRendererParams<AutomationLog>) => {
          const config = resultConfig[params.value as keyof typeof resultConfig] || resultConfig.error;
          const ResultIcon = config.icon;
          return <ResultIcon className={`w-4 h-4 ${config.className}`} />;
        },
        filter: 'agTextColumnFilter',
      },
    ];

    if (isSuperAdmin) {
      cols.push({
        headerName: 'Company',
        width: 140,
        cellRenderer: (params: ICellRendererParams<AutomationLog>) => (
          <span className="text-xs text-muted-foreground">
            {companyNameMap.get(params.data?.company_id || '') || '\u2014'}
          </span>
        ),
        filterValueGetter: (params) => companyNameMap.get(params.data?.company_id || '') || '',
        filter: 'agTextColumnFilter',
      });
    }

    cols.push(
      {
        headerName: 'Rule',
        field: 'rule_name',
        flex: 1,
        minWidth: 140,
        cellRenderer: (params: ICellRendererParams<AutomationLog>) => (
          <span className="text-sm font-medium">{params.value}</span>
        ),
        filter: 'agTextColumnFilter',
      },
      {
        headerName: 'Article',
        field: 'article_title',
        flex: 2,
        minWidth: 200,
        cellRenderer: (params: ICellRendererParams<AutomationLog>) => (
          params.value
            ? <span className="text-sm truncate block" title={params.value}>{params.value}</span>
            : <span className="text-xs text-muted-foreground">{'\u2014'}</span>
        ),
        filter: 'agTextColumnFilter',
      },
      {
        headerName: 'Action',
        field: 'action',
        width: 150,
        cellRenderer: (params: ICellRendererParams<AutomationLog>) => (
          <Badge variant="outline" className="text-xs">
            {actionLabels[params.value] || params.value}
          </Badge>
        ),
        filter: 'agTextColumnFilter',
        filterValueGetter: (params) => actionLabels[params.data?.action || ''] || params.data?.action || '',
      },
      {
        headerName: 'Error',
        field: 'error_message',
        flex: 1,
        minWidth: 150,
        cellRenderer: (params: ICellRendererParams<AutomationLog>) => (
          params.value
            ? <span className="text-xs text-destructive truncate block">{params.value}</span>
            : null
        ),
        filter: 'agTextColumnFilter',
      },
      {
        headerName: 'Time',
        field: 'created_at',
        width: 130,
        cellRenderer: (params: ICellRendererParams<AutomationLog>) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {format(new Date(params.value), "MMM d, HH:mm:ss")}
          </span>
        ),
        comparator: (a: string, b: string) => new Date(a).getTime() - new Date(b).getTime(),
      },
    );

    return cols;
  }, [isSuperAdmin, companyNameMap]);

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
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <DataGridToolbar
          quickFilter={quickFilter}
          onQuickFilterChange={setQuickFilter}
          onExport={onExportCsv}
          quickFilterPlaceholder="Search rules, articles, errors..."
        />
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
        <Button variant="outline" size="sm" onClick={() => refetchLogs()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* AG Grid */}
      {logsLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">Loading logs...</div>
      ) : (
        <div className="relative">
          <style>{`.ag-cell-wrapper { width: 100%; } .ag-cell-value { width: 100%; }`}</style>
          <AgGridReact<AutomationLog>
            ref={gridRef}
            theme={isDark ? gridThemeDark : gridTheme}
            modules={[AllCommunityModule]}
            rowData={logs || []}
            columnDefs={colDefs}
            defaultColDef={defaultColDef}
            quickFilterText={quickFilter}
            domLayout="autoHeight"
            suppressCellFocus
            animateRows
            onGridReady={onGridReady}
            onRowClicked={onRowClicked}
            getRowId={(params) => params.data.id}
            overlayNoRowsTemplate="No automation logs yet. Logs will appear here when automation rules are triggered by RSS feed polls."
          />
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Page {page + 1} &bull; Showing {logs?.length || 0} results</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" disabled={(logs?.length || 0) < PAGE_SIZE} onClick={() => setPage(page + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

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
              {selectedLog?.rule_name} &rarr; {actionLabels[selectedLog?.action || ""] || selectedLog?.action}
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
  );
}
