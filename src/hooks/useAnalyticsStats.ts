import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useInactiveAccountIds } from "./useInactiveAccountIds";

export interface PlatformCount {
  platform: string;
  count: number;
}

export interface AnalyticsStats {
  totalPosts: number;
  uniquePosts: number;
  totalAccounts: number;
  earliestDate: string | null;
  latestDate: string | null;
  platformBreakdown: PlatformCount[];
  lastSyncAt: string | null;
  isLoading: boolean;
  error: Error | null;
}

export function useAnalyticsStats(): AnalyticsStats {
  const { data: company } = useCompany();
  const companyId = company?.id;
  const { data: inactiveIds } = useInactiveAccountIds();

  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics-stats", companyId, inactiveIds ? Array.from(inactiveIds) : []],
    queryFn: async () => {
      if (!companyId) return null;

      // Fetch post stats
      const { data: postStats, error: postError } = await supabase
        .from("post_analytics_snapshots")
        .select("id, post_id, platform, snapshot_date, created_at, account_id")
        .eq("company_id", companyId)
        .order("snapshot_date", { ascending: true });

      if (postError) throw postError;

      // Fetch account stats (only active)
      const { data: accountStats, error: accountError } = await supabase
        .from("account_analytics_snapshots")
        .select("id, account_id, platform, snapshot_date, created_at")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1);

      if (accountError) throw accountError;

      // Filter out posts from inactive accounts
      const posts = (postStats || []).filter(
        (p) => !p.account_id || !inactiveIds?.has(p.account_id)
      );
      const uniquePostIds = new Set(posts.map(p => p.post_id));
      
      // Platform breakdown by unique posts
      const platformCounts: Record<string, Set<string>> = {};
      for (const post of posts) {
        if (!platformCounts[post.platform]) {
          platformCounts[post.platform] = new Set();
        }
        platformCounts[post.platform].add(post.post_id);
      }

      const platformBreakdown: PlatformCount[] = Object.entries(platformCounts)
        .map(([platform, postIds]) => ({
          platform,
          count: postIds.size,
        }))
        .sort((a, b) => b.count - a.count);

      // Date range
      const dates = posts.map(p => p.snapshot_date).sort();
      const earliestDate = dates[0] || null;
      const latestDate = dates[dates.length - 1] || null;

      // Last sync time from most recent created_at
      const lastSyncAt = posts.length > 0
        ? posts.reduce((latest, p) => 
            p.created_at > latest ? p.created_at : latest, 
            posts[0].created_at
          )
        : null;

      // Count unique accounts
      const uniqueAccounts = accountStats?.length || 0;

      return {
        totalPosts: posts.length,
        uniquePosts: uniquePostIds.size,
        totalAccounts: uniqueAccounts,
        earliestDate,
        latestDate,
        platformBreakdown,
        lastSyncAt,
      };
    },
    enabled: !!companyId && inactiveIds !== undefined,
    staleTime: 30000,
  });

  return {
    totalPosts: data?.totalPosts || 0,
    uniquePosts: data?.uniquePosts || 0,
    totalAccounts: data?.totalAccounts || 0,
    earliestDate: data?.earliestDate || null,
    latestDate: data?.latestDate || null,
    platformBreakdown: data?.platformBreakdown || [],
    lastSyncAt: data?.lastSyncAt || null,
    isLoading,
    error: error as Error | null,
  };
}
