import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "./useCompany";

/**
 * Returns a Set of account_ids that are marked as inactive.
 * Used by hooks that query post_analytics_snapshots directly
 * to exclude data from disconnected/stale accounts.
 */
export function useInactiveAccountIds() {
  const { data: company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ["inactive-account-ids", companyId],
    queryFn: async (): Promise<Set<string>> => {
      if (!companyId) return new Set();

      const { data, error } = await supabase
        .from("account_analytics_snapshots")
        .select("account_id")
        .eq("company_id", companyId)
        .eq("is_active", false);

      if (error) throw error;

      return new Set((data || []).map((r) => r.account_id));
    },
    enabled: !!companyId,
    staleTime: 60000,
  });
}
