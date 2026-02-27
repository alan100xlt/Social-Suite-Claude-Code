import { useState } from "react";
import { ResponsiveBar, BarDatum as NivoBarDatum } from "@nivo/bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { nivoTheme, chartColors } from "@/lib/nivo-theme";
import { useDailyPlatformMetrics } from "@/hooks/useDailyPlatformMetrics";
import { Loader2 } from "lucide-react";
import {
  FaLinkedin,
  FaInstagram,
  FaTwitter,
  FaTiktok,
  FaFacebook,
} from "react-icons/fa";
import type { IconType } from "react-icons";

const METRICS = [
  { value: "impressions", label: "Impressions" },
  { value: "views", label: "Video Views" },
  { value: "clicks", label: "Clicks" },
] as const;

type Metric = (typeof METRICS)[number]["value"];

const platformColorMap: Record<string, string> = {
  linkedin: chartColors.linkedin,
  instagram: chartColors.instagram,
  twitter: chartColors.twitter,
  tiktok: chartColors.tiktok,
  facebook: chartColors.facebook,
};

const platformIconMap: Record<string, IconType> = {
  linkedin: FaLinkedin,
  instagram: FaInstagram,
  twitter: FaTwitter,
  tiktok: FaTiktok,
  facebook: FaFacebook,
};

const platformLabel: Record<string, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  twitter: "Twitter",
  tiktok: "TikTok",
  facebook: "Facebook",
};

function CustomTooltip({
  id,
  indexValue,
  data,
  keys,
}: {
  id: string;
  indexValue: string | number;
  data: Record<string, any>;
  keys: string[];
}) {
  const total = keys.reduce((s, k) => s + (Number(data[k]) || 0), 0);
  return (
    <div className="rounded-xl bg-background border border-border shadow-lg px-4 py-3 text-sm space-y-1.5 min-w-[160px]">
      <p className="font-semibold text-foreground">{String(indexValue)}</p>
      {keys
        .filter((k) => Number(data[k]) > 0)
        .sort((a, b) => (Number(data[b]) || 0) - (Number(data[a]) || 0))
        .map((k) => {
          const Icon = platformIconMap[k];
          return (
            <div key={k} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                {Icon && <Icon style={{ color: platformColorMap[k] }} className="w-3 h-3" />}
                {platformLabel[k] || k}
              </span>
              <span className="font-medium text-foreground tabular-nums">
                {Number(data[k]).toLocaleString()}
              </span>
            </div>
          );
        })}
      <div className="border-t border-border pt-1 flex items-center justify-between">
        <span className="text-muted-foreground">Total</span>
        <span className="font-semibold text-foreground tabular-nums">{total.toLocaleString()}</span>
      </div>
    </div>
  );
}

interface Props {
  startDate: string;
  endDate: string;
}

export function PlatformStackedBar({ startDate, endDate }: Props) {
  const [metric, setMetric] = useState<Metric>("impressions");
  const { data, isLoading } = useDailyPlatformMetrics({ startDate, endDate, metric });

  const platforms = data?.platforms ?? [];
  const barData = (data?.barData ?? []) as NivoBarDatum[];

  const getColor = (bar: { id: string | number }) => platformColorMap[String(bar.id)] ?? "hsl(220 9% 46%)";

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Platform Breakdown by Day</CardTitle>
        <Select value={metric} onValueChange={(v) => setMetric(v as Metric)}>
          <SelectTrigger className="w-[150px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METRICS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[350px]">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : barData.length === 0 ? (
          <div className="flex items-center justify-center h-[350px]">
            <p className="text-sm text-muted-foreground">No data for this period</p>
          </div>
        ) : (
          <div className="h-[350px]">
            <ResponsiveBar
              data={barData}
              keys={platforms}
              indexBy="date"
              margin={{ top: 30, right: 16, bottom: 50, left: 56 }}
              padding={0.35}
              groupMode="stacked"
              colors={getColor}
              theme={nivoTheme}
              enableLabel={false}
              axisBottom={{
                tickSize: 0,
                tickPadding: 8,
                tickRotation: barData.length > 14 ? -45 : 0,
              }}
              axisLeft={{
                tickSize: 0,
                tickPadding: 8,
                format: (v) =>
                  Number(v) >= 1000
                    ? `${(Number(v) / 1000).toFixed(0)}K`
                    : String(v),
              }}
              tooltip={({ id, indexValue, data: d }) => (
                <CustomTooltip
                  id={String(id)}
                  indexValue={indexValue}
                  data={d}
                  keys={platforms}
                />
              )}
              barComponent={({ bar, style }) => {
                const isTopSegment =
                  bar.data.id === platforms[platforms.length - 1] ||
                  // Check if this is the topmost non-zero segment
                  (() => {
                    const idx = platforms.indexOf(String(bar.data.id));
                    for (let i = idx + 1; i < platforms.length; i++) {
                      if (Number(bar.data.data[platforms[i]]) > 0) return false;
                    }
                    return true;
                  })();

                const Icon = platformIconMap[String(bar.data.id)];
                const color = platformColorMap[String(bar.data.id)] ?? "hsl(220 9% 46%)";

                return (
                  <g transform={`translate(${bar.x},${bar.y})`}>
                    <rect
                      width={bar.width}
                      height={bar.height}
                      rx={2}
                      fill={color}
                      opacity={0.9}
                    />
                    {isTopSegment && Icon && bar.height > 0 && (
                      <foreignObject
                        x={bar.width / 2 - 7}
                        y={-18}
                        width={14}
                        height={14}
                        style={{ overflow: "visible" }}
                      >
                        <div
                          style={{ color, display: "flex", alignItems: "center", justifyContent: "center" }}
                        >
                          <Icon size={12} />
                        </div>
                      </foreignObject>
                    )}
                  </g>
                );
              }}
              legends={[
                {
                  dataFrom: "keys",
                  anchor: "bottom",
                  direction: "row",
                  translateY: 48,
                  itemWidth: 90,
                  itemHeight: 20,
                  itemDirection: "left-to-right",
                  symbolSize: 10,
                  symbolShape: "circle",
                },
              ]}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
