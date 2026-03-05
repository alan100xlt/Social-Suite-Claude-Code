import { FileText, Send, Calendar, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PipelineStatsProps {
  articlesToday: number;
  postsGenerated: number;
  scheduled: number;
  published: number;
  needsAttention: number;
}

const stats = [
  { key: "articlesToday", label: "Articles Today", icon: FileText, color: "text-blue-500" },
  { key: "postsGenerated", label: "Posts Generated", icon: Send, color: "text-violet-500" },
  { key: "scheduled", label: "Scheduled", icon: Calendar, color: "text-sky-500" },
  { key: "published", label: "Published", icon: CheckCircle2, color: "text-emerald-500" },
  { key: "needsAttention", label: "Needs Attention", icon: AlertTriangle, color: "text-amber-500" },
] as const;

export function PipelineStats(props: PipelineStatsProps) {
  return (
    <div className="flex items-center gap-4 border-b px-4 py-2">
      {stats.map(({ key, label, icon: Icon, color }) => (
        <div key={key} className="flex items-center gap-1.5">
          <Icon className={cn("h-3.5 w-3.5", color)} />
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="text-sm font-semibold">{props[key]}</span>
        </div>
      ))}
    </div>
  );
}
