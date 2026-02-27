import { Sparkles, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardBriefing } from "@/hooks/useDashboardBriefing";
import { useQueryClient } from "@tanstack/react-query";

export function DailyBriefing() {
  const { data: briefing, isLoading, error } = useDashboardBriefing();
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["dashboard-briefing"] });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 animate-fade-in relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 pointer-events-none" />
      <div className="relative flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-4.5 h-4.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className="font-display font-semibold text-sm text-card-foreground">
              Daily Briefing
            </h3>
            <button
              onClick={handleRefresh}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Refresh briefing"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : error ? (
            <p className="text-sm text-muted-foreground">
              Unable to generate briefing right now. Your data is still accessible below.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {briefing}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
