import { ResponsivePie } from "@nivo/pie";
import { nivoTheme, seriesColors } from "@/lib/nivo-theme";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PlatformDatum {
  name: string;
  value: number;
}

interface Props {
  data: PlatformDatum[];
  title?: string;
  metric?: string;
}

function CustomTooltip({ datum }: { datum: any }) {
  return (
    <div className="bg-background border border-border rounded-xl shadow-lg px-4 py-3 text-sm">
      <div className="flex items-center gap-2">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: datum.color }}
        />
        <span className="font-medium text-foreground">{datum.label}</span>
      </div>
      <p className="text-muted-foreground mt-1">
        {Number(datum.value).toLocaleString()} impressions
      </p>
    </div>
  );
}

export function PlatformDonut({ data, title = "Platform Distribution", metric = "Impressions" }: Props) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex flex-col items-center justify-center text-center">
            <p className="text-muted-foreground">No platform data yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pieData = data.map((d, i) => ({
    id: d.name,
    label: d.name,
    value: d.value,
    color: seriesColors[i % seriesColors.length],
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
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
              <span className="text-sm text-muted-foreground">{d.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
