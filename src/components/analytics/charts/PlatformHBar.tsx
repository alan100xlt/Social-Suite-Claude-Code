import { ResponsiveBar } from "@nivo/bar";
import { nivoTheme, chartColors } from "@/lib/nivo-theme";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PlatformData {
  platform: string;
  name: string;
  impressions: number;
  views: number;
  engagement: number;
  [key: string]: string | number;
}

interface Props {
  data: PlatformData[] | undefined;
}

function CustomTooltip({ id, value, indexValue, color }: any) {
  return (
    <div className="bg-background border border-border rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-foreground mb-1">{indexValue}</p>
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-muted-foreground">{id}:</span>
        <span className="font-medium text-foreground">{Number(value).toLocaleString()}</span>
      </div>
    </div>
  );
}

export function PlatformHBar({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Platform Performance</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">No platform data yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle>Platform Performance</CardTitle></CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveBar
            data={data}
            keys={["impressions"]}
            indexBy="name"
            theme={nivoTheme}
            colors={[chartColors.primary]}
            layout="horizontal"
            margin={{ top: 10, right: 20, bottom: 40, left: 90 }}
            padding={0.35}
            borderRadius={4}
            enableGridY={false}
            axisLeft={{
              tickSize: 0,
              tickPadding: 8,
            }}
            axisBottom={{
              tickSize: 0,
              tickPadding: 8,
              format: (v) =>
                v >= 1000000
                  ? `${(Number(v) / 1000000).toFixed(1)}M`
                  : v >= 1000
                  ? `${(Number(v) / 1000).toFixed(0)}K`
                  : String(v),
            }}
            labelSkipWidth={60}
            labelTextColor="hsl(0 0% 100%)"
            tooltip={CustomTooltip}
          />
        </div>
      </CardContent>
    </Card>
  );
}
