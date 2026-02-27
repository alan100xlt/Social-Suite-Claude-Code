import { ResponsiveLine } from "@nivo/line";
import { ResponsiveBar } from "@nivo/bar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { Loader2 } from "lucide-react";
import { format, subDays } from "date-fns";
import {
  nivoTheme,
  chartColors,
  chartGradientDefs,
  chartFillRules,
} from "@/lib/nivo-theme";

/* ── Custom Tooltip ─────────────────────────────────────── */
function LineTooltip({ point }: { point: any }) {
  const color = point.serieColor;
  return (
    <div
      className="flex items-center gap-2.5 rounded-xl border-none px-3.5 py-2.5"
      style={{
        background: "hsl(0 0% 100%)",
        boxShadow:
          "0 10px 25px -5px hsl(224 71% 25% / 0.12), 0 4px 10px -3px hsl(220 13% 91% / 0.4)",
      }}
    >
      <div
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ background: color }}
      />
      <div>
        <span className="text-xs font-medium text-muted-foreground">
          {point.data.xFormatted}
        </span>
        <div className="text-sm font-semibold text-foreground">
          {point.serieId}: {Number(point.data.yFormatted).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

function BarTooltip({ id, value, color }: { id: string | number; value: number; color: string }) {
  return (
    <div
      className="flex items-center gap-2.5 rounded-xl border-none px-3.5 py-2.5"
      style={{
        background: "hsl(0 0% 100%)",
        boxShadow:
          "0 10px 25px -5px hsl(224 71% 25% / 0.12), 0 4px 10px -3px hsl(220 13% 91% / 0.4)",
      }}
    >
      <div
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ background: color }}
      />
      <div className="text-sm font-semibold text-foreground">
        {String(id)}: {value.toLocaleString()}
      </div>
    </div>
  );
}

/* ── Component ──────────────────────────────────────────── */
export function EngagementChart() {
  const { data: company } = useCompany();
  const companyId = company?.id;

  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = subDays(new Date(), 30).toISOString().split("T")[0];

  const { data: dailyData, isLoading } = useQuery({
    queryKey: ["dashboard-chart", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.rpc("get_post_analytics_by_date", {
        _company_id: companyId,
        _start_date: thirtyDaysAgo,
        _end_date: today,
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 60000,
  });

  const { data: platformData } = useQuery({
    queryKey: ["dashboard-platform-chart", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.rpc("get_post_analytics_by_platform", {
        _company_id: companyId,
        _start_date: thirtyDaysAgo,
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
    const rows = (dailyData || []) as any[];
    if (rows.length === 0) return [];
    return [
      {
        id: "Views",
        data: rows.map((r) => ({
          x: format(new Date(r.snapshot_date), "MMM d"),
          y: Number(r.views) || 0,
        })),
      },
      {
        id: "Likes",
        data: rows.map((r) => ({
          x: format(new Date(r.snapshot_date), "MMM d"),
          y: Number(r.likes) || 0,
        })),
      },
    ];
  })();

  const hasTimeSeriesData =
    lineData.length > 0 && lineData.some((s) => s.data.some((d) => d.y > 0));

  // Transform → Nivo Bar
  const barData = (platformData || []).map((row: any) => ({
    platform:
      (row.platform as string).charAt(0).toUpperCase() +
      (row.platform as string).slice(1),
    Views: Number(row.total_views) || 0,
    Engagement: Number(row.total_engagement) || 0,
  }));

  const hasPlatformData =
    barData.length > 0 && barData.some((d) => d.Views > 0 || d.Engagement > 0);

  return (
    <div className="rounded-xl border border-border bg-card p-5 animate-fade-in">
      <div className="mb-5">
        <h3 className="font-display font-semibold text-lg text-card-foreground">
          {hasTimeSeriesData
            ? "Performance Over Time"
            : hasPlatformData
              ? "Platform Breakdown"
              : "Weekly Activity"}
        </h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          {hasTimeSeriesData
            ? "Views & engagement (last 30 days)"
            : hasPlatformData
              ? "Views & engagement by platform"
              : "No data available yet"}
        </p>
      </div>

      {isLoading ? (
        <div className="h-[280px] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : hasTimeSeriesData ? (
        <>
          <div className="h-[280px]">
            <ResponsiveLine
              data={lineData}
              theme={nivoTheme}
              colors={[chartColors.primary, chartColors.accent]}
              margin={{ top: 10, right: 20, bottom: 30, left: 50 }}
              xScale={{ type: "point" }}
              yScale={{ type: "linear", min: 0, max: "auto" }}
              curve="monotoneX"
              axisBottom={{ tickSize: 0, tickPadding: 8, tickRotation: 0 }}
              axisLeft={{
                tickSize: 0,
                tickPadding: 8,
                format: (v) =>
                  Number(v) >= 1000
                    ? `${(Number(v) / 1000).toFixed(0)}k`
                    : String(v),
              }}
              enableGridX={false}
              lineWidth={2.5}
              enablePoints={false}
              enableArea
              areaOpacity={1}
              defs={chartGradientDefs}
              fill={chartFillRules}
              useMesh
              crosshairType="x"
              tooltip={({ point }) => <LineTooltip point={point} />}
            />
          </div>
          <Legend
            items={[
              { color: chartColors.primary, label: "Views" },
              { color: chartColors.accent, label: "Likes" },
            ]}
          />
        </>
      ) : hasPlatformData ? (
        <>
          <div className="h-[280px]">
            <ResponsiveBar
              data={barData}
              theme={nivoTheme}
              keys={["Views", "Engagement"]}
              indexBy="platform"
              colors={[chartColors.primary, chartColors.accent]}
              margin={{ top: 10, right: 20, bottom: 30, left: 50 }}
              padding={0.35}
              borderRadius={6}
              axisBottom={{ tickSize: 0, tickPadding: 8 }}
              axisLeft={{
                tickSize: 0,
                tickPadding: 8,
                format: (v) =>
                  Number(v) >= 1000
                    ? `${(Number(v) / 1000).toFixed(0)}k`
                    : String(v),
              }}
              enableGridX={false}
              enableLabel={false}
              groupMode="grouped"
              tooltip={({ id, value, color }) => (
                <BarTooltip id={id} value={value} color={color} />
              )}
            />
          </div>
          <Legend
            items={[
              { color: chartColors.primary, label: "Views" },
              { color: chartColors.accent, label: "Engagement" },
            ]}
          />
        </>
      ) : (
        <div className="h-[280px] flex flex-col items-center justify-center text-center px-6">
          <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mb-3">
            <Loader2 className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">No analytics data yet</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Connect your social accounts and sync posts to see performance data here.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Shared Legend ───────────────────────────────────────── */
function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex items-center justify-center gap-6 mt-4">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: item.color }}
          />
          <span className="text-sm text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
