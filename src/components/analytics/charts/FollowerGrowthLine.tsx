import { ResponsiveLine, type LineSeries } from "@nivo/line";
import { nivoTheme, chartColors, chartGradientDefs } from "@/lib/nivo-theme";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Users, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface FollowerData {
  date: string;
  followers: number;
}

interface Props {
  data: FollowerData[] | undefined;
  changePercent?: number;
  followerChange?: number;
  totalFollowers?: number;
  compact?: boolean;
  onViewDetails?: () => void;
}

function CustomTooltip({ point }: { point: any }) {
  return (
    <div className="bg-background border border-border rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-foreground mb-1">
        {format(new Date(point.data.x), "MMM d, yyyy")}
      </p>
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: point.serieColor }} />
        <span className="text-muted-foreground">Followers:</span>
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

const formatPercent = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

export function FollowerGrowthLine({
  data,
  changePercent = 0,
  followerChange = 0,
  totalFollowers = 0,
  compact = false,
  onViewDetails,
}: Props) {
  const hasData = data && data.length > 0;

  const header = (
    <CardHeader className={onViewDetails ? "flex flex-row items-center justify-between pb-2" : undefined}>
      <div>
        <CardTitle className={compact ? "text-base" : undefined}>Follower Growth</CardTitle>
        {hasData && (
          <div className="flex items-center gap-1 mt-1">
            {followerChange >= 0 ? (
              <TrendingUp className="w-4 h-4 text-success" />
            ) : (
              <TrendingDown className="w-4 h-4 text-destructive" />
            )}
            <span className={cn("text-sm font-medium", followerChange >= 0 ? "text-success" : "text-destructive")}>
              {formatPercent(changePercent)}
            </span>
            <span className="text-2xl font-bold ml-2">{formatNumber(totalFollowers)}</span>
          </div>
        )}
      </div>
      {onViewDetails && (
        <Button variant="ghost" size="sm" className="text-xs gap-1 shrink-0" onClick={onViewDetails}>
          View details <ArrowRight className="w-3 h-3" />
        </Button>
      )}
    </CardHeader>
  );

  if (!hasData) {
    return (
      <Card>
        {header}
        <CardContent>
          <div className={cn("flex flex-col items-center justify-center text-center", compact ? "h-[200px]" : "h-[300px]")}>
            <Users className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No follower data yet</p>
            <p className="text-sm text-muted-foreground mt-1">Sync analytics to track follower growth</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const series: LineSeries[] = [
    { id: "Followers", data: data!.map((d) => ({ x: d.date, y: d.followers })) },
  ];

  return (
    <Card>
      {header}
      <CardContent>
        <div className={compact ? "h-[200px]" : "h-[300px]"}>
          <ResponsiveLine
            data={series}
            theme={nivoTheme}
            colors={[chartColors.success]}
            margin={{ top: 10, right: 20, bottom: 40, left: 50 }}
            xScale={{ type: "time", format: "%Y-%m-%d", precision: "day" }}
            xFormat="time:%Y-%m-%d"
            yScale={{ type: "linear", stacked: false, min: "auto", max: "auto" }}
            axisBottom={{
              format: (v) => format(new Date(v), "MMM d"),
              tickSize: 0,
              tickPadding: 8,
              tickValues: compact ? "every 14 days" : "every 7 days",
            }}
            axisLeft={{
              tickSize: 0,
              tickPadding: 8,
              format: (v) => formatNumber(v as number),
            }}
            curve="monotoneX"
            enableArea
            areaOpacity={0.12}
            defs={chartGradientDefs}
            fill={[{ match: { id: "Followers" }, id: "gradientSuccess" }]}
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
