import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatSparklineWidget } from "@/components/analytics-v2/widgets-v2/StatSparklineWidget";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useDashboardTrends } from "@/hooks/useDashboardTrends";
import { AiBriefingPanel } from "@/components/dashboard/AiBriefingPanel";
import { TopPostsSpotlight } from "@/components/dashboard/TopPostsSpotlight";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";
import { EngagementChart } from "@/components/dashboard/EngagementChart";
import { OnboardingProgressWidget } from "@/components/dashboard/OnboardingProgressWidget";
import { DateRangeFilter } from "@/components/analytics/DateRangeFilter";
import { getPremiumSeries } from "@/components/analytics-v2/widgets-v2/premium-theme";
import { Button } from "@/components/ui/button";
import { Plus, Users, Eye, BarChart3, FileText, Sparkles, Database } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useAccountGrowth, useAggregatedFollowers } from "@/hooks/useAccountGrowth";
import { motion } from "framer-motion";
import { subDays, differenceInDays, format } from "date-fns";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0, 0, 0.2, 1] as const } },
};

/** Debug tooltip showing data source — only visible on hover */
function DataSourceTag({ sources }: { sources: string[] }) {
  return (
    <div className="group/ds absolute top-1.5 right-1.5 z-10">
      <div className="opacity-0 group-hover/ds:opacity-100 transition-opacity duration-150 absolute right-0 top-6 bg-popover border border-border rounded-lg shadow-lg px-3 py-2 text-[11px] whitespace-nowrap pointer-events-none">
        <div className="flex items-center gap-1.5 text-muted-foreground font-medium mb-1">
          <Database className="w-3 h-3" />
          Data source
        </div>
        {sources.map((s, i) => (
          <div key={i} className="text-foreground font-mono">{s}</div>
        ))}
      </div>
      <div className="w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover/ds:opacity-60 transition-opacity cursor-help">
        <Database className="w-3 h-3 text-muted-foreground" />
      </div>
    </div>
  );
}

interface SparkPoint { x: string; y: number }

function useSparklineData(startDate: string, endDate: string) {
  const { data: company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ["dashboard-sparkline", companyId, startDate, endDate],
    queryFn: async () => {
      if (!companyId) return null;
      // Use publish_date grouping (same as Analytics page) — snapshot_date
      // only has data from the day tracking was fixed forward.
      const { data, error } = await supabase.rpc("get_post_analytics_by_publish_date", {
        _company_id: companyId,
        _start_date: startDate,
        _end_date: endDate,
      });

      if (error) throw error;
      type Row = { publish_date: string; views: number; likes: number; reach: number; impressions: number; post_count: number; avg_engagement_rate: number };
      const rows = (data || []) as Row[];
      const pt = (r: Row, v: number): SparkPoint => ({ x: r.publish_date, y: v });
      return {
        reachSpark: rows.map((r) => pt(r, Number(r.reach) || Number(r.views) || Number(r.impressions) || 0)),
        engagementSpark: rows.map((r) => pt(r, Number(r.avg_engagement_rate) || 0)),
        postsSpark: rows.map((r) => pt(r, Number(r.post_count) || 0)),
      };
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });
}

const fmt = (d: Date) => d.toISOString().split("T")[0];

const Index = () => {
  const navigate = useNavigate();
  const [briefingOpen, setBriefingOpen] = useState(false);
  const { data: company } = useCompany();

  // Date range state — default 14 days
  const today = fmt(new Date());
  const [startDate, setStartDate] = useState(() => fmt(subDays(new Date(), 14)));
  const [endDate, setEndDate] = useState(() => today);

  const days = differenceInDays(new Date(endDate), new Date(startDate));
  const timeframeLabel = useMemo(() => {
    const d = differenceInDays(new Date(endDate), new Date(startDate));
    const presets: Record<number, string> = { 7: "Last 7 days", 14: "Last 14 days", 30: "Last 30 days", 90: "Last 90 days" };
    return presets[d] || `${format(new Date(startDate), "MMM d")} – ${format(new Date(endDate), "MMM d")}`;
  }, [startDate, endDate]);

  const handleRangeChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  const stats = useDashboardStats({ startDate, endDate });
  const trends = useDashboardTrends({ startDate, endDate });
  const { data: sparklines, isLoading: sparkLoading } = useSparklineData(startDate, endDate);
  const { data: followerGrowth } = useAccountGrowth({ startDate, endDate });
  const { data: aggregatedFollowers } = useAggregatedFollowers(days);
  const series = getPremiumSeries();

  const followersSpark = (aggregatedFollowers || []).map(d => ({ x: d.date, y: d.followers }));
  const reachSpark = sparklines?.reachSpark || [];
  const engagementSpark = sparklines?.engagementSpark || [];
  const postsSpark = sparklines?.postsSpark || [];

  const followerChange = followerGrowth?.followerChange || 0;
  const followerChangeLabel = followerChange > 0 ? `+${followerChange.toLocaleString()}` : followerChange.toLocaleString();

  return (
    <DashboardLayout>
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="space-y-5"
      >
        {/* Header */}
        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1 text-sm">Your social media command center.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onRangeChange={handleRangeChange}
              companyCreatedAt={company?.created_at}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setBriefingOpen(!briefingOpen)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Toggle AI briefing"
            >
              <Sparkles className="w-4 h-4" />
            </Button>
            <Button className="gradient-accent shadow-glow hover:shadow-lg transition-shadow" onClick={() => navigate('/app/content?tab=posts')}>
              <Plus size={18} className="mr-2" />Create Post
            </Button>
          </div>
        </motion.div>

        {/* AI Briefing overlay */}
        <AiBriefingPanel open={briefingOpen} onClose={() => setBriefingOpen(false)} />

        {/* Onboarding — conditional */}
        <motion.div variants={fadeUp}>
          <OnboardingProgressWidget />
        </motion.div>

        {/* Hero KPI Row — 4x StatSparklineWidget from widgets-v2 */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <DataSourceTag sources={[
              "value: account_analytics_snapshots",
              "spark: account_analytics_snapshots (daily)",
              "trend: rpc get_post_analytics_totals",
            ]} />
            <StatSparklineWidget
              title="Followers"
              value={stats.isLoading ? "—" : stats.totalFollowers}
              change={trends.isLoading ? undefined : trends.followers.changePercent}
              sparklineData={followersSpark}
              color={series[0]}
              icon={<Users className="w-4 h-4" />}
              timeframeLabel={timeframeLabel}
              secondaryValue={followerChange !== 0 ? followerChangeLabel : undefined}
              secondaryLabel={followerChange !== 0 ? "net change" : undefined}
            />
          </div>
          <div className="relative">
            <DataSourceTag sources={[
              "value: rpc get_post_analytics_totals",
              "spark: rpc get_post_analytics_by_publish_date",
            ]} />
            <StatSparklineWidget
              title="Reach"
              value={stats.isLoading ? "—" : stats.totalReach}
              change={trends.isLoading ? undefined : trends.reach.changePercent}
              sparklineData={sparkLoading ? [] : reachSpark}
              color={series[1]}
              icon={<Eye className="w-4 h-4" />}
              timeframeLabel={timeframeLabel}
            />
          </div>
          <div className="relative">
            <DataSourceTag sources={[
              "value: rpc get_post_analytics_totals",
              "spark: rpc get_post_analytics_by_publish_date",
            ]} />
            <StatSparklineWidget
              title="Engagement"
              value={stats.isLoading ? "—" : `${stats.avgEngagementRate.toFixed(2)}%`}
              change={trends.isLoading ? undefined : trends.engagementRate.changePercent}
              sparklineData={sparkLoading ? [] : engagementSpark}
              color={series[2]}
              icon={<BarChart3 className="w-4 h-4" />}
              timeframeLabel={timeframeLabel}
            />
          </div>
          <div className="relative">
            <DataSourceTag sources={[
              "value: rpc get_post_analytics_totals",
              "spark: rpc get_post_analytics_by_publish_date",
            ]} />
            <StatSparklineWidget
              title="Posts"
              value={stats.isLoading ? "—" : stats.totalPosts}
              change={trends.isLoading ? undefined : trends.posts.changePercent}
              sparklineData={sparkLoading ? [] : postsSpark}
              chartType="bar"
              color={series[3]}
              icon={<FileText className="w-4 h-4" />}
              timeframeLabel={timeframeLabel}
            />
          </div>
        </motion.div>

        {/* Top Posts + Activity Timeline — same row */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">
          <div className="lg:col-span-3 relative">
            <DataSourceTag sources={[
              "post_analytics_snapshots (latest per post)",
              "account_analytics_snapshots (avg benchmark)",
            ]} />
            <TopPostsSpotlight days={days} timeframeLabel={timeframeLabel} />
          </div>
          <div className="lg:col-span-2 relative">
            <DataSourceTag sources={[
              "GetLate API /posts (scheduled)",
              "post_approvals table (pending)",
              "post_drafts table",
            ]} />
            <ActivityTimeline />
          </div>
        </motion.div>

        {/* Engagement Chart — full width */}
        <motion.div variants={fadeUp} className="relative">
          <DataSourceTag sources={[
            "line: rpc get_post_analytics_by_publish_date",
            "bars: rpc get_post_analytics_by_platform",
          ]} />
          <EngagementChart startDate={startDate} endDate={endDate} timeframeLabel={timeframeLabel} />
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
};

export default Index;
