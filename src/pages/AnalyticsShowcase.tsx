import {
  StatSparklineWidget,
  AreaTrendWidget,
  BarComparisonWidget,
  DonutKpiWidget,
  HeatmapWidget,
  RadarStrengthWidget,
  TreemapWidget,
  SankeyWidget,
  BulletWidget,
  GaugeWidget,
  FunnelWidget,
  ChartCard,
  premiumColors,
} from "@/components/analytics-v2/widgets-v2";
import {
  TrendingUp,
  Users,
  MousePointerClick,
  Heart,
} from "lucide-react";

// ─── Demo data ───────────────────────────────────────────────────────────────

function generateSparkline(base: number, variance: number, points = 14) {
  return Array.from({ length: points }, (_, i) => ({
    x: String(i + 1).padStart(2, "0"),
    y: Math.round(base + (Math.random() - 0.4) * variance * (1 + i * 0.05)),
  }));
}

const sparkViews = generateSparkline(3200, 1800);
const sparkFollowers = generateSparkline(120, 60);
const sparkClicks = generateSparkline(480, 300);
const sparkEngagement = generateSparkline(5, 3);

// Area trend — 30 days, 2 series
const areaDays = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(2026, 1, 2 + i);
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
});
const areaTrendData = [
  {
    id: "Impressions",
    data: areaDays.map((x, i) => ({
      x,
      y: Math.round(4000 + Math.sin(i / 4) * 2000 + Math.random() * 1500),
    })),
  },
  {
    id: "Engagement",
    data: areaDays.map((x, i) => ({
      x,
      y: Math.round(800 + Math.cos(i / 3) * 400 + Math.random() * 300),
    })),
  },
];

// Bar comparison
const barData = [
  { platform: "LinkedIn", Views: 18400, Clicks: 1240, Shares: 620 },
  { platform: "Instagram", Views: 14200, Clicks: 980, Shares: 1450 },
  { platform: "Twitter", Views: 9800, Clicks: 640, Shares: 380 },
  { platform: "TikTok", Views: 22600, Clicks: 1860, Shares: 2100 },
  { platform: "Facebook", Views: 7200, Clicks: 310, Shares: 190 },
];

// Donut
const donutData = [
  { id: "linkedin", label: "LinkedIn", value: 4200 },
  { id: "instagram", label: "Instagram", value: 3800 },
  { id: "twitter", label: "Twitter", value: 1900 },
  { id: "tiktok", label: "TikTok", value: 5100 },
  { id: "facebook", label: "Facebook", value: 1400 },
];

// Heatmap — days × hours
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const hours = ["6am", "9am", "12pm", "3pm", "6pm", "9pm"];
const heatmapData = days.map((day) => ({
  id: day,
  data: hours.map((h) => ({
    x: h,
    y: Math.round(Math.random() * 100),
  })),
}));

// Radar
const radarData = [
  { metric: "Reach", LinkedIn: 82, Instagram: 67, TikTok: 91 },
  { metric: "Engagement", LinkedIn: 54, Instagram: 88, TikTok: 76 },
  { metric: "Clicks", LinkedIn: 71, Instagram: 43, TikTok: 62 },
  { metric: "Shares", LinkedIn: 39, Instagram: 72, TikTok: 85 },
  { metric: "Saves", LinkedIn: 28, Instagram: 76, TikTok: 44 },
  { metric: "Comments", LinkedIn: 45, Instagram: 63, TikTok: 58 },
];

// Treemap
const treemapData = {
  name: "Content",
  children: [
    {
      name: "Video",
      children: [
        { name: "Reels", value: 8400 },
        { name: "Long Form", value: 3200 },
        { name: "Stories", value: 5600 },
      ],
    },
    {
      name: "Image",
      children: [
        { name: "Carousel", value: 6100 },
        { name: "Single", value: 4300 },
        { name: "Infographic", value: 2800 },
      ],
    },
    {
      name: "Text",
      children: [
        { name: "Thread", value: 3400 },
        { name: "Poll", value: 1900 },
        { name: "Article", value: 2200 },
      ],
    },
  ],
};

// Sankey — content pipeline flow
const sankeyData = {
  nodes: [
    { id: "RSS Feeds" },
    { id: "Manual" },
    { id: "AI Generated" },
    { id: "Drafted" },
    { id: "Scheduled" },
    { id: "Published" },
    { id: "LinkedIn" },
    { id: "Instagram" },
    { id: "TikTok" },
    { id: "Twitter" },
  ],
  links: [
    { source: "RSS Feeds", target: "AI Generated", value: 340 },
    { source: "Manual", target: "Drafted", value: 120 },
    { source: "AI Generated", target: "Drafted", value: 310 },
    { source: "Drafted", target: "Scheduled", value: 380 },
    { source: "Scheduled", target: "Published", value: 350 },
    { source: "Published", target: "LinkedIn", value: 120 },
    { source: "Published", target: "Instagram", value: 95 },
    { source: "Published", target: "TikTok", value: 80 },
    { source: "Published", target: "Twitter", value: 55 },
  ],
};

// Bullet — KPI vs target
const bulletData = [
  { id: "Impressions", ranges: [10000, 30000, 60000], measures: [42000], markers: [50000] },
  { id: "Engagement", ranges: [2, 5, 10], measures: [6.8], markers: [8] },
  { id: "Click Rate", ranges: [1, 3, 6], measures: [3.2], markers: [4.5] },
  { id: "Followers", ranges: [500, 2000, 5000], measures: [3400], markers: [4000] },
];

// Gauge — platform health scores
const gaugeData = [
  { id: "LinkedIn", data: [{ x: "score", y: 78 }] },
  { id: "Instagram", data: [{ x: "score", y: 64 }] },
  { id: "TikTok", data: [{ x: "score", y: 89 }] },
  { id: "Twitter", data: [{ x: "score", y: 42 }] },
];

// Funnel — content conversion
const funnelData = [
  { id: "reach", label: "Reach", value: 48000 },
  { id: "impressions", label: "Impressions", value: 32000 },
  { id: "clicks", label: "Clicks", value: 8400 },
  { id: "leads", label: "Leads", value: 1200 },
  { id: "conversions", label: "Conversions", value: 340 },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AnalyticsShowcase() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/40 backdrop-blur-sm">
        <div className="mx-auto max-w-[1600px] px-6 py-8">
          <h1
            className="text-3xl font-extrabold tracking-tight"
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
          >
            Analytics Showcase
          </h1>
          <p className="mt-2 text-muted-foreground">
            Premium widget library — 11 chart types with glassmorphism cards,
            multi-stop gradients, and vibrant palettes.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-6 py-8 space-y-10">
        {/* ── Row 1: Stat sparklines ── */}
        <section>
          <SectionLabel>KPI Sparklines</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            <StatSparklineWidget
              title="Total Views"
              value="47.2K"
              change={12.3}
              sparklineData={sparkViews}
              color={premiumColors.electricBlue}
              icon={<TrendingUp className="h-4 w-4" />}
              secondaryLabel="Avg / day"
              secondaryValue="3.4K"
            />
            <StatSparklineWidget
              title="New Followers"
              value="1,842"
              change={8.7}
              sparklineData={sparkFollowers}
              color={premiumColors.emerald}
              icon={<Users className="h-4 w-4" />}
            />
            <StatSparklineWidget
              title="Link Clicks"
              value="6,480"
              change={-2.1}
              sparklineData={sparkClicks}
              color={premiumColors.coral}
              icon={<MousePointerClick className="h-4 w-4" />}
              chartType="bar"
            />
            <StatSparklineWidget
              title="Engagement Rate"
              value="5.4%"
              change={0.8}
              changeSuffix="pp"
              sparklineData={sparkEngagement}
              color={premiumColors.deepPurple}
              icon={<Heart className="h-4 w-4" />}
            />
          </div>
        </section>

        {/* ── Row 2: Area + Donut ── */}
        <section>
          <SectionLabel>Trends &amp; Distribution</SectionLabel>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <AreaTrendWidget
                title="Impressions vs Engagement"
                subtitle="Last 30 days"
                data={areaTrendData}
                height={360}
              />
            </div>
            <DonutKpiWidget
              title="Follower Distribution"
              centerValue="16.4K"
              centerLabel="Total Followers"
              data={donutData}
            />
          </div>
        </section>

        {/* ── Row 3: Bar + Radar ── */}
        <section>
          <SectionLabel>Platform Comparison</SectionLabel>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <BarComparisonWidget
              title="Cross-Platform Metrics"
              data={barData}
              keys={["Views", "Clicks", "Shares"]}
              indexBy="platform"
            />
            <RadarStrengthWidget
              title="Platform Strength"
              data={radarData}
              keys={["LinkedIn", "Instagram", "TikTok"]}
              indexBy="metric"
            />
          </div>
        </section>

        {/* ── Row 4: Heatmap (full width) ── */}
        <section>
          <SectionLabel>Engagement Heatmap</SectionLabel>
          <HeatmapWidget
            title="Best Times to Post"
            data={heatmapData}
          />
        </section>

        {/* ── Row 5: Treemap + Sankey ── */}
        <section>
          <SectionLabel>Content Breakdown &amp; Flow</SectionLabel>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <TreemapWidget
              title="Content Performance by Type"
              subtitle="Engagement by content format"
              data={treemapData}
              height={360}
            />
            <SankeyWidget
              title="Content Pipeline"
              subtitle="From source to platform"
              data={sankeyData}
              height={360}
            />
          </div>
        </section>

        {/* ── Row 6: Bullet + Gauge + Funnel ── */}
        <section>
          <SectionLabel>Goals, Health &amp; Conversion</SectionLabel>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <BulletWidget
              title="KPI vs Target"
              subtitle="Monthly goals"
              data={bulletData}
            />
            <GaugeWidget
              title="Platform Health"
              subtitle="Engagement score (0-100)"
              data={gaugeData}
              maxValue={100}
            />
            <FunnelWidget
              title="Content Funnel"
              subtitle="Reach → Conversion"
              data={funnelData}
              height={360}
            />
          </div>
        </section>

        {/* ── All widgets in ChartCards with stagger ── */}
        <section>
          <SectionLabel>Staggered Entrance Demo</SectionLabel>
          <p className="text-sm text-muted-foreground mb-4">
            Scroll here to see the glassmorphism cards with staggered entrance animation.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {["Deep Purple", "Electric Blue", "Coral", "Teal", "Emerald", "Amber"].map(
              (label, i) => {
                const colors = [
                  premiumColors.deepPurple,
                  premiumColors.electricBlue,
                  premiumColors.coral,
                  premiumColors.teal,
                  premiumColors.emerald,
                  premiumColors.amber,
                ];
                return (
                  <ChartCard
                    key={label}
                    animationIndex={i}
                    accentColor={colors[i]}
                    accentColorEnd={colors[(i + 1) % colors.length]}
                  >
                    <div className="h-24 flex items-center justify-center">
                      <span className="text-sm font-medium text-muted-foreground">
                        {label} — Card #{i + 1}
                      </span>
                    </div>
                  </ChartCard>
                );
              }
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-lg font-bold tracking-tight mb-4"
      style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
    >
      {children}
    </h2>
  );
}
