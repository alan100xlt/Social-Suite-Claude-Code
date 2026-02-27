import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { usePosts } from "@/hooks/useGetLatePosts";
import { usePostDrafts } from "@/hooks/usePostDrafts";
import { useTopPerformingPosts } from "@/hooks/useTopPerformingPosts";
import { useAutomationRules } from "@/hooks/useAutomationRules";
import { useCompany } from "@/hooks/useCompany";

export function useDashboardBriefing() {
  const { data: company } = useCompany();
  const stats = useDashboardStats();
  const { data: scheduledPosts } = usePosts({ status: "scheduled" });
  const { data: drafts } = usePostDrafts();
  const { data: topPosts } = useTopPerformingPosts({ days: 7, limit: 1 });
  const { data: automationRules } = useAutomationRules();

  const companyId = company?.id;

  // Count pending approvals
  const { data: pendingApprovals } = useQuery({
    queryKey: ["pending-approvals-count", companyId],
    queryFn: async () => {
      if (!companyId) return 0;
      const { count, error } = await supabase
        .from("post_approvals")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString());
      if (error) return 0;
      return count || 0;
    },
    enabled: !!companyId,
  });

  const inactiveAutomations = automationRules?.filter((r) => !r.is_active).length || 0;
  const topPost = topPosts?.[0];
  const topPostSummary = topPost
    ? `${topPost.platform} post with ${topPost.impressions} impressions, ${topPost.likes} likes, ${topPost.engagementRate.toFixed(1)}% engagement`
    : "None";

  const statsReady = !stats.isLoading && companyId;

  const payload = {
    totalFollowers: stats.totalFollowers,
    avgEngagementRate: stats.avgEngagementRate,
    totalReach: stats.totalReach,
    totalViews: stats.totalViews,
    totalPosts: stats.totalPosts,
    scheduledCount: scheduledPosts?.length || 0,
    draftCount: drafts?.length || 0,
    pendingApprovals: pendingApprovals || 0,
    inactiveAutomations,
    topPostSummary,
  };

  return useQuery({
    queryKey: ["dashboard-briefing", companyId, JSON.stringify(payload)],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("dashboard-briefing", {
        body: payload,
      });
      if (error) throw error;
      return data?.briefing as string;
    },
    enabled: !!statsReady,
    staleTime: 4 * 60 * 60 * 1000, // 4 hours
    gcTime: 4 * 60 * 60 * 1000,
  });
}
