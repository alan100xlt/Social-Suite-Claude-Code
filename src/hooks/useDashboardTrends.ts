import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useAccountGrowth } from "@/hooks/useAccountGrowth";

export interface TrendData {
  current: number;
  previous: number;
  changePercent: number;
  direction: "up" | "down" | "flat";
}

export interface DashboardTrends {
  followers: TrendData;
  engagementRate: TrendData;
  reach: TrendData;
  posts: TrendData;
  isLoading: boolean;
}

function computeTrend(current: number, previous: number): TrendData {
  const diff = current - previous;
  const changePercent = previous > 0 ? (diff / previous) * 100 : current > 0 ? 100 : 0;
  const direction = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
  return { current, previous, changePercent, direction };
}

export function useDashboardTrends({ startDate, endDate }: { startDate: string; endDate: string }): DashboardTrends {
  const { data: company } = useCompany();
  const companyId = company?.id;

  // Compute the previous period: same-length window immediately before startDate
  const rangeMs = new Date(endDate).getTime() - new Date(startDate).getTime();
  const prevEnd = startDate;
  const prevStart = new Date(new Date(startDate).getTime() - rangeMs).toISOString().split("T")[0];

  const { data: followerGrowth } = useAccountGrowth({ startDate, endDate });

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-trends", companyId, startDate, endDate],
    queryFn: async () => {
      if (!companyId) return null;

      const [currentRes, previousRes] = await Promise.all([
        supabase.rpc("get_post_analytics_totals", {
          _company_id: companyId,
          _start_date: startDate,
          _end_date: endDate,
        }),
        supabase.rpc("get_post_analytics_totals", {
          _company_id: companyId,
          _start_date: prevStart,
          _end_date: prevEnd,
        }),
      ]);

      if (currentRes.error) throw currentRes.error;
      if (previousRes.error) throw previousRes.error;

      const cur = currentRes.data?.[0];
      const prev = previousRes.data?.[0];

      return {
        engagementRate: computeTrend(
          Number(cur?.avg_engagement_rate || 0),
          Number(prev?.avg_engagement_rate || 0)
        ),
        reach: computeTrend(
          Number(cur?.total_reach || 0) || Number(cur?.total_views || 0) || Number(cur?.total_impressions || 0),
          Number(prev?.total_reach || 0) || Number(prev?.total_views || 0) || Number(prev?.total_impressions || 0)
        ),
        posts: computeTrend(
          Number(cur?.total_posts || 0),
          Number(prev?.total_posts || 0)
        ),
      };
    },
    enabled: !!companyId,
    staleTime: 60000,
  });

  const followersCurrent = followerGrowth?.totalFollowers || 0;
  const followersChange = followerGrowth?.followerChange || 0;
  const followersPrevious = followersCurrent - followersChange;

  return {
    followers: computeTrend(followersCurrent, followersPrevious),
    engagementRate: data?.engagementRate || { current: 0, previous: 0, changePercent: 0, direction: "flat" },
    reach: data?.reach || { current: 0, previous: 0, changePercent: 0, direction: "flat" },
    posts: data?.posts || { current: 0, previous: 0, changePercent: 0, direction: "flat" },
    isLoading,
  };
}
