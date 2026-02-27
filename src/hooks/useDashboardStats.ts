import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";

export interface DashboardStats {
  totalFollowers: number;
  totalReach: number;
  totalViews: number;
  avgEngagementRate: number;
  totalPosts: number;
  isLoading: boolean;
}

export function useDashboardStats(platform?: string | null) {
  const { data: company } = useCompany();
  const companyId = company?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats", companyId, platform],
    queryFn: async () => {
      if (!companyId) return null;

      // Get latest account snapshots for followers/reach
      const accountQuery = supabase
        .from("account_analytics_snapshots")
        .select("account_id, platform, followers, reach, views, impressions, engagement_rate, snapshot_date")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("snapshot_date", { ascending: false });

      if (platform) {
        accountQuery.eq("platform", platform);
      }

      const { data: accountSnapshots, error: accErr } = await accountQuery;
      if (accErr) throw accErr;

      // Deduplicate: keep only the latest snapshot per account
      const latestByAccount = new Map<string, typeof accountSnapshots[0]>();
      for (const snap of accountSnapshots || []) {
        if (!latestByAccount.has(snap.account_id)) {
          latestByAccount.set(snap.account_id, snap);
        }
      }
      const latestSnapshots = Array.from(latestByAccount.values());

      const totalFollowers = latestSnapshots.reduce((sum, s) => sum + (s.followers || 0), 0);
      const totalReach = latestSnapshots.reduce((sum, s) => sum + (s.reach || 0), 0);
      const totalViews = latestSnapshots.reduce((sum, s) => sum + (s.views || 0), 0);

      // Get post analytics totals using RPC
      const today = new Date().toISOString().split('T')[0];
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data: postTotals, error: postErr } = await supabase.rpc("get_post_analytics_totals", {
        _company_id: companyId,
        _start_date: ninetyDaysAgo,
        _end_date: today,
        _platform: platform || undefined,
      });
      if (postErr) throw postErr;

      const totals = postTotals?.[0];
      const avgEngagementRate = totals?.avg_engagement_rate || 0;
      const totalPosts = Number(totals?.total_posts || 0);
      // Use impressions from post analytics if account-level reach is 0
      const postReach = Number(totals?.total_reach || 0);
      const postImpressions = Number(totals?.total_impressions || 0);

      return {
        totalFollowers,
        totalReach: totalReach || postReach || postImpressions,
        totalViews,
        avgEngagementRate: Number(avgEngagementRate),
        totalPosts,
      };
    },
    enabled: !!companyId,
    staleTime: 30000,
  });

  return {
    totalFollowers: data?.totalFollowers || 0,
    totalReach: data?.totalReach || 0,
    totalViews: data?.totalViews || 0,
    avgEngagementRate: data?.avgEngagementRate || 0,
    totalPosts: data?.totalPosts || 0,
    isLoading,
  };
}
