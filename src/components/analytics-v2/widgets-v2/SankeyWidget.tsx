import { useMemo } from "react";
import { ResponsiveSankey } from "@nivo/sankey";
import {
  buildPremiumTheme,
  getPremiumSeries,
  formatMetric,
  kpiTypography,
} from "./premium-theme";
import { ChartCard } from "./ChartCard";

interface SankeyNode {
  id: string;
  nodeColor?: string;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

interface SankeyWidgetProps {
  title: string;
  subtitle?: string;
  data: {
    nodes: SankeyNode[];
    links: SankeyLink[];
  };
  height?: number;
}

export function SankeyWidget({
  title,
  subtitle,
  data,
  height = 360,
}: SankeyWidgetProps) {
  const theme = useMemo(() => buildPremiumTheme(), []);
  const premiumSeries = useMemo(() => getPremiumSeries(), []);

  return (
    <ChartCard noPadding>
      <div className="px-6 pt-6 pb-3">
        <h3
          className="text-base font-bold text-foreground tracking-tight"
          style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
        >
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="px-4 pb-4" style={{ height }}>
        <ResponsiveSankey
          data={data}
          theme={theme}
          margin={{ top: 12, right: 120, bottom: 12, left: 12 }}
          align="justify"
          colors={premiumSeries}
          nodeOpacity={1}
          nodeHoverOthersOpacity={0.25}
          nodeThickness={16}
          nodeSpacing={20}
          nodeBorderWidth={0}
          nodeBorderRadius={4}
          linkOpacity={0.35}
          linkHoverOpacity={0.65}
          linkBlendMode="normal"
          enableLinkGradient
          labelPosition="outside"
          labelOrientation="horizontal"
          labelPadding={12}
          labelTextColor={{ from: "color", modifiers: [["darker", 1.2]] }}
          nodeTooltip={({ node }) => (
            <div className="bg-card/95 dark:bg-[hsl(220_16%_16%/0.95)] backdrop-blur-xl border border-border/50 dark:border-white/10 rounded-xl shadow-2xl px-4 py-2.5 text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: node.color, boxShadow: `0 0 6px ${node.color}50` }}
                />
                <span className="text-muted-foreground text-xs">{node.label}</span>
                <span className="font-bold text-foreground ml-2" style={kpiTypography.medium}>
                  {formatMetric(node.value)}
                </span>
              </div>
            </div>
          )}
        />
      </div>
    </ChartCard>
  );
}
