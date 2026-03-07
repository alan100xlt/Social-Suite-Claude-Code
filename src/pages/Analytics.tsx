import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Eye, Users, MousePointer, TrendingUp, BarChart3, Layers, Heart, UserCheck, Building2 } from "lucide-react";
import { useCompany } from "@/hooks/useCompany";
import { useAnalyticsByPublishDate } from "@/hooks/useAnalyticsByPublishDate";
import { useAccountGrowth, useAggregatedFollowers } from "@/hooks/useAccountGrowth";
import { usePlatformBreakdown } from "@/hooks/usePlatformBreakdown";
import { useBestTimeToPost } from "@/hooks/useBestTimeToPost";
import { useContentDecay } from "@/hooks/useContentDecay";
import { useTopPerformingPosts } from "@/hooks/useTopPerformingPosts";
import { useAllPostsWithAnalytics } from "@/hooks/useAllPostsWithAnalytics";
import { useSyncAnalytics } from "@/hooks/useSyncAnalytics";
import { useLastSyncTime } from "@/hooks/useLastSyncTime";
import { DateRangeFilter } from "@/components/analytics/DateRangeFilter";
import { SyncStatusBadge } from "@/components/analytics/SyncStatusBadge";
import { SyncingIndicator } from "@/components/analytics/SyncingIndicator";
import { TopPostsTable } from "@/components/analytics/TopPostsTable";
import { OptimalPostingWidget } from "@/components/analytics/OptimalPostingWidget";
import {
  StatSparklineWidget,
  AreaTrendWidget,
  BarComparisonWidget,
  DonutKpiWidget,
  HeatmapWidget,
  TreemapWidget,
  FunnelWidget,
  GaugeWidget,
} from "@/components/analytics-v2/widgets-v2";
import { premiumColors } from "@/components/analytics-v2/widgets-v2/premium-theme";
import {
  buildKpiSparklines,
  buildAreaTrend,
  buildDonutData,
  buildHeatmapData,
  buildFunnelData,
  buildGaugeData,
  buildTreemapData,
  buildDecayBarData,
  buildFollowerTrend,
  computeChangePercent,
} from "@/lib/analytics/transforms";
import { AnalyticsErrorBoundary } from "@/components/analytics/AnalyticsErrorBoundary";
import { CrossOutletAnalytics } from "@/components/analytics/CrossOutletAnalytics";
import { FeatureGate } from "@/components/auth/FeatureGate";

function WidgetSkeleton() {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-16 w-full" />
      </CardContent>
    </Card>
  );
}

export default function Analytics() {
  const { data: company } = useCompany();
  const companyId = company?.id;

  // Date range state
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split("T")[0]; })();
  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);

  // Sync
  const syncMutation = useSyncAnalytics();
  const { data: lastSyncTime, isLoading: syncTimeLoading } = useLastSyncTime();

  // Data hooks
  const { data: pdm, isLoading: pdmLoading } = useAnalyticsByPublishDate({ startDate, endDate });
  const { data: growth, isLoading: growthLoading } = useAccountGrowth({ startDate, endDate });
  const { data: aggregatedFollowers } = useAggregatedFollowers(30);
  const { data: platformData, isLoading: platformLoading } = usePlatformBreakdown({ startDate, endDate });
  const { data: bestTimeSlots } = useBestTimeToPost();
  const { data: decayBuckets } = useContentDecay();
  const { data: topPosts, isLoading: topPostsLoading } = useTopPerformingPosts({ days: 30 });
  const { data: allPosts, isLoading: allPostsLoading } = useAllPostsWithAnalytics();

  // Transforms
  const sparklines = useMemo(() => buildKpiSparklines(pdm || []), [pdm]);
  const areaTrend = useMemo(() => buildAreaTrend(pdm || []), [pdm]);
  const changes = useMemo(() => computeChangePercent(pdm || []), [pdm]);
  const donut = useMemo(() => buildDonutData(platformData || []), [platformData]);
  const heatmap = useMemo(() => buildHeatmapData(bestTimeSlots || []), [bestTimeSlots]);
  const decayBars = useMemo(() => buildDecayBarData(decayBuckets || []), [decayBuckets]);
  const treemap = useMemo(() => buildTreemapData(platformData || []), [platformData]);
  const gauge = useMemo(() => buildGaugeData(platformData || []), [platformData]);
  const followerTrend = useMemo(() => buildFollowerTrend(aggregatedFollowers || []), [aggregatedFollowers]);

  const totals = useMemo(() => {
    if (!pdm || pdm.length === 0) return { impressions: 0, views: 0, clicks: 0, engagement: 0 };
    return pdm.reduce(
      (acc, d) => ({
        impressions: acc.impressions + d.impressions,
        views: acc.views + d.views,
        clicks: acc.clicks + d.clicks,
        engagement: acc.engagement + (d.likes + d.comments + d.shares),
      }),
      { impressions: 0, views: 0, clicks: 0, engagement: 0 }
    );
  }, [pdm]);

  const funnel = useMemo(() => buildFunnelData(totals), [totals]);

  const totalFollowers = useMemo(() => {
    if (!platformData) return 0;
    return platformData.reduce((sum, p) => sum + p.followers, 0);
  }, [platformData]);

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">Performance insights across all platforms</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
              Sync Now
            </Button>
            <SyncStatusBadge lastSyncAt={lastSyncTime ?? null} isLoading={syncTimeLoading} />
          </div>
        </div>

        {/* Date Range Filter */}
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onRangeChange={handleDateChange}
          companyCreatedAt={company?.created_at}
        />

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" className="gap-1.5"><BarChart3 className="w-4 h-4" /> Overview</TabsTrigger>
            <TabsTrigger value="platforms" className="gap-1.5"><Layers className="w-4 h-4" /> Platforms</TabsTrigger>
            <TabsTrigger value="engagement" className="gap-1.5"><Heart className="w-4 h-4" /> Engagement</TabsTrigger>
            <TabsTrigger value="audience" className="gap-1.5"><UserCheck className="w-4 h-4" /> Audience</TabsTrigger>
            <TabsTrigger value="posts" className="gap-1.5"><Eye className="w-4 h-4" /> All Posts</TabsTrigger>
            <TabsTrigger value="outlets" className="gap-1.5"><Building2 className="w-4 h-4" /> Outlets</TabsTrigger>
          </TabsList>

          {/* ── Overview Tab ── */}
          <TabsContent value="overview" className="space-y-6">
            <AnalyticsErrorBoundary>
              {/* KPI Sparklines */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {pdmLoading ? (
                  <>
                    <WidgetSkeleton /><WidgetSkeleton /><WidgetSkeleton /><WidgetSkeleton />
                  </>
                ) : (
                  <>
                    <StatSparklineWidget
                      title="Views"
                      value={totals.views}
                      change={changes.views}
                      sparklineData={sparklines.views}
                      color={premiumColors.deepPurple}
                      icon={<Eye className="w-4 h-4" />}
                    />
                    <StatSparklineWidget
                      title="Followers"
                      value={growth?.totalFollowers ?? 0}
                      change={growth?.changePercent}
                      sparklineData={growth?.dataPoints?.map(d => ({ x: d.date, y: d.followers })) ?? []}
                      color={premiumColors.electricBlue}
                      icon={<Users className="w-4 h-4" />}
                    />
                    <StatSparklineWidget
                      title="Clicks"
                      value={totals.clicks}
                      change={changes.clicks}
                      sparklineData={sparklines.clicks}
                      color={premiumColors.magenta}
                      icon={<MousePointer className="w-4 h-4" />}
                    />
                    <StatSparklineWidget
                      title="Engagement Rate"
                      value={`${(pdm && pdm.length > 0 ? pdm[pdm.length - 1].engagementRate : 0).toFixed(1)}%`}
                      change={changes.engagement}
                      sparklineData={sparklines.engagement}
                      color={premiumColors.amber}
                      icon={<TrendingUp className="w-4 h-4" />}
                    />
                  </>
                )}
              </div>

              {/* Area Trend + Funnel */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {pdmLoading ? (
                  <>
                    <WidgetSkeleton /><WidgetSkeleton />
                  </>
                ) : (
                  <>
                    <AreaTrendWidget
                      title="Views & Engagement Trend"
                      data={areaTrend}
                    />
                    <FunnelWidget
                      title="Conversion Funnel"
                      data={funnel}
                    />
                  </>
                )}
              </div>
            </AnalyticsErrorBoundary>
          </TabsContent>

          {/* ── Platforms Tab ── */}
          <TabsContent value="platforms" className="space-y-6">
            <AnalyticsErrorBoundary>
              {platformLoading ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <WidgetSkeleton /><WidgetSkeleton /><WidgetSkeleton />
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <DonutKpiWidget
                    title="Follower Distribution"
                    data={donut}
                    centerValue={`${(totalFollowers / 1000).toFixed(1)}K`}
                    centerLabel="Total"
                  />
                  <TreemapWidget
                    title="Engagement by Platform"
                    data={treemap}
                  />
                  <GaugeWidget
                    title="Engagement Rate by Platform"
                    data={gauge}
                    maxValue={100}
                  />
                </div>
              )}
            </AnalyticsErrorBoundary>
          </TabsContent>

          {/* ── Engagement Tab ── */}
          <TabsContent value="engagement" className="space-y-6">
            <AnalyticsErrorBoundary>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <BarComparisonWidget
                  title="Content Decay"
                  data={decayBars}
                  keys={["count"]}
                  indexBy="bucket"
                />
                <HeatmapWidget
                  title="Best Times to Post"
                  data={heatmap}
                />
              </div>
              {companyId && (
                <OptimalPostingWidget companyId={companyId} />
              )}
            </AnalyticsErrorBoundary>
          </TabsContent>

          {/* ── Audience Tab ── */}
          <TabsContent value="audience" className="space-y-6">
            <AnalyticsErrorBoundary>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {growthLoading ? (
                  <>
                    <WidgetSkeleton /><WidgetSkeleton />
                  </>
                ) : (
                  <>
                    <StatSparklineWidget
                      title="Total Followers"
                      value={growth?.totalFollowers ?? 0}
                      change={growth?.changePercent}
                      sparklineData={growth?.dataPoints?.map(d => ({ x: d.date, y: d.followers })) ?? []}
                      color={premiumColors.electricBlue}
                      icon={<Users className="w-4 h-4" />}
                      secondaryLabel="Net Change"
                      secondaryValue={growth?.followerChange ?? 0}
                    />
                    <AreaTrendWidget
                      title="Follower Growth"
                      data={followerTrend}
                    />
                  </>
                )}
              </div>
            </AnalyticsErrorBoundary>
          </TabsContent>

          {/* ── All Posts Tab ── */}
          <TabsContent value="posts" className="space-y-6">
            <AnalyticsErrorBoundary>
              <TopPostsTable
                posts={allPosts || topPosts || []}
                isLoading={allPostsLoading || topPostsLoading}
              />
            </AnalyticsErrorBoundary>
          </TabsContent>

          {/* ── Outlets Tab ── */}
          <TabsContent value="outlets" className="space-y-6">
            <AnalyticsErrorBoundary>
              <CrossOutletAnalytics mediaCompanyId={companyId || null} />
            </AnalyticsErrorBoundary>
          </TabsContent>
        </Tabs>
      </div>

      {/* Sync overlay */}
      <SyncingIndicator
        isSyncing={syncMutation.isPending}
        lastSyncResult={syncMutation.data ?? null}
      />
    </DashboardLayout>
  );
}
