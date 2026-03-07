import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';
import { getlatePosts } from '@/lib/api/getlate';
import type { TopPost } from './useTopPerformingPosts';

export interface PlatformAnalytics {
  platform: string;
  accountName: string;
  status: string;
  postUrl: string | null;
  impressions: number;
  reach: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  engagementRate: number;
}

export interface PostWithPlatforms extends TopPost {
  _status?: string;
  _platformCount?: number;
  _publishedCount?: number;
  _failedCount?: number;
  _platforms?: PlatformAnalytics[];
}

/**
 * Merges GetLate API posts with local analytics snapshots.
 * Shows ALL posts immediately (even without analytics),
 * enriched with engagement data when available.
 * Analytics are broken down per-platform with rollup totals on the parent.
 */
export function useAllPostsWithAnalytics(params: { days?: number } = {}) {
  const { data: company } = useCompany();
  const companyId = company?.id;
  const profileId = company?.getlate_profile_id;
  const days = params.days || 30;

  return useQuery({
    queryKey: ['all-posts-with-analytics', companyId, profileId, days],
    queryFn: async (): Promise<PostWithPlatforms[]> => {
      if (!companyId) return [];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      // Get inactive account IDs to filter out stale data
      const inactiveQuery = supabase
        .from('account_analytics_snapshots')
        .select('account_id')
        .eq('company_id', companyId)
        .eq('is_active', false);

      const [getlateResult, analyticsResult, inactiveResult] = await Promise.all([
        profileId
          ? getlatePosts.list({ profileId })
          : Promise.resolve({ success: true, data: { posts: [] } }),
        supabase
          .from('post_analytics_snapshots')
          .select('*')
          .eq('company_id', companyId)
          .not('published_at', 'is', null)
          .gte('published_at', startDate.toISOString())
          .order('published_at', { ascending: false }),
        inactiveQuery,
      ]);

      const inactiveIds = new Set((inactiveResult.data || []).map(a => a.account_id));

      // Build per-platform analytics: postId -> platform -> latest snapshot
      const perPlatformMap = new Map<string, Map<string, {
        impressions: number;
        reach: number;
        views: number;
        likes: number;
        comments: number;
        shares: number;
        clicks: number;
        engagementRate: number;
        content: string | null;
        postUrl: string | null;
        publishedAt: string | null;
        thumbnailUrl: string | null;
        source: string | null;
        objective: string | null;
      }>>();

      if (analyticsResult.data) {
        for (const row of analyticsResult.data) {
          // Skip posts from inactive accounts
          if (row.account_id && inactiveIds.has(row.account_id)) continue;
          if (!perPlatformMap.has(row.post_id)) {
            perPlatformMap.set(row.post_id, new Map());
          }
          const platformMap = perPlatformMap.get(row.post_id)!;
          // Keep only the latest snapshot per post_id + platform
          if (!platformMap.has(row.platform)) {
            platformMap.set(row.platform, {
              impressions: row.impressions || 0,
              reach: row.reach || 0,
              views: row.views || 0,
              likes: row.likes || 0,
              comments: row.comments || 0,
              shares: row.shares || 0,
              clicks: row.clicks || 0,
              engagementRate: row.engagement_rate || 0,
              content: row.content,
              postUrl: row.post_url,
              publishedAt: row.published_at,
              thumbnailUrl: row.thumbnail_url,
              source: (row as any).source || null,
              objective: (row as any).objective || null,
            });
          }
        }
      }

      // Helper: sum analytics across all platforms for a post
      const rollup = (postId: string) => {
        const platformMap = perPlatformMap.get(postId);
        if (!platformMap) return null;
        let impressions = 0, reach = 0, views = 0, likes = 0, comments = 0, shares = 0, clicks = 0;
        let rateSum = 0, count = 0;
        for (const a of platformMap.values()) {
          impressions += a.impressions;
          reach += a.reach;
          views += a.views;
          likes += a.likes;
          comments += a.comments;
          shares += a.shares;
          clicks += a.clicks;
          rateSum += a.engagementRate;
          count++;
        }
        return { impressions, reach, views, likes, comments, shares, clicks, engagementRate: count > 0 ? rateSum / count : 0 };
      };

      const mergedPosts: PostWithPlatforms[] = [];
      const seenPostIds = new Set<string>();

      // Process GetLate posts first
      if (getlateResult.success && getlateResult.data?.posts) {
        for (const rawPost of getlateResult.data.posts as any[]) {
          const postId = rawPost._id || rawPost.id;
          if (!postId || seenPostIds.has(postId)) continue;
          seenPostIds.add(postId);

          const r = rollup(postId);
          const platforms = rawPost.platforms || [];
          const firstPlatform = platforms[0];
          const thumbnailUrl = rawPost.mediaItems?.[0]?.url || null;

          const platform = firstPlatform?.platform || 'unknown';
          const publishedAt = firstPlatform?.publishedAt || rawPost.publishedAt || rawPost.createdAt || null;
          const postUrl = firstPlatform?.platformPostUrl || null;
          const status = rawPost.status || firstPlatform?.status || 'unknown';

          const platformCount = platforms.length;
          const publishedCount = platforms.filter((p: any) => p.status === 'published').length;
          const failedCount = platforms.filter((p: any) => p.status === 'failed').length;

          // Build per-platform entries with analytics
          const platformMap = perPlatformMap.get(postId);
          const platformEntries: PlatformAnalytics[] = platforms.map((p: any) => {
            const pAnalytics = platformMap?.get(p.platform);
            return {
              platform: p.platform,
              accountName: p.accountId?.displayName || p.accountId?.username || '',
              status: p.status || 'unknown',
              postUrl: p.platformPostUrl || null,
              impressions: pAnalytics?.impressions || 0,
              reach: pAnalytics?.reach || 0,
              views: pAnalytics?.views || 0,
              likes: pAnalytics?.likes || 0,
              comments: pAnalytics?.comments || 0,
              shares: pAnalytics?.shares || 0,
              clicks: pAnalytics?.clicks || 0,
              engagementRate: pAnalytics?.engagementRate || 0,
            };
          });

          // Also add analytics-only platforms not in GetLate platforms list
          if (platformMap) {
            for (const [pName, pData] of platformMap) {
              if (!platforms.some((p: any) => p.platform === pName)) {
                platformEntries.push({
                  platform: pName,
                  accountName: '',
                  status: 'published',
                  postUrl: pData.postUrl,
                  impressions: pData.impressions,
                  reach: pData.reach,
                  views: pData.views,
                  likes: pData.likes,
                  comments: pData.comments,
                  shares: pData.shares,
                  clicks: pData.clicks,
                  engagementRate: pData.engagementRate,
                });
              }
            }
          }

          const firstAnalytics = platformMap?.values().next().value;

          mergedPosts.push({
            postId,
            platform,
            impressions: r?.impressions || 0,
            reach: r?.reach || 0,
            likes: r?.likes || 0,
            comments: r?.comments || 0,
            shares: r?.shares || 0,
            clicks: r?.clicks || 0,
            engagementRate: r?.engagementRate || 0,
            engagement: (r?.likes || 0) + (r?.comments || 0) + (r?.shares || 0),
            snapshotDate: '',
            content: rawPost.content || firstAnalytics?.content || null,
            postUrl,
            publishedAt,
            thumbnailUrl: thumbnailUrl || firstAnalytics?.thumbnailUrl || null,
            views: r?.views || 0,
            source: rawPost.metadata?.source || firstAnalytics?.source || null,
            objective: rawPost.metadata?.objective || firstAnalytics?.objective || null,
            _status: status,
            _platformCount: platformCount,
            _publishedCount: publishedCount,
            _failedCount: failedCount,
            _platforms: platformEntries,
          });
        }
      }

      // Add analytics-only posts
      for (const [postId, platformMap] of perPlatformMap) {
        if (seenPostIds.has(postId)) continue;
        seenPostIds.add(postId);

        const r = rollup(postId)!;
        const firstEntry = platformMap.values().next().value;
        const platformEntries: PlatformAnalytics[] = [];
        for (const [pName, pData] of platformMap) {
          platformEntries.push({
            platform: pName,
            accountName: '',
            status: 'published',
            postUrl: pData.postUrl,
            impressions: pData.impressions,
            reach: pData.reach,
            views: pData.views,
            likes: pData.likes,
            comments: pData.comments,
            shares: pData.shares,
            clicks: pData.clicks,
            engagementRate: pData.engagementRate,
          });
        }

        mergedPosts.push({
          postId,
          platform: platformEntries[0]?.platform || 'unknown',
          impressions: r.impressions,
          reach: r.reach,
          likes: r.likes,
          comments: r.comments,
          shares: r.shares,
          clicks: r.clicks,
          engagementRate: r.engagementRate,
          engagement: r.likes + r.comments + r.shares,
          snapshotDate: '',
          content: firstEntry?.content || null,
          postUrl: firstEntry?.postUrl || null,
          publishedAt: firstEntry?.publishedAt || null,
          thumbnailUrl: firstEntry?.thumbnailUrl || null,
          views: r.views,
          source: firstEntry?.source || null,
          objective: firstEntry?.objective || null,
          _platforms: platformEntries,
          _platformCount: platformEntries.length,
        });
      }

      // Sort by publishedAt descending
      mergedPosts.sort((a, b) => {
        const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return dateB - dateA;
      });

      return mergedPosts;
    },
    enabled: !!companyId,
  });
}
