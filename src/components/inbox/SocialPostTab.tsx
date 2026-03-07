import { ExternalLink, Heart, MessageSquare, Share2, Eye, TrendingUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { InboxConversation } from '@/lib/api/inbox';

interface SocialPostTabProps {
  conversation: InboxConversation;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

export function SocialPostTab({ conversation }: SocialPostTabProps) {
  const hasPost = conversation.post_id || conversation.post_url;

  // Fetch real analytics from post_analytics_snapshots
  const { data: postData, isLoading } = useQuery({
    queryKey: ['post-analytics-snapshot', conversation.post_id],
    queryFn: async () => {
      if (!conversation.post_id) return null;
      const { data } = await supabase
        .from('post_analytics_snapshots')
        .select('*')
        .eq('post_id', conversation.post_id)
        .eq('company_id', conversation.company_id)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!conversation.post_id,
  });

  if (!hasPost) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        No social post linked to this conversation.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const content = postData?.content || conversation.article_title || conversation.last_message_preview?.slice(0, 200) || '';
  const postDate = postData?.published_at || conversation.created_at;
  const formattedDate = postDate
    ? new Date(postDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';
  const postUrl = postData?.post_url || conversation.post_url;
  const thumbnailUrl = postData?.thumbnail_url;

  const likes = postData?.likes ?? null;
  const comments = postData?.comments ?? null;
  const shares = postData?.shares ?? null;
  const reach = postData?.reach ?? null;
  const impressions = postData?.impressions ?? null;
  const engagementRate = postData?.engagement_rate ?? null;
  const hasStats = likes !== null || comments !== null || shares !== null;

  return (
    <div className="p-4 space-y-4">
      {/* Mini post preview */}
      <div>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-sm font-extrabold flex-shrink-0">
            {conversation.platform.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-[13px] font-bold capitalize">{conversation.platform}</p>
            <p className="text-[11px] text-muted-foreground">{formattedDate}</p>
          </div>
        </div>

        {content && (
          <p className="text-[13px] leading-relaxed mb-3 line-clamp-4">
            {content}
          </p>
        )}

        {/* Thumbnail or placeholder */}
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt="Post thumbnail"
            className="w-full h-[140px] rounded-lg object-cover mb-3 border"
          />
        ) : (
          <div className="w-full h-[140px] rounded-lg bg-muted border flex items-center justify-center text-muted-foreground text-xs mb-3">
            {conversation.article_title || 'Social Post'}
          </div>
        )}

        {/* Engagement stats inline */}
        <div className="flex gap-3 text-[11.5px] text-muted-foreground pt-2.5 border-t">
          <span className="flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" />
            {likes !== null ? formatNumber(likes) : '—'}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" />
            {comments !== null ? formatNumber(comments) : '—'}
          </span>
          <span className="flex items-center gap-1">
            <Share2 className="h-3.5 w-3.5" />
            {shares !== null ? formatNumber(shares) : '—'}
          </span>
        </div>
      </div>

      <Separator />

      {/* Post Performance */}
      <div className="space-y-2">
        <h4 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Post Performance</h4>
        <div className="space-y-1.5 text-[11.5px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground flex items-center gap-1"><Eye className="h-3 w-3" /> Reach</span>
            <span className="font-semibold">{reach !== null ? formatNumber(reach) : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground flex items-center gap-1"><Eye className="h-3 w-3" /> Impressions</span>
            <span className="font-semibold">{impressions !== null ? formatNumber(impressions) : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Engagement</span>
            <span className="font-semibold text-emerald-600">
              {engagementRate !== null ? `${(engagementRate * 100).toFixed(1)}%` : '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total comments</span>
            <span className="font-semibold">{comments !== null ? formatNumber(comments) : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shares</span>
            <span className="font-semibold">{shares !== null ? formatNumber(shares) : '—'}</span>
          </div>
        </div>

        {!hasStats && (
          <p className="text-[11px] text-muted-foreground/60 italic pt-1">
            Analytics data not yet available for this post.
          </p>
        )}
      </div>

      <Separator />

      {/* Quick Actions */}
      <div className="space-y-2">
        <h4 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Quick Actions</h4>
        <div className="space-y-1.5">
          {postUrl && (
            <Button variant="outline" size="sm" className="w-full justify-start text-xs gap-2 h-9" asChild>
              <a href={postUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> View on {conversation.platform.charAt(0).toUpperCase() + conversation.platform.slice(1)}
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
