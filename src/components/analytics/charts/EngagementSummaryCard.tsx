import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { EngagementStackedArea } from "./EngagementStackedArea";

interface DailyMetrics {
  date: string;
  likes: number;
  comments: number;
  shares: number;
}

interface Props {
  data: DailyMetrics[] | undefined;
  totalEngagement: number;
  onViewDetails?: () => void;
}

const formatNumber = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
};

export function EngagementSummaryCard({ data, totalEngagement, onViewDetails }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">Engagement Summary</CardTitle>
          <p className="text-2xl font-bold mt-1">
            {formatNumber(totalEngagement)}
            <span className="text-sm font-normal text-muted-foreground ml-2">total</span>
          </p>
        </div>
        {onViewDetails && (
          <Button variant="ghost" size="sm" className="text-xs gap-1 shrink-0" onClick={onViewDetails}>
            View details <ArrowRight className="w-3 h-3" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No engagement data yet</p>
          </div>
        ) : (
          <div className="h-[200px]">
            {/* Render inline mini version without card wrapper */}
            <EngagementStackedAreaInline data={data} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Inline version without Card wrapper for embedding
import { ResponsiveLine, type LineSeries } from "@nivo/line";
import { nivoTheme, chartColors } from "@/lib/nivo-theme";
import { format } from "date-fns";

function EngagementStackedAreaInline({ data }: { data: DailyMetrics[] }) {
  const series: LineSeries[] = [
    { id: "Likes", data: data.map((d) => ({ x: d.date, y: d.likes })) },
    { id: "Comments", data: data.map((d) => ({ x: d.date, y: d.comments })) },
    { id: "Shares", data: data.map((d) => ({ x: d.date, y: d.shares })) },
  ];

  return (
    <ResponsiveLine
      data={series}
      theme={nivoTheme}
      colors={[chartColors.accentWarm, chartColors.twitter, chartColors.success]}
      margin={{ top: 5, right: 10, bottom: 30, left: 40 }}
      xScale={{ type: "time", format: "%Y-%m-%d", precision: "day" }}
      xFormat="time:%Y-%m-%d"
      yScale={{ type: "linear", stacked: true, min: 0, max: "auto" }}
      axisBottom={{
        format: (v) => format(new Date(v), "MMM d"),
        tickSize: 0,
        tickPadding: 6,
        tickValues: "every 14 days",
      }}
      axisLeft={{
        tickSize: 0,
        tickPadding: 6,
        format: (v) => (v >= 1000 ? `${(Number(v) / 1000).toFixed(0)}K` : String(v)),
      }}
      curve="monotoneX"
      enableArea
      areaOpacity={0.2}
      pointSize={0}
      enableCrosshair={false}
      enableGridX={false}
    />
  );
}
