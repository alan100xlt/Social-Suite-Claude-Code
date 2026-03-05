import { useState, useMemo } from 'react';
import { subDays } from 'date-fns';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DateRangeFilter } from '@/components/analytics/DateRangeFilter';
import { StatSparklineWidget } from '@/components/analytics-v2/widgets-v2/StatSparklineWidget';
import { AreaTrendWidget } from '@/components/analytics-v2/widgets-v2/AreaTrendWidget';
import { DonutKpiWidget } from '@/components/analytics-v2/widgets-v2/DonutKpiWidget';
import { HeatmapWidget } from '@/components/analytics-v2/widgets-v2/HeatmapWidget';
import { BarComparisonWidget } from '@/components/analytics-v2/widgets-v2/BarComparisonWidget';
import { RadarStrengthWidget } from '@/components/analytics-v2/widgets-v2/RadarStrengthWidget';
import { FunnelWidget } from '@/components/analytics-v2/widgets-v2/FunnelWidget';
import { GaugeWidget } from '@/components/analytics-v2/widgets-v2/GaugeWidget';
import { TreemapWidget } from '@/components/analytics-v2/widgets-v2/TreemapWidget';
import { OptimalPostingWidget } from '@/components/analytics/OptimalPostingWidget';
import { TopPostsTable } from '@/components/analytics/TopPostsTable';
import { useAnalyticsByPublishDate } from '@/hooks/useAnalyticsByPublishDate';
import { useAccountGrowth } from '@/hooks/useAccountGrowth';
import { useCompany } from '@/hooks/useCompany';
import { useBestTimeToPost } from '@/hooks/useBestTimeToPost';
import { useTopPerformingPosts } from '@/hooks/useTopPerformingPosts';
import { usePlatformBreakdown } from '@/hooks/usePlatformBreakdown';
import { useContentDecay } from '@/hooks/useContentDecay';
import { usePostingFrequency } from '@/hooks/usePostingFrequency';
import { premiumColors } from '@/components/analytics-v2/widgets-v2/premium-theme';
import { Eye, Users, MousePointerClick, TrendingUp } from 'lucide-react';

const today = new Date();
const defaultStart = subDays(today, 30).toISOString().split('T')[0];
const defaultEnd = today.toISOString().split('T')[0];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOUR_LABELS: Record<number, string> = {
  0: '12am', 3: '3am', 6: '6am', 9: '9am', 12: '12pm', 15: '3pm', 18: '6pm', 21: '9pm',
};
const KEY_HOURS = [0, 3, 6, 9, 12, 15, 18, 21];

export default function AnalyticsV4() {
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const { data: company } = useCompany();

  const { data: publishDateMetrics } = useAnalyticsByPublishDate({ startDate, endDate });
  const { data: growth } = useAccountGrowth({ days: 30 });
  const { data: bestTimeSlots } = useBestTimeToPost();
  const { data: topPosts, isLoading: topPostsLoading } = useTopPerformingPosts({ limit: 10, days: 30 });
  const { data: platformData } = usePlatformBreakdown({ startDate, endDate });
  const { data: decayBuckets } = useContentDecay();
  const { data: frequencyData } = usePostingFrequency();

  const pdm = publishDateMetrics || [];

  // --- KPI sparkline data ---
  const viewsSpark = pdm.map((d) => ({ x: d.date, y: d.views }));
  const impressionsSpark = pdm.map((d) => ({ x: d.date, y: d.impressions }));
  const clicksSpark = pdm.map((d) => ({ x: d.date, y: d.clicks }));
  const engagementSpark = pdm.map((d) => ({ x: d.date, y: d.likes + d.comments + d.shares }));

  const totalViews = pdm.reduce((s, d) => s + d.views, 0);
  const totalImpressions = pdm.reduce((s, d) => s + d.impressions, 0);
  const totalEngagement = pdm.reduce((s, d) => s + d.likes + d.comments + d.shares, 0);
  const totalClicks = pdm.reduce((s, d) => s + d.clicks, 0);

  // Change % calculation: compare second half vs first half of the period
  const changePercent = useMemo(() => {
    if (pdm.length < 2) return { views: undefined, clicks: undefined, engagement: undefined };
    const mid = Math.floor(pdm.length / 2);
    const first = pdm.slice(0, mid);
    const second = pdm.slice(mid);
    const calc = (fn: (d: typeof pdm[0]) => number) => {
      const a = first.reduce((s, d) => s + fn(d), 0);
      const b = second.reduce((s, d) => s + fn(d), 0);
      return a > 0 ? ((b - a) / a) * 100 : undefined;
    };
    return {
      views: calc((d) => d.views),
      clicks: calc((d) => d.clicks),
      engagement: calc((d) => d.likes + d.comments + d.shares),
    };
  }, [pdm]);

  // --- Area trend ---
  const areaTrendData = [
    { id: 'Views', data: pdm.map((d) => ({ x: d.date, y: d.views })) },
    { id: 'Engagement', data: pdm.map((d) => ({ x: d.date, y: d.likes + d.comments + d.shares })) },
  ];

  // --- Donut: platform follower distribution ---
  const donutData = useMemo(() => {
    if (!platformData || platformData.length === 0) return [];
    return platformData.map((p) => ({
      id: p.platform,
      label: p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
      value: p.followers,
    }));
  }, [platformData]);

  const totalFollowers = useMemo(
    () => (platformData || []).reduce((s, p) => s + p.followers, 0),
    [platformData],
  );

  // --- Heatmap: best time to post ---
  const bestTimeHeatmap = useMemo(() => {
    if (!bestTimeSlots || bestTimeSlots.length === 0) return [];
    return DAYS.map((day, dayIdx) => ({
      id: day,
      data: KEY_HOURS.map((h) => {
        const slot = bestTimeSlots.find((s) => s.day_of_week === dayIdx && s.hour === h);
        return { x: HOUR_LABELS[h], y: slot?.avg_engagement ?? 0 };
      }),
    }));
  }, [bestTimeSlots]);

  // Top time chips
  const topTimeChips = useMemo(() => {
    if (!bestTimeSlots || bestTimeSlots.length === 0) return [];
    return [...bestTimeSlots]
      .filter((s) => s.post_count >= 2)
      .sort((a, b) => b.avg_engagement - a.avg_engagement)
      .slice(0, 3)
      .map((s) => {
        const day = DAYS[s.day_of_week];
        const nearestHour = KEY_HOURS.reduce((prev, h) =>
          Math.abs(h - s.hour) < Math.abs(prev - s.hour) ? h : prev, KEY_HOURS[0]);
        return `${day} ${HOUR_LABELS[nearestHour]}`;
      });
  }, [bestTimeSlots]);

  // --- Funnel: impressions → views → clicks → engagement ---
  const funnelData = useMemo(() => {
    if (pdm.length === 0) return [];
    return [
      { id: 'impressions', label: 'Impressions', value: totalImpressions },
      { id: 'views', label: 'Views', value: totalViews },
      { id: 'clicks', label: 'Clicks', value: totalClicks },
      { id: 'engagement', label: 'Engagement', value: totalEngagement },
    ].filter((d) => d.value > 0);
  }, [totalImpressions, totalViews, totalClicks, totalEngagement, pdm.length]);

  // --- Gauge: platform engagement scores ---
  const gaugeData = useMemo(() => {
    if (!platformData || platformData.length === 0) return [];
    return platformData
      .filter((p) => p.engagementRate > 0)
      .slice(0, 5)
      .map((p) => ({
        id: p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
        data: [{ x: 'score', y: Math.min(p.engagementRate * 100, 100) }],
      }));
  }, [platformData]);

  // --- Treemap: engagement by content type (views, likes, comments, shares per platform) ---
  const treemapData = useMemo(() => {
    if (!platformData || platformData.length === 0) return null;
    const children = platformData
      .filter((p) => p.totalEngagement > 0)
      .map((p) => ({
        name: p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
        value: p.totalEngagement,
      }));
    if (children.length === 0) return null;
    return { name: 'Engagement', children };
  }, [platformData]);

  // --- Bar comparison: content decay ---
  const decayBarData = useMemo(() => {
    if (!decayBuckets || decayBuckets.length === 0) return null;
    return {
      data: decayBuckets.map((b) => ({
        bucket: b.timeWindow,
        engagement: b.engagementPercentage,
      })),
      keys: ['engagement'] as string[],
    };
  }, [decayBuckets]);

  // --- Radar: posting frequency ---
  const radarData = useMemo(() => {
    if (!frequencyData || frequencyData.length === 0) return null;
    return {
      data: frequencyData.map((row) => ({
        platform: row.platform.charAt(0).toUpperCase() + row.platform.slice(1),
        'Posts/Week': row.posts_per_week,
        'Avg ER (%)': Number((row.average_engagement_rate * 100).toFixed(1)),
      })),
      keys: ['Posts/Week', 'Avg ER (%)'] as string[],
    };
  }, [frequencyData]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
              Insights
            </h1>
            <p className="text-sm text-muted-foreground">Analytics V4 — Premium Widgets</p>
          </div>
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onRangeChange={(s, e) => { setStartDate(s); setEndDate(e); }}
            companyCreatedAt={company?.created_at}
          />
        </div>

        {/* KPI sparkline row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatSparklineWidget
            title="Total Views"
            value={totalViews}
            change={changePercent.views}
            sparklineData={viewsSpark}
            color={premiumColors.deepPurple}
            icon={<Eye className="w-4 h-4" />}
          />
          <StatSparklineWidget
            title="Followers"
            value={growth?.totalFollowers || 0}
            change={growth?.changePercent}
            sparklineData={impressionsSpark}
            color={premiumColors.teal}
            icon={<Users className="w-4 h-4" />}
          />
          <StatSparklineWidget
            title="Total Clicks"
            value={totalClicks}
            change={changePercent.clicks}
            sparklineData={clicksSpark}
            color={premiumColors.electricBlue}
            icon={<MousePointerClick className="w-4 h-4" />}
          />
          <StatSparklineWidget
            title="Engagement"
            value={totalEngagement}
            change={changePercent.engagement}
            sparklineData={engagementSpark}
            color={premiumColors.coral}
            icon={<TrendingUp className="w-4 h-4" />}
          />
        </div>

        {/* Trends: area chart + donut */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {areaTrendData[0].data.length > 0 && (
            <div className="lg:col-span-2">
              <AreaTrendWidget
                title="Performance Over Time"
                subtitle="Post metrics by publish date"
                data={areaTrendData}
                height={320}
              />
            </div>
          )}
          {donutData.length > 0 && (
            <DonutKpiWidget
              title="Platform Distribution"
              centerValue={totalFollowers}
              centerLabel="followers"
              data={donutData}
            />
          )}
        </div>

        {/* Heatmap: best time to post */}
        {bestTimeHeatmap.length > 0 && (
          <div className="space-y-2">
            <HeatmapWidget title="Best Time to Post" data={bestTimeHeatmap} />
            {topTimeChips.length > 0 && (
              <div className="flex items-center gap-2 px-1">
                <span className="text-xs text-muted-foreground">Best times:</span>
                {topTimeChips.map((chip) => (
                  <span key={chip} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                    {chip}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* New widgets row: Funnel + Gauge + Treemap */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {funnelData.length > 0 && (
            <FunnelWidget
              title="Content Funnel"
              subtitle="Impressions to engagement pipeline"
              data={funnelData}
              height={280}
            />
          )}
          {gaugeData.length > 0 && (
            <GaugeWidget
              title="Platform Health"
              subtitle="Engagement rate by platform"
              data={gaugeData}
              height={280}
              maxValue={10}
            />
          )}
          {treemapData && (
            <TreemapWidget
              title="Engagement Breakdown"
              subtitle="Total engagement by platform"
              data={treemapData}
              height={280}
            />
          )}
        </div>

        {/* Content analysis: decay + frequency */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {decayBarData && (
            <BarComparisonWidget
              title="Content Decay"
              data={decayBarData.data}
              keys={decayBarData.keys}
              indexBy="bucket"
            />
          )}
          {radarData && (
            <RadarStrengthWidget
              title="Posting Frequency"
              data={radarData.data}
              keys={radarData.keys}
              indexBy="platform"
            />
          )}
        </div>

        {/* Top performing posts */}
        <TopPostsTable
          posts={topPosts || []}
          isLoading={topPostsLoading}
        />

        {/* Optimal posting — narrative summary */}
        {company && <OptimalPostingWidget companyId={company.id} />}
      </div>
    </DashboardLayout>
  );
}
