import { ResponsiveLine, type LineSeries } from "@nivo/line";
import { nivoTheme, chartColors, chartGradientDefs } from "@/lib/nivo-theme";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MousePointerClick, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface DailyMetrics {
  date: string;
  clicks: number;
}

interface Props {
  data: DailyMetrics[] | undefined;
  totalClicks?: number;
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
        <span className="text-muted-foreground">Clicks:</span>
        <span className="font-medium text-foreground">{Number(point.data.y).toLocaleString()}</span>
      </div>
    </div>
  );
}

const formatNumber = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
};

export function ClicksOverTimeLine({ data, totalClicks = 0, compact = false }: Props) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Link Clicks</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No click data yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const series: LineSeries[] = [
    { id: "Clicks", data: data.map((d) => ({ x: d.date, y: d.clicks })) },
  ];

  // Compute period change
  const mid = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, mid).reduce((s, d) => s + d.clicks, 0);
  const secondHalf = data.slice(mid).reduce((s, d) => s + d.clicks, 0);
  const change = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
              <MousePointerClick className="w-4 h-4 text-warning" />
            </div>
            <div>
              <CardTitle className="text-base">Link Clicks</CardTitle>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xl font-bold">{formatNumber(totalClicks)}</span>
                {change !== 0 && (
                  <span className={cn("text-xs font-medium flex items-center gap-0.5", change >= 0 ? "text-success" : "text-destructive")}>
                    {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {change >= 0 ? "+" : ""}{change.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className={compact ? "h-[160px]" : "h-[200px]"}>
          <ResponsiveLine
            data={series}
            theme={nivoTheme}
            colors={[chartColors.warning]}
            margin={{ top: 5, right: 10, bottom: 30, left: 40 }}
            xScale={{ type: "time", format: "%Y-%m-%d", precision: "day" }}
            xFormat="time:%Y-%m-%d"
            yScale={{ type: "linear", stacked: false, min: 0, max: "auto" }}
            axisBottom={{
              format: (v) => format(new Date(v), "MMM d"),
              tickSize: 0,
              tickPadding: 8,
              tickValues: "every 7 days",
            }}
            axisLeft={{
              tickSize: 0,
              tickPadding: 8,
              format: (v) => (Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(0)}K` : String(v)),
            }}
            curve="monotoneX"
            enableArea
            areaOpacity={0.15}
            pointSize={0}
            enableCrosshair
            useMesh
            tooltip={({ point }) => <CustomTooltip point={point} />}
            enableGridX={false}
          />
        </div>
      </CardContent>
    </Card>
  );
}
