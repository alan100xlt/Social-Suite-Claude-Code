import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanies } from "@/hooks/useCompanies";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RefreshCw, Search, CheckCircle2, XCircle, Clock, ChevronLeft, ChevronRight, Sparkles, DollarSign, Building2 } from "lucide-react";
import { format } from "date-fns";

interface ApiLog {
  id: string;
  function_name: string;
  action: string;
  request_body: Record<string, unknown>;
  response_body: Record<string, unknown>;
  status_code: number | null;
  success: boolean;
  error_message: string | null;
  duration_ms: number | null;
  company_id: string | null;
  user_id: string | null;
  profile_id: string | null;
  account_ids: string[];
  platform: string | null;
  created_at: string;
}

const PAGE_SIZE = 50;

export default function ApiLogs() {
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [functionFilter, setFunctionFilter] = useState<string>("all");
  const [successFilter, setSuccessFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState<ApiLog | null>(null);

  const { data: companies } = useCompanies();
  const companyNameMap = new Map(companies?.map(c => [c.id, c.name]) || []);

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ["api-logs", companyFilter, functionFilter, successFilter, searchQuery, page],
    queryFn: async () => {
      let query = supabase
        .from("api_call_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (companyFilter !== "all") {
        query = query.eq("company_id", companyFilter);
      }
      if (functionFilter !== "all") {
        query = query.eq("function_name", functionFilter);
      }
      if (successFilter === "success") {
        query = query.eq("success", true);
      } else if (successFilter === "error") {
        query = query.eq("success", false);
      }
      if (searchQuery) {
        query = query.or(`action.ilike.%${searchQuery}%,error_message.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as ApiLog[];
    },
  });

  const functionNames = [
    { value: "all", label: "All Functions" },
    { value: "generate-social-post", label: "AI Generation" },
    { value: "getlate-posts", label: "Posts" },
    { value: "getlate-accounts", label: "Accounts" },
    { value: "getlate-analytics", label: "Analytics" },
    { value: "getlate-connect", label: "Connect" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">API Logs</h1>
            <p className="text-muted-foreground text-sm">All GetLate API calls with full request/response details</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search actions, errors..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              className="pl-9"
            />
          </div>
          {companies && companies.length > 1 && (
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
          <Select value={functionFilter} onValueChange={(v) => { setFunctionFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {functionNames.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={successFilter} onValueChange={(v) => { setSuccessFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="error">Errors</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Status</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Function</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Error</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading logs...
                  </TableCell>
                </TableRow>
              ) : !logs?.length ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No logs found. API calls will appear here once edge functions are deployed.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow
                    key={log.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedLog(log)}
                  >
                    <TableCell>
                      {log.success ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-destructive" />
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{log.company_id ? companyNameMap.get(log.company_id) || '—' : '—'}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {log.function_name === "generate-social-post" ? (
                          <span className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            AI {(log.action || "").replace("ai-", "")}
                          </span>
                        ) : (
                          log.function_name.replace("getlate-", "")
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{log.action}</TableCell>
                    <TableCell>
                      {log.platform && (
                        <Badge variant="secondary" className="text-xs capitalize">
                          {log.platform}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.duration_ms != null && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {log.duration_ms}ms
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      {log.error_message && (
                        <span className="text-xs text-destructive truncate block">
                          {log.error_message}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page + 1} • Showing {logs?.length || 0} results
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={(logs?.length || 0) < PAGE_SIZE} onClick={() => setPage(page + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedLog?.success ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-destructive" />
              )}
              {selectedLog?.function_name} → {selectedLog?.action}
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Timestamp</p>
                  <p className="font-mono">{format(new Date(selectedLog.created_at), "yyyy-MM-dd HH:mm:ss.SSS")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Duration</p>
                  <p className="font-mono">{selectedLog.duration_ms ?? "N/A"}ms</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status Code</p>
                  <p className="font-mono">{selectedLog.status_code ?? "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Platform</p>
                  <p className="capitalize">{selectedLog.platform || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Profile ID</p>
                  <p className="font-mono text-xs">{selectedLog.profile_id || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">User ID</p>
                  <p className="font-mono text-xs">{selectedLog.user_id || "N/A"}</p>
                </div>
                {selectedLog.account_ids?.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Account IDs</p>
                    <p className="font-mono text-xs break-all">{selectedLog.account_ids.join(", ")}</p>
                  </div>
                )}
              </div>

              {/* Token Usage & Cost (AI calls) */}
              {selectedLog.response_body?.token_usage && (
                <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
                  <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    AI Token Usage
                  </p>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Prompt</p>
                      <p className="font-mono font-medium">{(selectedLog.response_body.token_usage as Record<string, number>).prompt_tokens?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Completion</p>
                      <p className="font-mono font-medium">{(selectedLog.response_body.token_usage as Record<string, number>).completion_tokens?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Total</p>
                      <p className="font-mono font-medium">{(selectedLog.response_body.token_usage as Record<string, number>).total_tokens?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Est. Cost</p>
                      <p className="font-mono font-medium flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {selectedLog.response_body.estimated_cost_usd != null
                          ? `${(selectedLog.response_body.estimated_cost_usd as number).toFixed(6)}`
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedLog.error_message && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Error</p>
                  <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm font-mono break-all">
                    {selectedLog.error_message}
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-1">Request Body</p>
                <pre className="p-3 rounded-md bg-muted text-xs font-mono overflow-x-auto max-h-[200px]">
                  {JSON.stringify(selectedLog.request_body, null, 2)}
                </pre>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Response Body</p>
                <pre className="p-3 rounded-md bg-muted text-xs font-mono overflow-x-auto max-h-[200px]">
                  {JSON.stringify(selectedLog.response_body, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
