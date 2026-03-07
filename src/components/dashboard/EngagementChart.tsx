import { useMemo } from "react";
import { ResponsiveLine } from "@nivo/line";
import { ResponsiveBar } from "@nivo/bar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { BarChart3 } from "lucide-react";
import { format, subDays } from "date-fns";
import {
  buildPremiumTheme,
  getPremiumSeries,
  makeAreaGradient,
  formatMetric,
} from "@/components/analytics-v2/widgets-v2/premium-theme";
import { ChartCard } from "@/components/analytics-v2/widgets-v2/ChartCard";
import { Skeleton } from "@/components/ui/skeleton";

/* ── Tooltip (theme-aware) ───────────────────────────────── */
function ChartTooltip({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div
      className="flex items-center gap-2.5 rounded-xl border-none px-3.5 py-2.5"
      style={{
        background: "hsl(var(--card) / 0.95)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid hsl(var(--border) / 0.5)",
        boxShadow:
          "0 10px 25px -5px hsl(224 71% 25% / 0.12), 0 4px 10px -3px hsl(220 13% 91% / 0.4)",
      }}
    >
      <div
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ background: color }}
      />
      <div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className="text-sm font-semibold text-foreground">{value}</div>
      </div>
    </div>
  );
}

/* ── Component ──────────────────────────────────────────── */
interface EngagementChartProps {
  startDate?: string;
  endDate?: string;
  timeframeLabel?: string;
}

export function EngagementChart({ startDate, endDate, timeframeLabel }: EngagementChartProps = {}) {
  const { data: company } = useCompany();
  const companyId = company?.id;
  const theme = useMemo(() => buildPremiumTheme(), []);
  const series = getPremiumSeries();

  const today = endDate || new Date().toISOString().split("T")[0];
  const fourteenDaysAgo = startDate || subDays(new Date(), 14).toISOString().split("T")[0];

  const gradientDefs = useMemo(
    () => [
      makeAreaGradient("engGrad0", series[0], 0.3),
      makeAreaGradient("engGrad1", series[1], 0.3),
    ],
    [series]
  );

  const { data: dailyData, isLoading } = useQuery({
    queryKey: ["dashboard-chart", companyId, fourteenDaysAgo, today],
    queryFn: async () => {
      if (!companyId) return [];
      // Use publish_date grouping (same as Analytics page) for richer time-series data
      const { data, error } = await supabase.rpc("get_post_analytics_by_publish_date", {
        _company_id: companyId,
        _start_date: fourteenDaysAgo,
        _end_date: today,
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 60000,
  });

  const { data: platformData } = useQuery({
    queryKey: ["dashboard-platform-chart", companyId, fourteenDaysAgo, today],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.rpc("get_post_analytics_by_platform", {
        _company_id: companyId,
        _start_date: fourteenDaysAgo,
        _end_date: today,
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 60000,
  });

  // Transform → Nivo Line
  const lineData = (() => {
    const rows = (dailyData || []) as Array<{ publish_date: string; views: number; likes: number }>;
    if (rows.length === 0) return [];
    return [
      {
        id: "Views",
        data: rows.map((r) => ({
          x: format(new Date(r.publish_date + "T00:00"), "MMM d"),
          y: Number(r.views) || 0,
        })),
      },
      {
        id: "Likes",
        data: rows.map((r) => ({
          x: format(new Date(r.publish_date + "T00:00"), "MMM d"),
          y: Number(r.likes) || 0,
        })),
      },
    ];
  })();

  const hasTimeSeriesData =
    lineData.length > 0 && lineData.some((s) => s.data.some((d) => d.y > 0));

  // Transform → Nivo Bar
  const barData = (platformData || []).map((row: { platform: string; total_views: number; total_engagement: number }) => ({
    platform:
      (row.platform as string).charAt(0).toUpperCase() +
      (row.platform as string).slice(1),
    Views: Number(row.total_views) || 0,
    Engagement: Number(row.total_engagement) || 0,
  }));

  const hasPlatformData =
    barData.length > 0 && barData.some((d) => d.Views > 0 || d.Engagement > 0);

  return (
    <ChartCard noPadding accentColor={series[0]} accentColorEnd={series[1]} timeframeLabel={timeframeLabel}>
      <div className="p-5">
        <div className="mb-5">
          <h3 className="font-display font-semibold text-sm text-card-foreground">
            {hasTimeSeriesData
              ? "Performance Over Time"
              : hasPlatformData
                ? "Platform Breakdown"
                : "Weekly Activity"}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {hasTimeSeriesData
              ? `Views & engagement`
              : hasPlatformData
                ? "Views & engagement by platform"
                : "No data available yet"}
          </p>
        </div>

        {isLoading ? (
          <div className="h-[260px] flex flex-col items-center justify-center gap-3">
            <Skeleton className="w-full h-40 rounded-lg" />
            <Skeleton className="w-32 h-4 rounded" />
          </div>
        ) : hasTimeSeriesData ? (
          <>
            <div className="h-[260px]">
              <ResponsiveLine
                data={lineData}
                theme={theme}
                colors={[series[0], series[1]]}
                margin={{ top: 10, right: 16, bottom: 30, left: 45 }}
                xScale={{ type: "point" }}
                yScale={{ type: "linear", min: 0, max: "auto" }}
                curve="monotoneX"
                axisBottom={{ tickSize: 0, tickPadding: 8, tickRotation: 0 }}
                axisLeft={{
                  tickSize: 0,
                  tickPadding: 8,
                  format: (v) => formatMetric(Number(v)),
                }}
                enableGridX={false}
                lineWidth={2.5}
                enablePoints={false}
                enableArea
                areaOpacity={1}
                defs={gradientDefs}
                fill={[
                  { match: { id: "Views" }, id: "engGrad0" },
                  { match: { id: "Likes" }, id: "engGrad1" },
                ]}
                useMesh
                crosshairType="x"
                tooltip={({ point }) => (
                  <ChartTooltip
                    color={point.serieColor}
                    label={String(point.data.xFormatted)}
                    value={`${point.serieId}: ${Number(point.data.yFormatted).toLocaleString()}`}
                  />
                )}
              />
            </div>
            <Legend
              items={[
                { color: series[0], label: "Views" },
                { color: series[1], label: "Likes" },
              ]}
            />
          </>
        ) : hasPlatformData ? (
          <>
            <div className="h-[260px]">
              <ResponsiveBar
                data={barData}
                theme={theme}
                keys={["Views", "Engagement"]}
                indexBy="platform"
                colors={[series[0], series[1]]}
                margin={{ top: 10, right: 16, bottom: 30, left: 45 }}
                padding={0.35}
                borderRadius={6}
                axisBottom={{ tickSize: 0, tickPadding: 8 }}
                axisLeft={{
                  tickSize: 0,
                  tickPadding: 8,
                  format: (v) => formatMetric(Number(v)),
                }}
                enableGridX={false}
                enableLabel={false}
                groupMode="grouped"
                tooltip={({ id, value, color }) => (
                  <ChartTooltip
                    color={color}
                    label=""
                    value={`${String(id)}: ${value.toLocaleString()}`}
                  />
                )}
              />
            </div>
            <Legend
              items={[
                { color: series[0], label: "Views" },
                { color: series[1], label: "Engagement" },
              ]}
            />
          </>
        ) : (
          <div className="h-[260px] flex flex-col items-center justify-center text-center px-6">
            <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mb-3">
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium text-sm">No analytics data yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Connect your social accounts and sync posts to see performance data here.
            </p>
          </div>
        )}
      </div>
    </ChartCard>
  );
}

/* ── Shared Legend ───────────────────────────────────────── */
function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex items-center justify-center gap-6 pb-4">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: item.color }}
          />
          <span className="text-xs text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
