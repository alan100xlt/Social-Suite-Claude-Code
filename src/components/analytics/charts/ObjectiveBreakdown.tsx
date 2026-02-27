import { ResponsivePie } from "@nivo/pie";
import { nivoTheme, chartColors } from "@/lib/nivo-theme";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  data: { postId: string; objective: string | null; views: number; engagement: number }[] | undefined;
}

const objectiveColors: Record<string, string> = {
  reach: chartColors.primary,
  engagement: chartColors.accentWarm,
  traffic: chartColors.success,
  awareness: chartColors.warning,
  auto: chartColors.twitter,
  unknown: "hsl(220 9% 70%)",
};

const objectiveLabels: Record<string, string> = {
  reach: "Reach",
  engagement: "Engagement",
  traffic: "Traffic",
  awareness: "Awareness",
  auto: "Auto",
  unknown: "Untagged",
};

function CustomTooltip({ datum }: { datum: any }) {
  return (
    <div className="bg-background border border-border rounded-xl shadow-lg px-4 py-3 text-sm">
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: datum.color }} />
        <span className="font-medium text-foreground">{datum.label}</span>
      </div>
      <p className="text-muted-foreground mt-1">
        {datum.data.posts} posts · {Number(datum.value).toLocaleString()} views
      </p>
    </div>
  );
}

export function ObjectiveBreakdown({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Content Objective Breakdown</CardTitle>
          <p className="text-sm text-muted-foreground">Performance by content objective</p>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">No post data yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group by objective
  const grouped = new Map<string, { views: number; engagement: number; posts: number }>();
  for (const post of data) {
    const obj = post.objective || "unknown";
    const existing = grouped.get(obj) || { views: 0, engagement: 0, posts: 0 };
    existing.views += post.views;
    existing.engagement += post.engagement;
    existing.posts += 1;
    grouped.set(obj, existing);
  }

  const pieData = Array.from(grouped.entries())
    .map(([obj, metrics]) => ({
      id: objectiveLabels[obj] || obj,
      label: objectiveLabels[obj] || obj,
      value: metrics.views,
      color: objectiveColors[obj] || objectiveColors.unknown,
      posts: metrics.posts,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Objective Breakdown</CardTitle>
        <p className="text-sm text-muted-foreground">Performance by content objective</p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsivePie
            data={pieData}
            theme={nivoTheme}
            colors={{ datum: "data.color" }}
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            innerRadius={0.55}
            padAngle={1.5}
            cornerRadius={6}
            activeOuterRadiusOffset={6}
            borderWidth={0}
            enableArcLabels={false}
            arcLinkLabelsSkipAngle={10}
            arcLinkLabelsTextColor="hsl(220 9% 46%)"
            arcLinkLabelsThickness={1.5}
            arcLinkLabelsColor={{ from: "color" }}
            tooltip={({ datum }) => <CustomTooltip datum={datum} />}
          />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
          {pieData.map((d) => (
            <div key={d.id} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="text-sm text-muted-foreground">
                {d.label} ({d.posts})
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
