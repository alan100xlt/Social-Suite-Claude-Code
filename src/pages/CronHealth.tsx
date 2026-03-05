import { useMemo, useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  type ColDef,
  type ICellRendererParams,
  type GridReadyEvent,
} from "ag-grid-community";
import { gridTheme, gridThemeDark } from "@/lib/ag-grid-theme";
import { useTheme } from "@/contexts/ThemeContext";
import { DataGridToolbar } from "@/components/ui/data-grid-toolbar";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Timer,
  Pencil,
  Play,
  Power,
  PowerOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CronJobSetting {
  id: string;
  job_name: string;
  schedule: string;
  edge_function: string;
  description: string;
  enabled: boolean;
  updated_at: string;
}

interface CronLog {
  id: string;
  job_name: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface JobSummary extends CronJobSetting {
  lastRun: CronLog | null;
  totalRuns: number;
  successRate: number | null;
  avgDuration: number | null;
}

const COMMON_SCHEDULES: { label: string; value: string }[] = [
  { label: "Every minute", value: "* * * * *" },
  { label: "Every 5 min", value: "*/5 * * * *" },
  { label: "Every 15 min", value: "*/15 * * * *" },
  { label: "Every 30 min", value: "*/30 * * * *" },
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Daily at midnight", value: "0 0 * * *" },
  { label: "Daily at 9am UTC", value: "0 9 * * *" },
  { label: "Weekly (Mon 9am)", value: "0 9 * * 1" },
];

function formatSchedule(cron: string): string {
  const match = COMMON_SCHEDULES.find((s) => s.value === cron);
  if (match) return match.label;
  return cron;
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

async function callAdminCron(action: string, params: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-cron`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action, ...params }),
    }
  );

  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }
  return data;
}

export default function CronHealth() {
  const [editJob, setEditJob] = useState<CronJobSetting | null>(null);
  const [editSchedule, setEditSchedule] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [quickFilterJobs, setQuickFilterJobs] = useState("");
  const [quickFilterLogs, setQuickFilterLogs] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentTheme } = useTheme();
  const isDark = currentTheme === "dark-pro" || currentTheme === "aurora";

  const jobsGridRef = useRef<AgGridReact<JobSummary>>(null);
  const logsGridRef = useRef<AgGridReact<CronLog>>(null);

  const { data: jobSettings, error: jobsError } = useQuery({
    queryKey: ["cron-job-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cron_job_settings")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data as CronJobSetting[];
    },
  });

  const { data: logs, isLoading, error: logsError } = useQuery({
    queryKey: ["cron-health-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cron_health_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as CronLog[];
    },
    refetchInterval: 30000,
  });

  const updateMutation = useMutation({
    mutationFn: (params: { jobName: string; schedule?: string; enabled?: boolean; description?: string }) =>
      callAdminCron("update", params),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cron-job-settings"] });
      toast({ title: "Job updated", description: `${variables.jobName} settings saved.` });
      setEditJob(null);
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const triggerMutation = useMutation({
    mutationFn: (jobName: string) => callAdminCron("trigger", { jobName }),
    onSuccess: (_data, jobName) => {
      toast({ title: "Job triggered", description: `${jobName} has been queued.` });
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["cron-health-logs"] }), 3000);
    },
    onError: (error: Error) => {
      toast({ title: "Trigger failed", description: error.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ jobName, enabled }: { jobName: string; enabled: boolean }) =>
      callAdminCron("update", { jobName, enabled }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cron-job-settings"] });
      toast({
        title: variables.enabled ? "Job enabled" : "Job disabled",
        description: `${variables.jobName} is now ${variables.enabled ? "active" : "paused"}.`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Toggle failed", description: error.message, variant: "destructive" });
    },
  });

  const jobSummaries = useMemo<JobSummary[]>(() => {
    const jobs = jobSettings || [];
    if (!logs) return jobs.map((job) => ({ ...job, lastRun: null, totalRuns: 0, successRate: null, avgDuration: null }));

    const byJob = new Map<string, CronLog[]>();
    for (const log of logs) {
      const arr = byJob.get(log.job_name) || [];
      arr.push(log);
      byJob.set(log.job_name, arr);
    }

    return jobs.map((job) => {
      const jobLogs = byJob.get(job.job_name) || [];
      const lastRun = jobLogs[0] ?? null;
      const recent = jobLogs.slice(0, 20);
      const successes = recent.filter((l) => l.status === "success").length;
      const successRate = recent.length > 0 ? Math.round((successes / recent.length) * 100) : null;
      const avgDuration =
        recent.length > 0
          ? Math.round(recent.reduce((sum, l) => sum + (l.duration_ms ?? 0), 0) / recent.length)
          : null;

      return { ...job, lastRun, totalRuns: jobLogs.length, successRate, avgDuration };
    });
  }, [jobSettings, logs]);

  const openEditDialog = (job: CronJobSetting) => {
    setEditJob(job);
    setEditSchedule(job.schedule);
    setEditDescription(job.description);
  };

  const handleSaveEdit = () => {
    if (!editJob) return;
    updateMutation.mutate({
      jobName: editJob.job_name,
      schedule: editSchedule !== editJob.schedule ? editSchedule : undefined,
      description: editDescription !== editJob.description ? editDescription : undefined,
    });
  };

  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.sizeColumnsToFit();
  }, []);

  const onExportJobs = useCallback(() => {
    jobsGridRef.current?.api?.exportDataAsCsv({ fileName: "cron-jobs.csv" });
  }, []);

  const onExportLogs = useCallback(() => {
    logsGridRef.current?.api?.exportDataAsCsv({ fileName: "cron-logs.csv" });
  }, []);

  // -- Column Defs: Jobs Summary --
  const jobColDefs = useMemo<ColDef<JobSummary>[]>(
    () => [
      {
        headerName: "Job Name",
        field: "job_name",
        flex: 1,
        minWidth: 160,
        cellClass: "font-mono text-sm",
        filter: "agTextColumnFilter",
      },
      {
        headerName: "Schedule",
        field: "schedule",
        width: 140,
        cellRenderer: (params: ICellRendererParams<JobSummary>) => (
          <span className="text-sm text-muted-foreground" title={params.value}>
            {formatSchedule(params.value)}
          </span>
        ),
        filter: "agTextColumnFilter",
      },
      {
        headerName: "Description",
        field: "description",
        flex: 1,
        minWidth: 150,
        cellClass: "text-sm text-muted-foreground",
        filter: "agTextColumnFilter",
      },
      {
        headerName: "Last Run",
        field: "lastRun",
        width: 130,
        cellRenderer: (params: ICellRendererParams<JobSummary>) => {
          const lastRun = params.data?.lastRun;
          if (!lastRun) return <span className="text-muted-foreground text-sm">Never</span>;
          return (
            <span className="text-sm" title={format(new Date(lastRun.started_at), "MMM d, yyyy HH:mm:ss")}>
              {formatDistanceToNow(new Date(lastRun.started_at), { addSuffix: true })}
            </span>
          );
        },
        comparator: (a: CronLog | null, b: CronLog | null) => {
          const ta = a ? new Date(a.started_at).getTime() : 0;
          const tb = b ? new Date(b.started_at).getTime() : 0;
          return ta - tb;
        },
      },
      {
        headerName: "Avg Duration",
        field: "avgDuration",
        width: 120,
        cellRenderer: (params: ICellRendererParams<JobSummary>) => {
          const avg = params.data?.avgDuration;
          if (avg == null) return <span className="text-muted-foreground text-sm">—</span>;
          return (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Timer className="w-3 h-3" />
              {formatDuration(avg)}
            </span>
          );
        },
        filter: "agNumberColumnFilter",
      },
      {
        headerName: "Success Rate",
        field: "successRate",
        width: 110,
        cellRenderer: (params: ICellRendererParams<JobSummary>) => {
          const rate = params.data?.successRate;
          if (rate == null) return <span className="text-sm text-muted-foreground">—</span>;
          const color = rate >= 90 ? "text-green-600" : rate >= 50 ? "text-yellow-600" : "text-red-600";
          return <span className={`text-sm font-medium ${color}`}>{rate}%</span>;
        },
        filter: "agNumberColumnFilter",
      },
      {
        headerName: "Status",
        field: "enabled",
        width: 110,
        cellRenderer: (params: ICellRendererParams<JobSummary>) => {
          const job = params.data;
          if (!job) return null;
          if (!job.enabled) {
            return (
              <Badge variant="outline" className="text-muted-foreground">
                <PowerOff className="w-3 h-3 mr-1" />Disabled
              </Badge>
            );
          }
          if (!job.lastRun) {
            return (
              <Badge variant="outline" className="text-muted-foreground">
                <Clock className="w-3 h-3 mr-1" />Pending
              </Badge>
            );
          }
          if (job.lastRun.status === "success") {
            return (
              <Badge variant="default" className="bg-green-600/10 text-green-600 border-0">
                <CheckCircle2 className="w-3 h-3 mr-1" />Healthy
              </Badge>
            );
          }
          if (job.lastRun.status === "running") {
            return (
              <Badge variant="secondary">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />Running
              </Badge>
            );
          }
          return (
            <Badge variant="destructive">
              <AlertTriangle className="w-3 h-3 mr-1" />Failed
            </Badge>
          );
        },
        filter: "agTextColumnFilter",
        filterValueGetter: (params) => {
          const job = params.data;
          if (!job?.enabled) return "disabled";
          if (!job.lastRun) return "pending";
          return job.lastRun.status === "success" ? "healthy" : job.lastRun.status;
        },
      },
      {
        headerName: "Actions",
        width: 120,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        pinned: "right",
        cellRenderer: (params: ICellRendererParams<JobSummary>) => {
          const job = params.data;
          if (!job) return null;
          return (
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title={job.enabled ? "Disable job" : "Enable job"}
                onClick={() => toggleMutation.mutate({ jobName: job.job_name, enabled: !job.enabled })}
                disabled={toggleMutation.isPending}
              >
                {job.enabled ? <Power className="w-3.5 h-3.5 text-green-600" /> : <PowerOff className="w-3.5 h-3.5 text-muted-foreground" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Edit schedule"
                onClick={() => openEditDialog(job)}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Run now"
                onClick={() => triggerMutation.mutate(job.job_name)}
                disabled={triggerMutation.isPending}
              >
                <Play className="w-3.5 h-3.5" />
              </Button>
            </div>
          );
        },
      },
    ],
    [toggleMutation, triggerMutation]
  );

  // -- Column Defs: Recent Executions --
  const logColDefs = useMemo<ColDef<CronLog>[]>(
    () => [
      {
        headerName: "Job",
        field: "job_name",
        flex: 1,
        minWidth: 160,
        cellClass: "font-mono text-sm",
        filter: "agTextColumnFilter",
      },
      {
        headerName: "Status",
        field: "status",
        width: 110,
        cellRenderer: (params: ICellRendererParams<CronLog>) => {
          const status = params.value as string;
          const variant = status === "success" ? "default" : status === "running" ? "secondary" : "destructive";
          return (
            <Badge variant={variant} className="capitalize">
              {status === "error" && <AlertTriangle className="w-3 h-3 mr-1" />}
              {status}
            </Badge>
          );
        },
        filter: "agTextColumnFilter",
      },
      {
        headerName: "Started",
        field: "started_at",
        width: 160,
        cellRenderer: (params: ICellRendererParams<CronLog>) => (
          <span className="text-sm text-muted-foreground">
            {format(new Date(params.value), "MMM d, HH:mm:ss")}
          </span>
        ),
        sort: "desc",
        filter: "agDateColumnFilter",
      },
      {
        headerName: "Duration",
        field: "duration_ms",
        width: 110,
        cellRenderer: (params: ICellRendererParams<CronLog>) => (
          <span className="text-sm text-muted-foreground">{formatDuration(params.value)}</span>
        ),
        filter: "agNumberColumnFilter",
      },
      {
        headerName: "Error",
        field: "error_message",
        flex: 1,
        minWidth: 150,
        cellClass: "text-sm text-destructive",
        cellRenderer: (params: ICellRendererParams<CronLog>) => (
          <span className="truncate" title={params.value || undefined}>
            {params.value || "—"}
          </span>
        ),
        filter: "agTextColumnFilter",
      },
    ],
    []
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      resizable: true,
      cellStyle: { display: "flex", alignItems: "center", overflow: "hidden" },
    }),
    []
  );

  const jobRowClassRules = useMemo(() => ({
    "opacity-50": (params: { data?: JobSummary }) => !params.data?.enabled,
  }), []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cron Health</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor and manage cron job schedules and executions
          </p>
        </div>

        {(jobsError || logsError) && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="py-3">
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <div>
                  {jobsError && <p>Failed to load job settings: {jobsError.message}</p>}
                  {logsError && <p>Failed to load health logs: {logsError.message}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Registered Cron Jobs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registered Cron Jobs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <DataGridToolbar
                  quickFilter={quickFilterJobs}
                  onQuickFilterChange={setQuickFilterJobs}
                  onExport={onExportJobs}
                  quickFilterPlaceholder="Search jobs..."
                />
                <div className="relative">
                  <style>{`.ag-cell-wrapper { width: 100%; } .ag-cell-value { width: 100%; }`}</style>
                  <AgGridReact<JobSummary>
                    ref={jobsGridRef}
                    theme={isDark ? gridThemeDark : gridTheme}
                    modules={[AllCommunityModule]}
                    rowData={jobSummaries}
                    columnDefs={jobColDefs}
                    defaultColDef={defaultColDef}
                    quickFilterText={quickFilterJobs}
                    domLayout="autoHeight"
                    suppressCellFocus
                    animateRows
                    onGridReady={onGridReady}
                    rowClassRules={jobRowClassRules}
                    getRowId={(params) => params.data.job_name}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Executions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Executions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : !logs?.length ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Clock className="w-10 h-10 mb-3" />
                <p className="text-sm">No cron executions logged yet</p>
              </div>
            ) : (
              <>
                <DataGridToolbar
                  quickFilter={quickFilterLogs}
                  onQuickFilterChange={setQuickFilterLogs}
                  onExport={onExportLogs}
                  quickFilterPlaceholder="Search logs..."
                />
                <div className="relative">
                  <AgGridReact<CronLog>
                    ref={logsGridRef}
                    theme={isDark ? gridThemeDark : gridTheme}
                    modules={[AllCommunityModule]}
                    rowData={logs}
                    columnDefs={logColDefs}
                    defaultColDef={defaultColDef}
                    quickFilterText={quickFilterLogs}
                    domLayout="autoHeight"
                    pagination
                    paginationPageSize={25}
                    paginationPageSizeSelector={[10, 25, 50, 100]}
                    suppressCellFocus
                    animateRows
                    onGridReady={onGridReady}
                    getRowId={(params) => params.data.id}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Schedule Dialog */}
      <Dialog open={!!editJob} onOpenChange={(open) => !open && setEditJob(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Cron Job</DialogTitle>
          </DialogHeader>
          {editJob && (
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-sm text-muted-foreground">Job Name</Label>
                <p className="font-mono text-sm mt-1">{editJob.job_name}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Edge Function</Label>
                <p className="font-mono text-sm mt-1">{editJob.edge_function}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="schedule">Schedule (cron expression)</Label>
                <div className="flex gap-2">
                  <Input
                    id="schedule"
                    value={editSchedule}
                    onChange={(e) => setEditSchedule(e.target.value)}
                    placeholder="0 9 * * *"
                    className="font-mono"
                  />
                  <Select onValueChange={setEditSchedule}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Presets..." />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_SCHEDULES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  Current: {formatSchedule(editJob.schedule)} ({editJob.schedule})
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={editJob.enabled} disabled />
                <Label className="text-sm text-muted-foreground">
                  {editJob.enabled ? "Enabled" : "Disabled"} (use toggle button in table)
                </Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditJob(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending || (editSchedule === editJob?.schedule && editDescription === editJob?.description)}
            >
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
