import { useState } from "react";
import { subDays } from "date-fns";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DateRangeFilter } from "@/components/analytics/DateRangeFilter";
import {
  StatSparklineWidget,
  DonutKpiWidget,
  AreaTrendWidget,
  BarComparisonWidget,
  HeatmapWidget,
  RadarStrengthWidget,
} from "@/components/analytics-v2/widgets";
import { OptimalPostingWidget } from "@/components/analytics/OptimalPostingWidget";
import { useHistoricalAnalytics, useAnalyticsByPlatform } from "@/hooks/useHistoricalAnalytics";
import { useAnalyticsByPublishDate } from "@/hooks/useAnalyticsByPublishDate";
import { useAccountGrowth } from "@/hooks/useAccountGrowth";
import { useFollowersByPlatform } from "@/hooks/useFollowersByPlatform";
import { usePlatformBreakdown } from "@/hooks/usePlatformBreakdown";
import { useCompany } from "@/hooks/useCompany";
import { chartColors } from "@/lib/nivo-theme";
import { Eye, Users, MousePointerClick, TrendingUp } from "lucide-react";

const today = new Date();
const defaultStart = subDays(today, 30).toISOString().split("T")[0];
const defaultEnd = today.toISOString().split("T")[0];

export default function AnalyticsV2() {
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const { data: company } = useCompany();

  const handleRangeChange = (s: string, e: string) => {
    setStartDate(s);
    setEndDate(e);
  };

  const { data: analytics } = useHistoricalAnalytics({ startDate, endDate });
  const { data: publishDateMetrics } = useAnalyticsByPublishDate({ startDate, endDate });
  const { data: growth } = useAccountGrowth({ days: 30 });
  const { data: platformBreakdown } = usePlatformBreakdown({ startDate, endDate });
  const { data: followersByPlatform } = useFollowersByPlatform({ startDate, endDate });
  const { data: byPlatform } = useAnalyticsByPlatform({ startDate, endDate });

  // --- Sparkline data from publish-date metrics ---
  const pdm = publishDateMetrics || [];
  const viewsSpark = pdm.map((d) => ({ x: d.date, y: d.views }));
  const impressionsSpark = pdm.map((d) => ({ x: d.date, y: d.impressions }));
  const clicksSpark = pdm.map((d) => ({ x: d.date, y: d.clicks }));
  const engagementSpark = pdm.map((d) => ({
    x: d.date,
    y: d.likes + d.comments + d.shares,
  }));

  // --- Donut data from platform breakdown ---
  const donutData = (platformBreakdown || [])
    .filter((p) => p.followers > 0)
    .map((p) => ({
      id: p.platform,
      label: p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
      value: p.followers,
    }));

  // --- Area trend from publish-date metrics (pass full dates for formatting) ---
  const totalViews = pdm.reduce((s, d) => s + d.views, 0);
  const totalEngagement = pdm.reduce((s, d) => s + d.likes + d.comments + d.shares, 0);

  const areaTrendData = [
    {
      id: "Views",
      data: pdm.map((d) => ({ x: d.date, y: d.views })),
    },
    {
      id: "Engagement",
      data: pdm.map((d) => ({
        x: d.date,
        y: d.likes + d.comments + d.shares,
      })),
    },
  ];

  const areaSeries = [
    { id: "Views", color: chartColors.primary, label: "Views", total: totalViews },
    { id: "Engagement", color: chartColors.accent, label: "Engagement", total: totalEngagement },
  ];

  // --- Bar comparison data ---
  const barData = (byPlatform || []).map((p) => ({
    platform: p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
    Views: p.views,
    Impressions: p.impressions,
    Engagement: p.engagement,
  }));

  // --- Heatmap placeholder (day x metric) ---
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const heatmapData = days.map((day, i) => ({
    id: day,
    data: (analytics?.dailyMetrics || [])
      .filter((_, idx) => idx % 7 === i)
      .slice(0, 8)
      .map((d, j) => ({ x: `W${j + 1}`, y: d.likes + d.comments + d.shares })),
  }));

  // --- Radar data ---
  const radarMetrics = ["Views", "Impressions", "Engagement", "Clicks", "Posts"];
  const maxByMetric: Record<string, number> = {};
  for (const p of byPlatform || []) {
    maxByMetric.Views = Math.max(maxByMetric.Views || 0, p.views);
    maxByMetric.Impressions = Math.max(maxByMetric.Impressions || 0, p.impressions);
    maxByMetric.Engagement = Math.max(maxByMetric.Engagement || 0, p.engagement);
    maxByMetric.Clicks = Math.max(maxByMetric.Clicks || 0, 1);
    maxByMetric.Posts = Math.max(maxByMetric.Posts || 0, p.posts);
  }
  const radarData = radarMetrics.map((metric) => {
    const row: Record<string, unknown> = { metric };
    for (const p of (byPlatform || []).slice(0, 4)) {
      const name = p.platform.charAt(0).toUpperCase() + p.platform.slice(1);
      const raw =
        metric === "Views" ? p.views :
        metric === "Impressions" ? p.impressions :
        metric === "Engagement" ? p.engagement :
        metric === "Clicks" ? 0 :
        p.posts;
      row[name] = maxByMetric[metric] > 0 ? Math.round((raw / maxByMetric[metric]) * 100) : 0;
    }
    return row;
  });
  const radarKeys = (byPlatform || []).slice(0, 4).map((p) =>
    p.platform.charAt(0).toUpperCase() + p.platform.slice(1)
  );

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
            >
              Insights
            </h1>
            <p className="text-sm text-muted-foreground">
              Premium analytics overview
            </p>
          </div>
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onRangeChange={handleRangeChange}
            companyCreatedAt={company?.created_at}
          />
        </div>

        {/* Stat sparkline row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatSparklineWidget
            title="Total Views"
            value={totalViews}
            sparklineData={viewsSpark}
            color={chartColors.primary}
            icon={<Eye className="w-4 h-4" />}
          />
          <StatSparklineWidget
            title="Followers"
            value={growth?.totalFollowers || 0}
            change={growth?.changePercent}
            sparklineData={impressionsSpark}
            color={chartColors.success}
            icon={<Users className="w-4 h-4" />}
          />
          <StatSparklineWidget
            title="Total Clicks"
            value={pdm.reduce((s, d) => s + d.clicks, 0)}
            sparklineData={clicksSpark}
            color={chartColors.accent}
            icon={<MousePointerClick className="w-4 h-4" />}
          />
          <StatSparklineWidget
            title="Engagement"
            value={totalEngagement}
            sparklineData={engagementSpark}
            color={chartColors.warning}
            icon={<TrendingUp className="w-4 h-4" />}
          />
        </div>

        {/* Area trend full width */}
        {areaTrendData[0].data.length > 0 && (
          <AreaTrendWidget
            title="Performance Over Time"
            subtitle="Post metrics by publish date"
            data={areaTrendData}
            series={areaSeries}
          />
        )}

        {/* Donut + Bar row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {donutData.length > 0 && (
            <DonutKpiWidget
              title="Follower Distribution"
              centerValue={growth?.totalFollowers || 0}
              centerLabel="Total"
              data={donutData}
            />
          )}
          {barData.length > 0 && (
            <BarComparisonWidget
              title="Platform Comparison"
              data={barData}
              keys={["Views", "Impressions", "Engagement"]}
              indexBy="platform"
            />
          )}
        </div>

        {/* Heatmap + Radar row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {heatmapData.some((d) => d.data.length > 0) && (
            <HeatmapWidget
              title="Engagement by Day"
              data={heatmapData}
            />
          )}
          {radarData.length > 0 && radarKeys.length > 0 && (
            <RadarStrengthWidget
              title="Platform Strength"
              data={radarData}
              keys={radarKeys}
              indexBy="metric"
            />
          )}
        </div>

        {/* Optimal Posting Times */}
        {company && (
          <OptimalPostingWidget
            companyId={company.id}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
