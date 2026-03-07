import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCrossOutletAnalytics, type OutletMetric } from "@/hooks/useCrossOutletAnalytics";

interface CrossOutletAnalyticsProps {
  mediaCompanyId: string | null;
}

export function CrossOutletAnalytics({ mediaCompanyId }: CrossOutletAnalyticsProps) {
  const { data: metrics = [], isLoading } = useCrossOutletAnalytics(mediaCompanyId);

  // Group metrics by company
  const outletSummaries = useMemo(() => {
    const map = new Map<string, { name: string; metrics: Record<string, number> }>();

    metrics.forEach((m) => {
      if (!map.has(m.company_id)) {
        map.set(m.company_id, { name: m.company_name, metrics: {} });
      }
      const entry = map.get(m.company_id)!;
      // Sum metric values (they may span multiple dates)
      entry.metrics[m.metric_name] = (entry.metrics[m.metric_name] || 0) + m.metric_value;
    });

    return Array.from(map.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      followers: data.metrics['followers'] || 0,
      engagement: data.metrics['engagement'] || 0,
      posts: data.metrics['posts'] || 0,
      reach: data.metrics['reach'] || 0,
    }));
  }, [metrics]);

  if (!mediaCompanyId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-sm text-muted-foreground">
            Cross-outlet analytics are available for media company accounts with child outlets.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-5 space-y-3">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-8 w-32 bg-muted rounded animate-pulse" />
              <div className="h-16 w-full bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (outletSummaries.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-sm text-muted-foreground">
            No outlet data available yet. Analytics will appear as child outlets sync their data.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Find the outlet with max engagement for comparison
  const maxEngagement = Math.max(...outletSummaries.map((o) => o.engagement), 1);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {outletSummaries.map((outlet) => {
          const engagementPct = (outlet.engagement / maxEngagement) * 100;

          return (
            <Card key={outlet.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  {outlet.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <MetricCell label="Followers" value={outlet.followers} />
                  <MetricCell label="Engagement" value={outlet.engagement} />
                  <MetricCell label="Posts" value={outlet.posts} />
                  <MetricCell label="Reach" value={outlet.reach} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Relative engagement</span>
                    <span>{engagementPct.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${engagementPct}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function MetricCell({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">
        {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toLocaleString()}
      </p>
    </div>
  );
}
