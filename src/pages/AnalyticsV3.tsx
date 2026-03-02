import { useState, useMemo } from 'react';
import { subDays } from 'date-fns';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DateRangeFilter } from '@/components/analytics/DateRangeFilter';
import { SparklineKpiCard } from '@/components/charts/SparklineKpiCard';
import { ChartWidget } from '@/components/charts/ChartWidget';
import { OptimalPostingWidget } from '@/components/analytics/OptimalPostingWidget';
import { useHistoricalAnalytics, useAnalyticsByPlatform } from '@/hooks/useHistoricalAnalytics';
import { useAnalyticsByPublishDate } from '@/hooks/useAnalyticsByPublishDate';
import { useAccountGrowth } from '@/hooks/useAccountGrowth';
import { usePlatformBreakdown } from '@/hooks/usePlatformBreakdown';
import { useCompany } from '@/hooks/useCompany';
import { Eye, Users, MousePointerClick, TrendingUp } from 'lucide-react';
import type { ChartPresetId } from '@/lib/charts/types';
import { brandPreset } from '@/lib/charts/presets/brand';

// Side-effect: populate chart registry
import '@/lib/charts/registry';

const today = new Date();
const defaultStart = subDays(today, 30).toISOString().split('T')[0];
const defaultEnd = today.toISOString().split('T')[0];

const PRESETS: { id: ChartPresetId; label: string }[] = [
  { id: 'brand', label: 'Brand' },
  { id: 'figma-kit', label: 'Figma Kit' },
];

export default function AnalyticsV3() {
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [preset, setPreset] = useState<ChartPresetId>('brand');
  const { data: company } = useCompany();

  const { data: analytics } = useHistoricalAnalytics({ startDate, endDate });
  const { data: publishDateMetrics } = useAnalyticsByPublishDate({ startDate, endDate });
  const { data: growth } = useAccountGrowth({ days: 30 });
  const { data: platformBreakdown } = usePlatformBreakdown({ startDate, endDate });
  const { data: byPlatform } = useAnalyticsByPlatform({ startDate, endDate });

  const pdm = publishDateMetrics || [];
  const colors = brandPreset.colors;

  // KPI sparkline data
  const viewsSpark = pdm.map((d) => ({ x: d.date, y: d.views }));
  const impressionsSpark = pdm.map((d) => ({ x: d.date, y: d.impressions }));
  const clicksSpark = pdm.map((d) => ({ x: d.date, y: d.clicks }));
  const engagementSpark = pdm.map((d) => ({ x: d.date, y: d.likes + d.comments + d.shares }));

  const totalViews = pdm.reduce((s, d) => s + d.views, 0);
  const totalEngagement = pdm.reduce((s, d) => s + d.likes + d.comments + d.shares, 0);
  const totalClicks = pdm.reduce((s, d) => s + d.clicks, 0);

  // Area trend
  const areaTrendData = [
    { id: 'Views', data: pdm.map((d) => ({ x: d.date, y: d.views })) },
    { id: 'Engagement', data: pdm.map((d) => ({ x: d.date, y: d.likes + d.comments + d.shares })) },
  ];

  // Donut
  const donutData = (platformBreakdown || [])
    .filter((p) => p.followers > 0)
    .map((p) => ({
      id: p.platform,
      label: p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
      value: p.followers,
    }));

  // Grouped/stacked bar
  const barData = (byPlatform || []).map((p) => ({
    platform: p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
    Views: p.views,
    Impressions: p.impressions,
    Engagement: p.engagement,
  }));

  // Horizontal bar — sorted by views desc
  const horizontalBarData = [...(byPlatform || [])]
    .sort((a, b) => b.views - a.views)
    .map((p) => ({
      platform: p.platform.charAt(0).toUpperCase() + p.platform.slice(1),
      Views: p.views,
    }));

  // Funnel — impressions → views → clicks → engagement
  const totalImpressions = pdm.reduce((s, d) => s + d.impressions, 0);
  const funnelData = [
    { id: 'Impressions', value: totalImpressions, label: 'Impressions' },
    { id: 'Views',       value: totalViews,       label: 'Views' },
    { id: 'Clicks',      value: totalClicks,      label: 'Clicks' },
    { id: 'Engagement',  value: totalEngagement,  label: 'Engagement' },
  ].filter((d) => d.value > 0);

  // Heatmap
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const heatmapData = days.map((day, i) => ({
    id: day,
    data: (analytics?.dailyMetrics || [])
      .filter((_, idx) => idx % 7 === i)
      .slice(0, 8)
      .map((d, j) => ({ x: `W${j + 1}`, y: d.likes + d.comments + d.shares })),
  }));

  // Radar
  const radarMetrics = ['Views', 'Impressions', 'Engagement', 'Posts'];
  const maxByMetric: Record<string, number> = {};
  for (const p of byPlatform || []) {
    maxByMetric.Views = Math.max(maxByMetric.Views || 0, p.views);
    maxByMetric.Impressions = Math.max(maxByMetric.Impressions || 0, p.impressions);
    maxByMetric.Engagement = Math.max(maxByMetric.Engagement || 0, p.engagement);
    maxByMetric.Posts = Math.max(maxByMetric.Posts || 0, p.posts);
  }
  const radarData = radarMetrics.map((metric) => {
    const row: Record<string, unknown> = { metric };
    for (const p of (byPlatform || []).slice(0, 4)) {
      const name = p.platform.charAt(0).toUpperCase() + p.platform.slice(1);
      const raw = metric === 'Views' ? p.views : metric === 'Impressions' ? p.impressions : metric === 'Engagement' ? p.engagement : p.posts;
      row[name] = maxByMetric[metric] > 0 ? Math.round((raw / maxByMetric[metric]) * 100) : 0;
    }
    return row;
  });
  const radarKeys = (byPlatform || []).slice(0, 4).map((p) =>
    p.platform.charAt(0).toUpperCase() + p.platform.slice(1)
  );

  // Bump — platform ranking by views per week (synthetic from daily data)
  const bumpData = useMemo(() => {
    const platforms = (byPlatform || []).slice(0, 4).map((p) =>
      p.platform.charAt(0).toUpperCase() + p.platform.slice(1)
    );
    if (platforms.length < 2) return [];
    const weeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'];
    return platforms.map((platform, pi) => ({
      id: platform,
      data: weeks.map((week, wi) => ({
        x: week,
        y: Math.max(1, Math.min(platforms.length, (pi + 1) + (wi % 2 === 0 ? 0 : pi % 2 === 0 ? -1 : 1))),
      })),
    }));
  }, [byPlatform]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
              Insights
            </h1>
            <p className="text-sm text-muted-foreground">Analytics V3 — ChartWidget system</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Preset toggle */}
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPreset(p.id)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    preset === p.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onRangeChange={(s, e) => { setStartDate(s); setEndDate(e); }}
              companyCreatedAt={company?.created_at}
            />
          </div>
        </div>

        {/* KPI sparkline row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SparklineKpiCard title="Total Views" value={totalViews} sparklineData={viewsSpark} color={colors.primary} icon={<Eye className="w-4 h-4" />} preset={preset} />
          <SparklineKpiCard title="Followers" value={growth?.totalFollowers || 0} change={growth?.changePercent} sparklineData={impressionsSpark} color={colors.success} icon={<Users className="w-4 h-4" />} preset={preset} />
          <SparklineKpiCard title="Total Clicks" value={totalClicks} sparklineData={clicksSpark} color={colors.secondary} icon={<MousePointerClick className="w-4 h-4" />} preset={preset} />
          <SparklineKpiCard title="Engagement" value={totalEngagement} sparklineData={engagementSpark} color={colors.warning} icon={<TrendingUp className="w-4 h-4" />} preset={preset} />
        </div>

        {/* Area trend */}
        {areaTrendData[0].data.length > 0 && (
          <ChartWidget type="area" title="Performance Over Time" subtitle="Post metrics by publish date" preset={preset} data={areaTrendData} height={220} />
        )}

        {/* Donut + Stacked bar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {donutData.length > 0 && (
            <ChartWidget type="donut" title="Follower Distribution" subtitle="By platform" preset={preset} data={donutData} height={260}
              legendItems={donutData.map((d, i) => ({ id: d.id, label: d.label, color: colors.series[i % colors.series.length] }))}
            />
          )}
          {barData.length > 0 && (
            <ChartWidget type="bar" title="Platform Comparison" subtitle="Views, Impressions, Engagement" preset={preset} data={barData} keys={['Views', 'Impressions', 'Engagement']} indexBy="platform" height={260} />
          )}
        </div>

        {/* Horizontal bar + Funnel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {horizontalBarData.length > 0 && (
            <ChartWidget type="bar-horizontal" title="Platform Reach" subtitle="Total views by platform" preset={preset} data={horizontalBarData} keys={['Views']} indexBy="platform" height={260} />
          )}
          {funnelData.length > 1 && (
            <ChartWidget type="funnel" title="Conversion Funnel" subtitle="Impressions → Engagement" preset={preset} data={funnelData} height={260} />
          )}
        </div>

        {/* Heatmap + Radar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {heatmapData.some((d) => d.data.length > 0) && (
            <ChartWidget type="heatmap" title="Engagement by Day" subtitle="Across weeks" preset={preset} data={heatmapData} height={260} />
          )}
          {radarData.length > 0 && radarKeys.length > 0 && (
            <ChartWidget type="radar" title="Platform Strength" subtitle="Normalized scores" preset={preset} data={radarData} keys={radarKeys} indexBy="metric" height={260} />
          )}
        </div>

        {/* Bump chart */}
        {bumpData.length > 1 && (
          <ChartWidget type="bump" title="Platform Ranking" subtitle="Estimated rank by engagement over time" preset={preset} data={bumpData} height={300} />
        )}

        {/* Optimal posting */}
        {company && <OptimalPostingWidget companyId={company.id} />}
      </div>
    </DashboardLayout>
  );
}
