import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ResponsiveLine } from "@nivo/line";
import { ResponsiveBar } from "@nivo/bar";
import { ResponsivePie } from "@nivo/pie";
import { ResponsiveHeatMap } from "@nivo/heatmap";
import { ResponsiveRadar } from "@nivo/radar";
import { ResponsiveBump } from "@nivo/bump";
import { ResponsiveFunnel } from "@nivo/funnel";
import {
  nivoTheme,
  chartColors,
  chartGradientDefs,
  chartFillRules,
  seriesColors,
} from "@/lib/nivo-theme";

/* ── Sample Data ────────────────────────────────────────── */

const lineData = [
  {
    id: "Views",
    data: [
      { x: "Jan", y: 4200 }, { x: "Feb", y: 5800 }, { x: "Mar", y: 5100 },
      { x: "Apr", y: 7400 }, { x: "May", y: 6800 }, { x: "Jun", y: 9200 },
      { x: "Jul", y: 8700 }, { x: "Aug", y: 11200 },
    ],
  },
  {
    id: "Likes",
    data: [
      { x: "Jan", y: 1200 }, { x: "Feb", y: 1600 }, { x: "Mar", y: 1400 },
      { x: "Apr", y: 2100 }, { x: "May", y: 1900 }, { x: "Jun", y: 2600 },
      { x: "Jul", y: 2400 }, { x: "Aug", y: 3100 },
    ],
  },
];

const barData = [
  { platform: "LinkedIn", Views: 12400, Engagement: 3200 },
  { platform: "Twitter", Views: 8900, Engagement: 2100 },
  { platform: "Instagram", Views: 15600, Engagement: 5400 },
  { platform: "Facebook", Views: 6700, Engagement: 1800 },
  { platform: "TikTok", Views: 21000, Engagement: 7200 },
];

const pieData = [
  { id: "LinkedIn", label: "LinkedIn", value: 32, color: chartColors.linkedin },
  { id: "Twitter", label: "Twitter", value: 18, color: chartColors.twitter },
  { id: "Instagram", label: "Instagram", value: 28, color: chartColors.instagram },
  { id: "Facebook", label: "Facebook", value: 12, color: chartColors.facebook },
  { id: "TikTok", label: "TikTok", value: 10, color: chartColors.tiktok },
];

const radarData = [
  { metric: "Reach", LinkedIn: 85, Twitter: 60, Instagram: 92, Facebook: 45 },
  { metric: "Engagement", LinkedIn: 70, Twitter: 55, Instagram: 88, Facebook: 40 },
  { metric: "Clicks", LinkedIn: 90, Twitter: 50, Instagram: 65, Facebook: 35 },
  { metric: "Shares", LinkedIn: 65, Twitter: 75, Instagram: 50, Facebook: 30 },
  { metric: "Saves", LinkedIn: 40, Twitter: 30, Instagram: 80, Facebook: 20 },
];

const heatmapData = [
  { id: "Mon", data: [{ x: "6am", y: 12 }, { x: "9am", y: 45 }, { x: "12pm", y: 78 }, { x: "3pm", y: 92 }, { x: "6pm", y: 65 }, { x: "9pm", y: 38 }] },
  { id: "Tue", data: [{ x: "6am", y: 8 }, { x: "9am", y: 52 }, { x: "12pm", y: 85 }, { x: "3pm", y: 70 }, { x: "6pm", y: 58 }, { x: "9pm", y: 42 }] },
  { id: "Wed", data: [{ x: "6am", y: 15 }, { x: "9am", y: 60 }, { x: "12pm", y: 90 }, { x: "3pm", y: 88 }, { x: "6pm", y: 72 }, { x: "9pm", y: 50 }] },
  { id: "Thu", data: [{ x: "6am", y: 10 }, { x: "9am", y: 48 }, { x: "12pm", y: 82 }, { x: "3pm", y: 95 }, { x: "6pm", y: 68 }, { x: "9pm", y: 35 }] },
  { id: "Fri", data: [{ x: "6am", y: 5 }, { x: "9am", y: 38 }, { x: "12pm", y: 72 }, { x: "3pm", y: 80 }, { x: "6pm", y: 55 }, { x: "9pm", y: 28 }] },
  { id: "Sat", data: [{ x: "6am", y: 3 }, { x: "9am", y: 20 }, { x: "12pm", y: 45 }, { x: "3pm", y: 50 }, { x: "6pm", y: 62 }, { x: "9pm", y: 70 }] },
  { id: "Sun", data: [{ x: "6am", y: 2 }, { x: "9am", y: 15 }, { x: "12pm", y: 35 }, { x: "3pm", y: 42 }, { x: "6pm", y: 58 }, { x: "9pm", y: 75 }] },
];

const bumpData = [
  { id: "LinkedIn", data: [{ x: "Week 1", y: 3 }, { x: "Week 2", y: 2 }, { x: "Week 3", y: 1 }, { x: "Week 4", y: 1 }] },
  { id: "Twitter", data: [{ x: "Week 1", y: 2 }, { x: "Week 2", y: 3 }, { x: "Week 3", y: 4 }, { x: "Week 4", y: 3 }] },
  { id: "Instagram", data: [{ x: "Week 1", y: 1 }, { x: "Week 2", y: 1 }, { x: "Week 3", y: 2 }, { x: "Week 4", y: 2 }] },
  { id: "Facebook", data: [{ x: "Week 1", y: 4 }, { x: "Week 2", y: 4 }, { x: "Week 3", y: 3 }, { x: "Week 4", y: 4 }] },
];

const funnelData = [
  { id: "Impressions", value: 52000, label: "Impressions" },
  { id: "Reach", value: 38000, label: "Reach" },
  { id: "Clicks", value: 12000, label: "Clicks" },
  { id: "Engagement", value: 5400, label: "Engagement" },
  { id: "Conversions", value: 1200, label: "Conversions" },
];

/* ── Card wrapper ───────────────────────────────────────── */
function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 animate-fade-in">
      <div className="mb-4">
        <h3 className="font-display font-semibold text-base text-card-foreground">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="h-[320px]">{children}</div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────── */
export default function NivoShowcase() {
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-foreground">
          Chart Showcase
        </h1>
        <p className="text-muted-foreground mt-1">
          A sampling of Nivo chart types with the shared design-token theme.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1 — Line / Area */}
        <ChartCard
          title="Line / Area Chart"
          description="Views & likes over time with gradient fills"
        >
          <ResponsiveLine
            data={lineData}
            theme={nivoTheme}
            colors={[chartColors.primary, chartColors.accent]}
            margin={{ top: 10, right: 20, bottom: 30, left: 50 }}
            xScale={{ type: "point" }}
            yScale={{ type: "linear", min: 0, max: "auto" }}
            curve="monotoneX"
            axisBottom={{ tickSize: 0, tickPadding: 8 }}
            axisLeft={{
              tickSize: 0,
              tickPadding: 8,
              format: (v) =>
                Number(v) >= 1000
                  ? `${(Number(v) / 1000).toFixed(0)}k`
                  : String(v),
            }}
            enableGridX={false}
            lineWidth={2.5}
            enablePoints={false}
            enableArea
            areaOpacity={1}
            defs={chartGradientDefs}
            fill={chartFillRules}
            useMesh
            crosshairType="x"
          />
        </ChartCard>

        {/* 2 — Bar (grouped) */}
        <ChartCard
          title="Grouped Bar Chart"
          description="Views & engagement by platform"
        >
          <ResponsiveBar
            data={barData}
            theme={nivoTheme}
            keys={["Views", "Engagement"]}
            indexBy="platform"
            colors={[chartColors.primary, chartColors.accent]}
            margin={{ top: 10, right: 20, bottom: 30, left: 50 }}
            padding={0.35}
            borderRadius={6}
            axisBottom={{ tickSize: 0, tickPadding: 8 }}
            axisLeft={{
              tickSize: 0,
              tickPadding: 8,
              format: (v) =>
                Number(v) >= 1000
                  ? `${(Number(v) / 1000).toFixed(0)}k`
                  : String(v),
            }}
            enableGridX={false}
            enableLabel={false}
            groupMode="grouped"
          />
        </ChartCard>

        {/* 3 — Pie / Donut */}
        <ChartCard
          title="Donut Chart"
          description="Content distribution by platform"
        >
          <ResponsivePie
            data={pieData}
            theme={nivoTheme}
            colors={{ datum: "data.color" }}
            margin={{ top: 20, right: 80, bottom: 20, left: 80 }}
            innerRadius={0.55}
            padAngle={1.5}
            cornerRadius={6}
            borderWidth={0}
            enableArcLinkLabels
            arcLinkLabelsSkipAngle={10}
            arcLinkLabelsTextColor="hsl(220 9% 46%)"
            arcLinkLabelsColor={{ from: "color" }}
            arcLinkLabelsThickness={2}
            arcLabelsSkipAngle={10}
            arcLabelsTextColor="hsl(0 0% 100%)"
          />
        </ChartCard>

        {/* 4 — Radar */}
        <ChartCard
          title="Radar Chart"
          description="Platform strength across key metrics"
        >
          <ResponsiveRadar
            data={radarData}
            theme={nivoTheme}
            keys={["LinkedIn", "Twitter", "Instagram", "Facebook"]}
            indexBy="metric"
            colors={[
              chartColors.linkedin,
              chartColors.twitter,
              chartColors.instagram,
              chartColors.facebook,
            ]}
            margin={{ top: 40, right: 60, bottom: 40, left: 60 }}
            borderWidth={2}
            borderColor={{ from: "color" }}
            dotSize={8}
            dotColor={{ theme: "background" }}
            dotBorderWidth={2}
            dotBorderColor={{ from: "color" }}
            fillOpacity={0.15}
            blendMode="multiply"
            gridLevels={4}
            gridShape="circular"
          />
        </ChartCard>

        {/* 5 — Heatmap */}
        <ChartCard
          title="Heatmap"
          description="Best posting times — engagement score by day & hour"
        >
          <ResponsiveHeatMap
            data={heatmapData}
            theme={nivoTheme}
            margin={{ top: 30, right: 30, bottom: 30, left: 50 }}
            axisTop={{
              tickSize: 0,
              tickPadding: 5,
            }}
            axisLeft={{
              tickSize: 0,
              tickPadding: 8,
            }}
            colors={{
              type: "sequential",
              scheme: "blues",
            }}
            borderRadius={4}
            borderWidth={2}
            borderColor="hsl(0 0% 100%)"
            labelTextColor={{
              from: "color",
              modifiers: [["darker", 2.4]],
            }}
            hoverTarget="cell"
            animate
          />
        </ChartCard>

        {/* 6 — Bump */}
        <ChartCard
          title="Bump Chart"
          description="Platform ranking changes week-over-week"
        >
          <ResponsiveBump
            data={bumpData}
            theme={nivoTheme}
            colors={[
              chartColors.linkedin,
              chartColors.twitter,
              chartColors.instagram,
              chartColors.facebook,
            ]}
            margin={{ top: 20, right: 100, bottom: 30, left: 50 }}
            lineWidth={3}
            activeLineWidth={5}
            inactiveLineWidth={2}
            inactiveOpacity={0.25}
            pointSize={10}
            activePointSize={14}
            pointColor={{ theme: "background" }}
            pointBorderWidth={3}
            activePointBorderWidth={3}
            pointBorderColor={{ from: "serie.color" }}
            axisBottom={{ tickSize: 0, tickPadding: 8 }}
            axisLeft={{ tickSize: 0, tickPadding: 8 }}
          />
        </ChartCard>

        {/* 7 — Funnel */}
        <ChartCard
          title="Funnel Chart"
          description="Content performance funnel — impressions to conversions"
        >
          <ResponsiveFunnel
            data={funnelData}
            theme={nivoTheme}
            colors={seriesColors}
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            borderWidth={0}
            labelColor="hsl(0 0% 100%)"
            enableBeforeSeparators={false}
            enableAfterSeparators={false}
            shapeBlending={0.7}
            spacing={4}
          />
        </ChartCard>
      </div>
    </DashboardLayout>
  );
}
