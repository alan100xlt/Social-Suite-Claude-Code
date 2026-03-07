import { CheckCircle2, AlertTriangle, XCircle, Shield, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QualityCheckResult } from "@/hooks/useQualityCheck";

interface QualityCheckPanelProps {
  result: QualityCheckResult | null;
  isLoading: boolean;
}

const statusIcons = {
  pass: CheckCircle2,
  warn: AlertTriangle,
  fail: XCircle,
};

const statusColors = {
  pass: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  fail: "text-red-600 dark:text-red-400",
};

const statusBg = {
  pass: "bg-emerald-50 dark:bg-emerald-950/20",
  warn: "bg-amber-50 dark:bg-amber-950/20",
  fail: "bg-red-50 dark:bg-red-950/20",
};

const typeLabels = {
  brand_voice: "Brand Voice",
  platform_rules: "Platform Rules",
  sensitivity: "Sensitivity",
};

export function QualityCheckPanel({ result, isLoading }: QualityCheckPanelProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-md border p-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Running quality checks...
      </div>
    );
  }

  if (!result) return null;

  const OverallIcon = statusIcons[result.overall];

  return (
    <div className={cn("rounded-md border p-3 space-y-2", statusBg[result.overall])}>
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Quality Check</span>
        <OverallIcon className={cn("h-4 w-4 ml-auto", statusColors[result.overall])} />
      </div>
      <div className="space-y-1.5">
        {result.checks.map((check, i) => {
          const Icon = statusIcons[check.status];
          return (
            <div key={i} className="flex items-start gap-2">
              <Icon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", statusColors[check.status])} />
              <div className="min-w-0">
                <span className="text-xs font-medium">{typeLabels[check.type]}: </span>
                <span className="text-xs text-muted-foreground">{check.message}</span>
              </div>
            </div>
          );
        })}
      </div>
      {result.overall === 'fail' && (
        <p className="text-xs text-red-600 dark:text-red-400 font-medium">
          Publishing is blocked until issues are resolved.
        </p>
      )}
    </div>
  );
}
