import { ResponsiveLine, type LineSeries } from "@nivo/line";
import { nivoTheme, chartColors, chartGradientDefs } from "@/lib/nivo-theme";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

interface ViewsData {
  date: string;
  views: number;
  engagement: number;
  posts: number;
}

interface Props {
  data: ViewsData[] | undefined;
}

function CustomTooltip({ point }: { point: any }) {
  return (
    <div className="bg-background border border-border rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-foreground mb-1">
        {format(new Date(point.data.x), "MMM d, yyyy")}
      </p>
      <div className="flex items-center gap-2">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: point.serieColor }}
        />
        <span className="text-muted-foreground">{point.serieId}:</span>
        <span className="font-medium text-foreground">
          {Number(point.data.y).toLocaleString()}
        </span>
      </div>
    </div>
  );
}

export function ViewsEngagementArea({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Views & Engagement by Publication Date</CardTitle>
          <p className="text-sm text-muted-foreground">
            Total views and engagement for posts published on each date
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex flex-col items-center justify-center text-center">
            <BarChart3 className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No analytics data yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Sync your accounts to see view data
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const series: LineSeries[] = [
    {
      id: "Views",
      data: data.map((d) => ({ x: d.date, y: d.views })),
    },
    {
      id: "Engagement",
      data: data.map((d) => ({ x: d.date, y: d.engagement })),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Views & Engagement by Publication Date</CardTitle>
        <p className="text-sm text-muted-foreground">
          Total views and engagement for posts published on each date
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveLine
            data={series}
            theme={nivoTheme}
            colors={[chartColors.primary, chartColors.accentWarm]}
            margin={{ top: 10, right: 20, bottom: 40, left: 50 }}
            xScale={{ type: "time", format: "%Y-%m-%d", precision: "day" }}
            xFormat="time:%Y-%m-%d"
            yScale={{ type: "linear", stacked: false, min: "auto", max: "auto" }}
            axisBottom={{
              format: (v) => format(new Date(v), "MMM d"),
              tickRotation: 0,
              tickSize: 0,
              tickPadding: 8,
              tickValues: "every 7 days",
            }}
            axisLeft={{
              tickSize: 0,
              tickPadding: 8,
              format: (v) =>
                v >= 1000000
                  ? `${(v / 1000000).toFixed(1)}M`
                  : v >= 1000
                  ? `${(v / 1000).toFixed(0)}K`
                  : String(v),
            }}
            curve="monotoneX"
            enableArea
            areaOpacity={0.15}
            defs={chartGradientDefs}
            fill={[
              { match: { id: "Views" }, id: "gradientPrimary" },
              { match: { id: "Engagement" }, id: "gradientAccent" },
            ]}
            pointSize={0}
            enableCrosshair
            useMesh
            tooltip={({ point }) => <CustomTooltip point={point} />}
            enableGridX={false}
          />
        </div>
        <div className="flex items-center justify-center gap-6 mt-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors.primary }} />
            <span className="text-sm text-muted-foreground">Views</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors.accentWarm }} />
            <span className="text-sm text-muted-foreground">Engagement</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
