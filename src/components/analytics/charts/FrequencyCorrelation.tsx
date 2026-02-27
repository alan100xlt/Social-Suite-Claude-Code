import { ResponsiveLine, type LineSeries } from "@nivo/line";
import { nivoTheme, chartColors } from "@/lib/nivo-theme";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ViewsData {
  date: string;
  views: number;
  posts: number;
  engagement: number;
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
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: point.serieColor }} />
        <span className="text-muted-foreground">{point.serieId}:</span>
        <span className="font-medium text-foreground">{Number(point.data.y).toLocaleString()}</span>
      </div>
    </div>
  );
}

export function FrequencyCorrelation({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Post Frequency vs Engagement</CardTitle>
          <p className="text-sm text-muted-foreground">Does posting more lead to better results?</p>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">No data yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Aggregate weekly for smoother visualization
  const weeklyData: { week: string; posts: number; avgEngagement: number }[] = [];
  let currentWeekStart = "";
  let weekPosts = 0;
  let weekEngagement = 0;
  let weekDays = 0;

  for (const d of data) {
    const date = new Date(d.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const ws = weekStart.toISOString().split("T")[0];

    if (ws !== currentWeekStart && currentWeekStart !== "") {
      weeklyData.push({
        week: currentWeekStart,
        posts: weekPosts,
        avgEngagement: weekDays > 0 ? Math.round(weekEngagement / weekDays) : 0,
      });
      weekPosts = 0;
      weekEngagement = 0;
      weekDays = 0;
    }
    currentWeekStart = ws;
    weekPosts += d.posts;
    weekEngagement += d.engagement;
    weekDays += 1;
  }
  if (currentWeekStart && weekDays > 0) {
    weeklyData.push({
      week: currentWeekStart,
      posts: weekPosts,
      avgEngagement: Math.round(weekEngagement / weekDays),
    });
  }

  const series: LineSeries[] = [
    {
      id: "Posts Published",
      data: weeklyData.map((d) => ({ x: d.week, y: d.posts })),
    },
    {
      id: "Avg Engagement",
      data: weeklyData.map((d) => ({ x: d.week, y: d.avgEngagement })),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Post Frequency vs Engagement</CardTitle>
        <p className="text-sm text-muted-foreground">
          Weekly post count overlaid with average engagement — spot the sweet spot
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveLine
            data={series}
            theme={nivoTheme}
            colors={[chartColors.warning, chartColors.accentWarm]}
            margin={{ top: 10, right: 20, bottom: 40, left: 50 }}
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
            }}
            curve="monotoneX"
            pointSize={6}
            pointBorderWidth={2}
            pointBorderColor={{ from: "serieColor" }}
            pointColor="hsl(0 0% 100%)"
            enableCrosshair
            useMesh
            tooltip={({ point }) => <CustomTooltip point={point} />}
            enableGridX={false}
          />
        </div>
        <div className="flex items-center justify-center gap-6 mt-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors.warning }} />
            <span className="text-sm text-muted-foreground">Posts Published (weekly)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors.accentWarm }} />
            <span className="text-sm text-muted-foreground">Avg Engagement</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
