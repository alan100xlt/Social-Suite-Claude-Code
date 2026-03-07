import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  StatSparklineWidget,
  AreaTrendWidget,
  BarComparisonWidget,
  DonutKpiWidget,
  HeatmapWidget,
  RadarStrengthWidget,
  TreemapWidget,
  FunnelWidget,
  GaugeWidget,
  BulletWidget,
  SankeyWidget,
} from '@/components/analytics-v2/widgets-v2';

const sparkData = [30, 45, 28, 60, 55, 72, 65, 80, 70, 85];

const areaData = [
  { date: 'Jan', views: 400, engagement: 240 },
  { date: 'Feb', views: 300, engagement: 180 },
  { date: 'Mar', views: 600, engagement: 350 },
  { date: 'Apr', views: 800, engagement: 450 },
  { date: 'May', views: 500, engagement: 300 },
  { date: 'Jun', views: 900, engagement: 520 },
];

const barData = [
  { bucket: '0-1h', count: 45 },
  { bucket: '1-6h', count: 32 },
  { bucket: '6-24h', count: 18 },
  { bucket: '1-3d', count: 12 },
  { bucket: '3-7d', count: 8 },
  { bucket: '7d+', count: 4 },
];

const donutData = [
  { id: 'Facebook', label: 'Facebook', value: 3200, color: '#4267B2' },
  { id: 'Instagram', label: 'Instagram', value: 2800, color: '#E1306C' },
  { id: 'Twitter', label: 'Twitter', value: 1500, color: '#1DA1F2' },
  { id: 'LinkedIn', label: 'LinkedIn', value: 900, color: '#0077B5' },
];

const heatmapData = Array.from({ length: 7 }, (_, day) => ({
  id: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][day],
  data: Array.from({ length: 24 }, (_, hour) => ({
    x: `${hour}:00`,
    y: Math.floor(Math.random() * 100),
  })),
}));

const radarData = [
  { metric: 'Reach', LinkedIn: 80, Twitter: 60, Instagram: 90 },
  { metric: 'Engagement', LinkedIn: 65, Twitter: 75, Instagram: 85 },
  { metric: 'Growth', LinkedIn: 70, Twitter: 55, Instagram: 60 },
  { metric: 'Clicks', LinkedIn: 90, Twitter: 45, Instagram: 50 },
  { metric: 'Shares', LinkedIn: 50, Twitter: 80, Instagram: 70 },
];

const treemapData = [
  { id: 'Photos', value: 450, color: '#6366f1' },
  { id: 'Videos', value: 320, color: '#8b5cf6' },
  { id: 'Articles', value: 180, color: '#a78bfa' },
  { id: 'Stories', value: 120, color: '#c4b5fd' },
];

const funnelData = [
  { id: 'Impressions', label: 'Impressions', value: 10000 },
  { id: 'Clicks', label: 'Clicks', value: 4500 },
  { id: 'Engagement', label: 'Engagement', value: 2200 },
  { id: 'Conversions', label: 'Conversions', value: 800 },
];

const gaugeData = [
  { id: 'Facebook', value: 72, color: '#4267B2' },
  { id: 'Instagram', value: 85, color: '#E1306C' },
  { id: 'Twitter', value: 45, color: '#1DA1F2' },
];

const bulletData = [
  { id: 'Views', ranges: [0, 5000, 10000], measures: [7200], markers: [8000], title: 'Views' },
  { id: 'Clicks', ranges: [0, 1000, 3000], measures: [1800], markers: [2500], title: 'Clicks' },
];

const sankeyData = {
  nodes: [
    { id: 'Facebook' }, { id: 'Instagram' }, { id: 'Twitter' },
    { id: 'Clicks' }, { id: 'Shares' }, { id: 'Comments' },
  ],
  links: [
    { source: 'Facebook', target: 'Clicks', value: 40 },
    { source: 'Facebook', target: 'Shares', value: 25 },
    { source: 'Instagram', target: 'Clicks', value: 30 },
    { source: 'Instagram', target: 'Comments', value: 20 },
    { source: 'Twitter', target: 'Shares', value: 15 },
    { source: 'Twitter', target: 'Comments', value: 10 },
  ],
};

export default function NivoShowcase() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
            Premium Widget Showcase
          </h1>
          <p className="text-sm text-muted-foreground mt-1">All 11 premium widgets (widgets-v2)</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <StatSparklineWidget
            title="Views"
            value={12450}
            change={12.5}
            sparkData={sparkData}
            format="number"
          />

          <AreaTrendWidget
            title="Engagement Trend"
            data={areaData}
            keys={['views', 'engagement']}
            xKey="date"
          />

          <BarComparisonWidget
            title="Content Decay"
            data={barData}
            xKey="bucket"
            yKey="count"
          />

          <DonutKpiWidget
            title="Follower Distribution"
            data={donutData}
            centerLabel="8.4K"
          />

          <HeatmapWidget
            title="Best Times to Post"
            data={heatmapData}
          />

          <RadarStrengthWidget
            title="Platform Performance"
            data={radarData}
            keys={['LinkedIn', 'Twitter', 'Instagram']}
            indexBy="metric"
          />

          <TreemapWidget
            title="Content Mix"
            data={treemapData}
          />

          <FunnelWidget
            title="Conversion Funnel"
            data={funnelData}
          />

          <GaugeWidget
            title="Engagement Rate"
            data={gaugeData}
            maxValue={100}
          />

          <BulletWidget
            title="KPI Targets"
            data={bulletData}
          />

          <SankeyWidget
            title="Traffic Flow"
            data={sankeyData}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
