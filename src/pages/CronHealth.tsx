import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { AlertTriangle, Clock, Loader2 } from "lucide-react";

export default function CronHealth() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["cron-health-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cron_health_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cron Health</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor cron job executions and failures
          </p>
        </div>

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
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.job_name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          log.status === "success"
                            ? "default"
                            : log.status === "running"
                            ? "secondary"
                            : "destructive"
                        }
                        className="capitalize"
                      >
                        {log.status === "error" && (
                          <AlertTriangle className="w-3 h-3 mr-1" />
                        )}
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(log.started_at), "MMM d, HH:mm:ss")}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {log.duration_ms != null ? `${log.duration_ms}ms` : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-destructive max-w-xs truncate">
                      {log.error_message || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
