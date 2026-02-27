import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedCompany } from "@/contexts/SelectedCompanyContext";

export function useLastSyncTime() {
  const { selectedCompanyId } = useSelectedCompany();

  return useQuery({
    queryKey: ["last-sync-time", selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return null;

      // Get the most recent snapshot created_at timestamp
      const { data, error } = await supabase
        .from("post_analytics_snapshots")
        .select("created_at")
        .eq("company_id", selectedCompanyId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching last sync time:", error);
        return null;
      }

      return data?.created_at || null;
    },
    enabled: !!selectedCompanyId,
    refetchInterval: 60000, // Refetch every minute to keep it fresh
    staleTime: 30000,
  });
}
