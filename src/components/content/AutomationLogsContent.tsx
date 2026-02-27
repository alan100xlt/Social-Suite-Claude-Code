import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RefreshCw, Search, CheckCircle2, XCircle, SkipForward, ChevronLeft, ChevronRight, ExternalLink, Building2 } from 'lucide-react';
import { useCompanies } from '@/hooks/useCompanies';
import { format } from 'date-fns';

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
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
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
        <Button variant="outline" size="sm" onClick={() => refetchLogs()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
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
  );
}
