import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlatformBreakdown } from '@/hooks/usePlatformBreakdown';
import { FaInstagram, FaTwitter, FaLinkedin, FaFacebook, FaTiktok, FaYoutube, FaPinterest, FaReddit, FaTelegram, FaSnapchat } from 'react-icons/fa';
import { SiBluesky, SiThreads } from 'react-icons/si';
import { Heart, MessageCircle, Eye, BarChart2 } from 'lucide-react';
import type { Platform } from '@/lib/api/getlate';
import { formatNumber } from '@/lib/charts/formatters';

interface PlatformBreakdownListProps {
  startDate: string;
  endDate: string;
}

const platformConfig: Partial<Record<Platform, { icon: React.ElementType; name: string; colorClass: string; bgClass: string }>> = {
  instagram: { icon: FaInstagram, name: 'Instagram', colorClass: 'text-pink-500', bgClass: 'bg-pink-500/10' },
  twitter: { icon: FaTwitter, name: 'Twitter', colorClass: 'text-sky-500', bgClass: 'bg-sky-500/10' },
  facebook: { icon: FaFacebook, name: 'Facebook', colorClass: 'text-blue-600', bgClass: 'bg-blue-600/10' },
  linkedin: { icon: FaLinkedin, name: 'LinkedIn', colorClass: 'text-blue-700', bgClass: 'bg-blue-700/10' },
  tiktok: { icon: FaTiktok, name: 'TikTok', colorClass: 'text-foreground', bgClass: 'bg-foreground/10' },
  youtube: { icon: FaYoutube, name: 'YouTube', colorClass: 'text-red-600', bgClass: 'bg-red-600/10' },
  pinterest: { icon: FaPinterest, name: 'Pinterest', colorClass: 'text-red-500', bgClass: 'bg-red-500/10' },
  reddit: { icon: FaReddit, name: 'Reddit', colorClass: 'text-orange-500', bgClass: 'bg-orange-500/10' },
  bluesky: { icon: SiBluesky, name: 'Bluesky', colorClass: 'text-sky-400', bgClass: 'bg-sky-400/10' },
  threads: { icon: SiThreads, name: 'Threads', colorClass: 'text-foreground', bgClass: 'bg-foreground/10' },
  telegram: { icon: FaTelegram, name: 'Telegram', colorClass: 'text-blue-400', bgClass: 'bg-blue-400/10' },
  snapchat: { icon: FaSnapchat, name: 'Snapchat', colorClass: 'text-yellow-400', bgClass: 'bg-yellow-400/10' },
};

function erBadge(er: number) {
  if (er >= 2) return <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-xs font-semibold">ER {er.toFixed(1)}%</Badge>;
  if (er >= 1) return <Badge className="bg-amber-500/15 text-amber-600 border-0 text-xs font-semibold">ER {er.toFixed(1)}%</Badge>;
  return <Badge className="bg-red-500/15 text-red-600 border-0 text-xs font-semibold">ER {er.toFixed(1)}%</Badge>;
}

export function PlatformBreakdownList({ startDate, endDate }: PlatformBreakdownListProps) {
  const { data, isLoading } = usePlatformBreakdown({ startDate, endDate });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">Platform Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-1">
        {isLoading && (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 px-2">
                <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </>
        )}

        {!isLoading && (!data || data.length === 0) && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <BarChart2 className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No platform data</p>
            <p className="text-xs text-muted-foreground mt-1">Connect accounts and sync analytics</p>
          </div>
        )}

        {!isLoading && data && data.map((p) => {
          const cfg = platformConfig[p.platform as Platform];
          const Icon = cfg?.icon;
          const name = cfg?.name ?? p.platform;
          const colorClass = cfg?.colorClass ?? 'text-muted-foreground';
          const bgClass = cfg?.bgClass ?? 'bg-muted';

          return (
            <div key={p.platform} className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-muted/50 transition-colors">
              {/* Platform icon */}
              <div className={`w-8 h-8 rounded-lg ${bgClass} flex items-center justify-center flex-shrink-0`}>
                {Icon && <Icon className={`w-4 h-4 ${colorClass}`} />}
              </div>

              {/* Name + metrics */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground leading-none">{name}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    {formatNumber(p.likes)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    {formatNumber(p.comments)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {formatNumber(p.views)}
                  </span>
                  {p.postsCount > 0 && (
                    <span className="text-muted-foreground/60">{p.postsCount} posts</span>
                  )}
                </div>
              </div>

              {/* ER badge */}
              {erBadge(p.engagementRate * 100)}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
