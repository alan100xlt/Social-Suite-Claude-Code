import { ResponsiveLine, type LineSeries } from "@nivo/line";
import { nivoTheme, chartColors, chartGradientDefs } from "@/lib/nivo-theme";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DailyMetrics {
  date: string;
  likes: number;
  comments: number;
  shares: number;
}

interface Props {
  data: DailyMetrics[] | undefined;
  title?: string;
  compact?: boolean;
}

function CustomTooltip({ point }: { point: any }) {
  return (
    <div className="bg-background border border-border rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-foreground mb-1">
        {format(new Date(point.data.x), "MMM d, yyyy")}
      </p>
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: point.serieColor }} />
        <span className="text-muted-foreground">{point.serieId}:</span>
        <span className="font-medium text-foreground">{Number(point.data.y).toLocaleString()}</span>
      </div>
    </div>
  );
}

const engagementColors = {
  Likes: chartColors.accentWarm,
  Comments: chartColors.twitter,
  Shares: chartColors.success,
};

export function EngagementStackedArea({ data, title = "Engagement Breakdown", compact = false }: Props) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent>
          <div className={compact ? "h-[200px]" : "h-[300px]"} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p className="text-sm text-muted-foreground">No engagement data yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const series: LineSeries[] = [
    { id: "Likes", data: data.map((d) => ({ x: d.date, y: d.likes })) },
    { id: "Comments", data: data.map((d) => ({ x: d.date, y: d.comments })) },
    { id: "Shares", data: data.map((d) => ({ x: d.date, y: d.shares })) },
  ];

  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <div className={compact ? "h-[200px]" : "h-[300px]"}>
          <ResponsiveLine
            data={series}
            theme={nivoTheme}
            colors={[engagementColors.Likes, engagementColors.Comments, engagementColors.Shares]}
            margin={{ top: 10, right: 20, bottom: 40, left: 50 }}
            xScale={{ type: "time", format: "%Y-%m-%d", precision: "day" }}
            xFormat="time:%Y-%m-%d"
            yScale={{ type: "linear", stacked: true, min: 0, max: "auto" }}
            axisBottom={{
              format: (v) => format(new Date(v), "MMM d"),
              tickSize: 0,
              tickPadding: 8,
              tickValues: compact ? "every 14 days" : "every 7 days",
            }}
            axisLeft={{
              tickSize: 0,
              tickPadding: 8,
              format: (v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)),
            }}
            curve="monotoneX"
            enableArea
            areaOpacity={0.2}
            pointSize={0}
            enableCrosshair
            useMesh
            tooltip={({ point }) => <CustomTooltip point={point} />}
            enableGridX={false}
          />
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
          {Object.entries(engagementColors).map(([label, color]) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-sm text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
