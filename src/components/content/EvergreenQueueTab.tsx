import { Recycle, Clock, Check, X, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { useEvergreenQueue, useSkipEvergreenItem } from "@/hooks/useEvergreenQueue";
import { FeatureGate } from "@/components/auth/FeatureGate";

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: "Pending", icon: Clock, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  published: { label: "Published", icon: Check, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  skipped: { label: "Skipped", icon: SkipForward, color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  failed: { label: "Failed", icon: X, color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

export function EvergreenQueueTab() {
  const { data: items = [], isLoading } = useEvergreenQueue();
  const skipItem = useSkipEvergreenItem();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <FeatureGate
      feature="evergreen_recycling"
      fallback={
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Recycle className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <h4 className="font-medium text-muted-foreground">Evergreen Recycling</h4>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Upgrade to Pro to automatically recycle your best-performing evergreen content.
          </p>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Recycle className="h-5 w-5 text-emerald-500" />
            Evergreen Queue
          </h3>
          <p className="text-sm text-muted-foreground">
            AI-generated variations of your top-performing evergreen content, ready for republishing.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <Recycle className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <h4 className="font-medium text-muted-foreground">Queue empty</h4>
            <p className="text-sm text-muted-foreground/70 mt-1">
              The recycler will populate this queue with content variations on its next run.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const sc = statusConfig[item.status] || statusConfig.pending;
              const StatusIcon = sc.icon;
              return (
                <div key={item.id} className="rounded-lg border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {item.article_title && (
                        <p className="text-xs text-muted-foreground mb-1">
                          From: {item.article_title}
                        </p>
                      )}
                      <p className="text-sm leading-relaxed">{item.variation_text}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {item.scheduled_for && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(parseISO(item.scheduled_for), "MMM d, h:mm a")}
                          </span>
                        )}
                        <span>{format(parseISO(item.created_at), "MMM d")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-[10px]", sc.color)}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {sc.label}
                      </Badge>
                      {item.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => skipItem.mutate(item.id)}
                        >
                          Skip
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </FeatureGate>
  );
}
