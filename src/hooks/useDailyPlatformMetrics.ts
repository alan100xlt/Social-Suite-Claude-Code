import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedCompany } from "@/contexts/SelectedCompanyContext";
import { format, parseISO } from "date-fns";

type Metric = "impressions" | "views" | "clicks";

interface RpcRow {
  snapshot_date: string;
  platform: string;
  impressions: number;
  views: number;
  clicks: number;
}

export interface BarDatum {
  date: string;
  [platform: string]: string | number;
}

export function useDailyPlatformMetrics({
  startDate,
  endDate,
  metric,
}: {
  startDate: string;
  endDate: string;
  metric: Metric;
}) {
  const { selectedCompanyId } = useSelectedCompany();

  return useQuery({
    queryKey: ["daily-platform-metrics", selectedCompanyId, startDate, endDate, metric],
    enabled: !!selectedCompanyId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_post_analytics_by_date_platform" as any,
        {
          _company_id: selectedCompanyId!,
          _start_date: startDate,
          _end_date: endDate,
        }
      );
      if (error) throw error;

      const rows = (data ?? []) as RpcRow[];

      // Collect all platforms present
      const platformSet = new Set<string>();
      rows.forEach((r) => platformSet.add(r.platform));
      const platforms = Array.from(platformSet).sort();

      // Group by date, pivot platforms into columns
      const byDate = new Map<string, Record<string, number>>();
      for (const row of rows) {
        const key = row.snapshot_date;
        if (!byDate.has(key)) {
          const init: Record<string, number> = {};
          platforms.forEach((p) => (init[p] = 0));
          byDate.set(key, init);
        }
        byDate.get(key)![row.platform] = Number(row[metric]) || 0;
      }

      // Convert to Nivo bar format
      const barData: BarDatum[] = Array.from(byDate.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dateStr, values]) => ({
          date: format(parseISO(dateStr), "MMM d"),
          ...values,
        }));

      return { barData, platforms };
    },
  });
}
