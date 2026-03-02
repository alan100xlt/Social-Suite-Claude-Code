import { useState, useMemo } from 'react';
import { subDays } from 'date-fns';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DateRangeFilter } from '@/components/analytics/DateRangeFilter';
import { SparklineKpiCard } from '@/components/charts/SparklineKpiCard';
import { ChartWidget } from '@/components/charts/ChartWidget';
import { OptimalPostingWidget } from '@/components/analytics/OptimalPostingWidget';
import { PlatformBreakdownList } from '@/components/analytics/PlatformBreakdownList';
import { ContentDecayWidget } from '@/components/analytics/ContentDecayWidget';
import { PostingFrequencyWidget } from '@/components/analytics/PostingFrequencyWidget';
import { TopPostsTable } from '@/components/analytics/TopPostsTable';
import { useHistoricalAnalytics } from '@/hooks/useHistoricalAnalytics';
import { useAnalyticsByPublishDate } from '@/hooks/useAnalyticsByPublishDate';
import { useAccountGrowth } from '@/hooks/useAccountGrowth';
import { useCompany } from '@/hooks/useCompany';
import { useBestTimeToPost } from '@/hooks/useBestTimeToPost';
import { useTopPerformingPosts } from '@/hooks/useTopPerformingPosts';
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

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOUR_LABELS: Record<number, string> = {
  0: '12am', 3: '3am', 6: '6am', 9: '9am', 12: '12pm', 15: '3pm', 18: '6pm', 21: '9pm',
};
const KEY_HOURS = [0, 3, 6, 9, 12, 15, 18, 21];

export default function AnalyticsV3() {
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [preset, setPreset] = useState<ChartPresetId>('brand');
  const { data: company } = useCompany();

  const { data: analytics } = useHistoricalAnalytics({ startDate, endDate });
  const { data: publishDateMetrics } = useAnalyticsByPublishDate({ startDate, endDate });
  const { data: growth } = useAccountGrowth({ days: 30 });
  const { data: bestTimeSlots } = useBestTimeToPost();
  const { data: topPosts, isLoading: topPostsLoading } = useTopPerformingPosts({ limit: 10, days: 30 });

  // Suppress unused warning — analytics used for potential future expansion
  void analytics;

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

  // Best time heatmap — convert slots to heatmap format
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

  // Top 3 best time chips
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

        {/* Platform breakdown + Best time heatmap */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PlatformBreakdownList startDate={startDate} endDate={endDate} />

          <div className="space-y-2">
            <ChartWidget
              type="heatmap"
              title="Best Time to Post"
              subtitle="Avg engagement by day & hour (UTC)"
              preset={preset}
              data={bestTimeHeatmap}
              height={220}
              isEmpty={bestTimeHeatmap.length === 0}
              emptyMessage="Sync analytics to see best posting times"
            />
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
        </div>

        {/* Top performing posts */}
        <TopPostsTable
          posts={topPosts || []}
          isLoading={topPostsLoading}
        />

        {/* Content decay + Posting frequency */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ContentDecayWidget />
          <PostingFrequencyWidget />
        </div>

        {/* Optimal posting — narrative summary */}
        {company && <OptimalPostingWidget companyId={company.id} />}
      </div>
    </DashboardLayout>
  );
}
