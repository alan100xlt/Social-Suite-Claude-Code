import { ResponsivePie } from "@nivo/pie";
import { nivoTheme, chartColors } from "@/lib/nivo-theme";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

interface FollowerByPlatform {
  platform: string;
  followers: number;
}

interface Props {
  data: FollowerByPlatform[] | undefined;
  totalFollowers?: number;
}

const platformColorMap: Record<string, string> = {
  linkedin: chartColors.linkedin,
  instagram: chartColors.instagram,
  twitter: chartColors.twitter,
  tiktok: chartColors.tiktok,
  facebook: chartColors.facebook,
};

const platformLabels: Record<string, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  twitter: "Twitter / X",
  tiktok: "TikTok",
  facebook: "Facebook",
  youtube: "YouTube",
  bluesky: "Bluesky",
  threads: "Threads",
  "google-business": "Google",
};

function CustomTooltip({ datum }: { datum: any }) {
  return (
    <div className="bg-background border border-border rounded-xl shadow-lg px-4 py-3 text-sm">
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: datum.color }} />
        <span className="font-medium text-foreground">{datum.label}</span>
      </div>
      <p className="text-muted-foreground mt-1">
        {Number(datum.value).toLocaleString()} followers
      </p>
    </div>
  );
}

const formatNumber = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
};

export function FollowerDistributionDonut({ data, totalFollowers = 0 }: Props) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Current Followers</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[300px] flex flex-col items-center justify-center text-center">
            <Users className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No follower data yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pieData = data
    .filter((d) => d.followers > 0)
    .map((d) => ({
      id: platformLabels[d.platform] || d.platform,
      label: platformLabels[d.platform] || d.platform,
      value: d.followers,
      color: platformColorMap[d.platform] || "hsl(220 9% 46%)",
    }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Current Followers</CardTitle>
          <span className="text-2xl font-bold">{formatNumber(totalFollowers)}</span>
        </div>
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
        <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
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
