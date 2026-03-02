import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useContentDecay } from '@/hooks/useContentDecay';
import { TrendingDown } from 'lucide-react';

export function ContentDecayWidget() {
  const { data: buckets, isLoading, isError } = useContentDecay();

  // Find the window where engagement first hits 95%+ (proxy for "fully decayed")
  const decayWindow = buckets?.find((b) => b.engagementPercentage >= 95)?.timeWindow;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">Content Performance Decay</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-3.5 w-14 flex-shrink-0" />
                <Skeleton className="h-5 rounded flex-1" style={{ maxWidth: `${40 + i * 12}%` }} />
                <Skeleton className="h-3.5 w-8 flex-shrink-0" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && isError && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <TrendingDown className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Analytics add-on required</p>
            <p className="text-xs text-muted-foreground mt-1">Upgrade to access content decay insights</p>
          </div>
        )}

        {!isLoading && !isError && (!buckets || buckets.length === 0) && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <TrendingDown className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No decay data yet</p>
            <p className="text-xs text-muted-foreground mt-1">Publish more posts to see engagement patterns</p>
          </div>
        )}

        {!isLoading && !isError && buckets && buckets.length > 0 && (
          <div className="space-y-2">
            {buckets.map((bucket) => (
              <div key={bucket.timeWindow} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-14 flex-shrink-0 text-right">
                  {bucket.timeWindow}
                </span>
                <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full bg-primary/70 rounded-full transition-all"
                    style={{ width: `${bucket.engagementPercentage}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-foreground w-8 flex-shrink-0 text-right">
                  {bucket.engagementPercentage}%
                </span>
              </div>
            ))}

            {decayWindow && (
              <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                Posts reach ~95% of total engagement within <span className="text-foreground font-medium">{decayWindow}</span>
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
