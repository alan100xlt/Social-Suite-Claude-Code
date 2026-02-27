import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "./useCompany";

interface FollowerRow {
  snapshot_date: string;
  platform: string;
  followers: number;
}

export function useFollowersByPlatform(params: { startDate: string; endDate: string }) {
  const { data: company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ["followers-by-platform", companyId, params.startDate, params.endDate],
    queryFn: async (): Promise<FollowerRow[]> => {
      if (!companyId) return [];

      const { data, error } = await supabase.rpc("get_followers_by_date_platform", {
        _company_id: companyId,
        _start_date: params.startDate,
        _end_date: params.endDate,
      });

      if (error) {
        console.error("Error fetching followers by platform:", error);
        throw new Error("Failed to fetch followers by platform");
      }

      return (data || []).map((row: any) => ({
        snapshot_date: row.snapshot_date,
        platform: row.platform,
        followers: Number(row.followers) || 0,
      }));
    },
    enabled: !!companyId,
  });
}
