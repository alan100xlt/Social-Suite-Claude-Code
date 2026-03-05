import { useMemo } from "react";
import { ResponsiveBullet } from "@nivo/bullet";
import {
  buildPremiumTheme,
  premiumColors,
  kpiTypography,
} from "./premium-theme";
import { ChartCard } from "./ChartCard";

interface BulletDatum {
  id: string;
  ranges: number[];
  measures: number[];
  markers?: number[];
}

interface BulletWidgetProps {
  title: string;
  subtitle?: string;
  data: BulletDatum[];
  height?: number;
}

export function BulletWidget({
  title,
  subtitle,
  data,
  height,
}: BulletWidgetProps) {
  const theme = useMemo(() => buildPremiumTheme(), []);
  const computedHeight = height || Math.max(180, data.length * 56 + 40);

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
      <div className="px-6 pb-6" style={{ height: computedHeight }}>
        <ResponsiveBullet
          data={data}
          theme={theme}
          margin={{ top: 12, right: 24, bottom: 32, left: 90 }}
          spacing={32}
          titleAlign="start"
          titleOffsetX={-80}
          rangeColors={[
            `${premiumColors.deepPurple}18`,
            `${premiumColors.deepPurple}30`,
            `${premiumColors.deepPurple}50`,
          ]}
          measureColors={[premiumColors.deepPurple, premiumColors.electricBlue]}
          markerColors={[premiumColors.coral]}
          measureBorderWidth={0}
          measureBorderColor="transparent"
          rangeBorderWidth={0}
          rangeBorderColor="transparent"
          markerSize={0.8}
        />
      </div>
    </ChartCard>
  );
}
