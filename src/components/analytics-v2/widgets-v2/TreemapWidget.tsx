import { useMemo } from "react";
import { ResponsiveTreeMap } from "@nivo/treemap";
import {
  buildPremiumTheme,
  getPremiumSeries,
  formatMetric,
  kpiTypography,
} from "./premium-theme";
import { ChartCard } from "./ChartCard";

interface TreemapNode {
  name: string;
  value?: number;
  children?: TreemapNode[];
  color?: string;
}

interface TreemapWidgetProps {
  title: string;
  subtitle?: string;
  data: TreemapNode;
  height?: number;
}

export function TreemapWidget({
  title,
  subtitle,
  data,
  height = 320,
}: TreemapWidgetProps) {
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
        <ResponsiveTreeMap
          data={data}
          theme={theme}
          identity="name"
          value="value"
          margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
          innerPadding={3}
          outerPadding={3}
          borderRadius={8}
          borderWidth={2}
          borderColor="hsl(var(--card))"
          colors={premiumSeries}
          nodeOpacity={0.92}
          enableParentLabel={false}
          labelSkipSize={40}
          labelTextColor={{ from: "color", modifiers: [["darker", 2.4]] }}
          tooltip={({ node }) => (
            <div className="bg-card/95 dark:bg-[hsl(220_16%_16%/0.95)] backdrop-blur-xl border border-border/50 dark:border-white/10 rounded-xl shadow-2xl px-4 py-2.5 text-sm">
              <p className="text-xs text-muted-foreground mb-1">{node.pathComponents.join(" / ")}</p>
              <span className="font-bold text-foreground" style={kpiTypography.medium}>
                {formatMetric(node.value)}
              </span>
            </div>
          )}
        />
      </div>
    </ChartCard>
  );
}
