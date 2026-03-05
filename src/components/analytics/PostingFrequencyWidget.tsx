import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePostingFrequency } from '@/hooks/usePostingFrequency';
import { BarChart2 } from 'lucide-react';
import { FaInstagram, FaTwitter, FaLinkedin, FaFacebook, FaTiktok, FaYoutube } from 'react-icons/fa';
import { SiBluesky } from 'react-icons/si';

const platformIcon: Record<string, React.ElementType> = {
  instagram: FaInstagram,
  twitter: FaTwitter,
  facebook: FaFacebook,
  linkedin: FaLinkedin,
  tiktok: FaTiktok,
  youtube: FaYoutube,
  bluesky: SiBluesky,
};

const platformColor: Record<string, string> = {
  instagram: 'text-pink-500',
  twitter: 'text-sky-500',
  facebook: 'text-blue-600',
  linkedin: 'text-blue-700',
  tiktok: 'text-foreground',
  youtube: 'text-red-600',
  bluesky: 'text-sky-400',
};

function freqLabel(postsPerWeek: number): string {
  if (postsPerWeek <= 1) return '≤1/wk';
  if (postsPerWeek <= 2) return '1-2/wk';
  if (postsPerWeek <= 5) return '3-5/wk';
  if (postsPerWeek <= 10) return '6-10/wk';
  return '11+/wk';
}

export function PostingFrequencyWidget() {
  const { data: rows, isLoading, isError } = usePostingFrequency();

  // Group by platform, find optimal row per platform
  const byPlatform: Record<string, { postsPerWeek: number; er: number }[]> = {};
  for (const row of rows ?? []) {
    if (!byPlatform[row.platform]) byPlatform[row.platform] = [];
    byPlatform[row.platform].push({ postsPerWeek: row.posts_per_week, er: row.average_engagement_rate });
  }

  // Global optimal
  const optimal = (rows ?? []).reduce<{ platform: string; postsPerWeek: number; er: number } | null>((best, row) => {
    if (!best || row.average_engagement_rate > best.er) {
      return { platform: row.platform, postsPerWeek: row.posts_per_week, er: row.average_engagement_rate };
    }
    return best;
  }, null);

  const platforms = Object.keys(byPlatform);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">Posting Frequency vs Engagement</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-5 h-5 rounded flex-shrink-0" />
                <Skeleton className="h-3.5 w-20" />
                <div className="flex gap-2 flex-wrap flex-1">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && isError && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <BarChart2 className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Unable to load frequency data</p>
            <p className="text-xs text-muted-foreground mt-1">Check your analytics connection and try again</p>
          </div>
        )}

        {!isLoading && !isError && platforms.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <BarChart2 className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No frequency data yet</p>
            <p className="text-xs text-muted-foreground mt-1">Publish across multiple weeks to see patterns</p>
          </div>
        )}

        {!isLoading && !isError && platforms.length > 0 && (
          <div className="space-y-2.5">
            {platforms.map((platform) => {
              const Icon = platformIcon[platform];
              const color = platformColor[platform] ?? 'text-muted-foreground';
              const buckets = byPlatform[platform].sort((a, b) => a.postsPerWeek - b.postsPerWeek);
              const bestBucket = buckets.reduce((best, b) => (b.er > best.er ? b : best), buckets[0]);

              return (
                <div key={platform} className="flex items-start gap-3">
                  {Icon && <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${color}`} />}
                  <span className="text-xs font-medium text-foreground w-20 flex-shrink-0 capitalize">{platform}</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {buckets.map((b) => {
                      const isOptimal = b.postsPerWeek === bestBucket.postsPerWeek;
                      return (
                        <Badge
                          key={b.postsPerWeek}
                          className={`text-xs border-0 ${
                            isOptimal
                              ? 'bg-emerald-500/15 text-emerald-600'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {freqLabel(b.postsPerWeek)}: ER {(b.er * 100).toFixed(1)}%
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {optimal && (
              <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                Optimal posting frequency: <span className="text-foreground font-medium">{freqLabel(optimal.postsPerWeek)}</span> on{' '}
                <span className="text-foreground font-medium capitalize">{optimal.platform}</span>{' '}
                ({(optimal.er * 100).toFixed(1)}% ER)
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
