import { useMemo } from "react";
import { ResponsiveBar, type BarDatum as NivoBarDatum } from "@nivo/bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { nivoTheme, chartColors } from "@/lib/nivo-theme";
import { Loader2 } from "lucide-react";
import {
  FaLinkedin,
  FaInstagram,
  FaTwitter,
  FaTiktok,
  FaFacebook,
} from "react-icons/fa";
import type { IconType } from "react-icons";

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

interface FollowerRow {
  snapshot_date: string;
  platform: string;
  followers: number;
}

interface Props {
  data: FollowerRow[] | undefined;
  isLoading?: boolean;
}

function CustomTooltip({
  indexValue,
  data,
  keys,
}: {
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

export function FollowersByPlatformBar({ data, isLoading }: Props) {
  const { barData, platforms } = useMemo(() => {
    if (!data || data.length === 0) return { barData: [] as NivoBarDatum[], platforms: [] as string[] };

    const platformSet = new Set<string>();
    const byDate = new Map<string, Record<string, any>>();

    for (const row of data) {
      platformSet.add(row.platform);
      const existing = byDate.get(row.snapshot_date) || { date: row.snapshot_date };
      existing[row.platform] = (Number(existing[row.platform]) || 0) + Number(row.followers);
      existing.date = row.snapshot_date;
      byDate.set(row.snapshot_date, existing);
    }

    const platforms = Array.from(platformSet).sort();
    const barData = Array.from(byDate.values())
      .sort((a, b) => String(a.date).localeCompare(String(b.date))) as NivoBarDatum[];

    return { barData, platforms };
  }, [data]);

  const getColor = (bar: { id: string | number }) => platformColorMap[String(bar.id)] ?? "hsl(220 9% 46%)";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Followers Over Time</CardTitle>
        <p className="text-sm text-muted-foreground">Follower count broken down by platform</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[350px]">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : barData.length === 0 ? (
          <div className="flex items-center justify-center h-[350px]">
            <p className="text-sm text-muted-foreground">No follower data for this period</p>
          </div>
        ) : (
          <div className="h-[350px]">
            <ResponsiveBar
              data={barData}
              keys={platforms}
              indexBy="date"
              margin={{ top: 10, right: 16, bottom: 50, left: 56 }}
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
                  indexValue={indexValue}
                  data={d}
                  keys={platforms}
                />
              )}
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
