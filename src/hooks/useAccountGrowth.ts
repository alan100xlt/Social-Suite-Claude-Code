import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';

interface AccountGrowthParams {
  accountId?: string;
  days?: number;
  startDate?: string;
  endDate?: string;
}

interface GrowthDataPoint {
  date: string;
  followers: number;
  following: number;
  platform: string;
  accountId: string;
}

interface AccountGrowthSummary {
  dataPoints: GrowthDataPoint[];
  totalFollowers: number;
  followerChange: number;
  changePercent: number;
}

export function useAccountGrowth(params: AccountGrowthParams = {}) {
  const { data: company } = useCompany();
  const companyId = company?.id;
  const days = params.days || 30;

  // Resolve date range: explicit dates take priority over `days`
  const resolvedEnd = params.endDate || new Date().toISOString().split('T')[0];
  const resolvedStart = params.startDate || (() => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  })();

  return useQuery({
    queryKey: ['account-growth', companyId, params.accountId, resolvedStart, resolvedEnd],
    queryFn: async (): Promise<AccountGrowthSummary> => {
      if (!companyId) {
        return {
          dataPoints: [],
          totalFollowers: 0,
          followerChange: 0,
          changePercent: 0,
        };
      }

      // Fetch two things in parallel:
      // 1. Time-series data within the date range (for charts / change calc)
      // 2. The LATEST snapshot per account (for accurate total followers)
      let rangeQuery = supabase
        .from('account_analytics_snapshots')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .gte('snapshot_date', resolvedStart)
        .lte('snapshot_date', resolvedEnd)
        .order('snapshot_date', { ascending: true });

      if (params.accountId) {
        rangeQuery = rangeQuery.eq('account_id', params.accountId);
      }

      let latestQuery = supabase
        .from('account_analytics_snapshots')
        .select('account_id, platform, followers, snapshot_date')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('snapshot_date', { ascending: false });

      if (params.accountId) {
        latestQuery = latestQuery.eq('account_id', params.accountId);
      }

      const [rangeResult, latestResult] = await Promise.all([rangeQuery, latestQuery]);

      if (rangeResult.error) {
        console.error('Error fetching account growth:', rangeResult.error);
        throw new Error('Failed to fetch account growth');
      }

      const dataPoints: GrowthDataPoint[] = (rangeResult.data || []).map(row => ({
        date: row.snapshot_date,
        followers: row.followers,
        following: row.following,
        platform: row.platform,
        accountId: row.account_id,
      }));

      // Build LATEST followers per account (across ALL time, not just date range)
      const latestByAccount = new Map<string, number>();
      for (const row of latestResult.data || []) {
        if (!latestByAccount.has(row.account_id)) {
          latestByAccount.set(row.account_id, row.followers);
        }
      }

      const totalFollowers = Array.from(latestByAccount.values()).reduce((a, b) => a + b, 0);

      // Change calculation: earliest in range vs latest in range
      const earliestByAccount = new Map<string, number>();
      const latestInRangeByAccount = new Map<string, number>();

      for (const point of dataPoints) {
        if (!earliestByAccount.has(point.accountId)) {
          earliestByAccount.set(point.accountId, point.followers);
        }
        latestInRangeByAccount.set(point.accountId, point.followers);
      }

      const latestInRangeTotal = Array.from(latestInRangeByAccount.values()).reduce((a, b) => a + b, 0);
      const earliestTotal = Array.from(earliestByAccount.values()).reduce((a, b) => a + b, 0);
      const followerChange = latestInRangeTotal - earliestTotal;
      const changePercent = earliestTotal > 0 ? (followerChange / earliestTotal) * 100 : 0;

      return {
        dataPoints,
        totalFollowers,
        followerChange,
        changePercent,
      };
    },
    enabled: !!companyId,
  });
}

export function useAggregatedFollowers(days: number = 30) {
  const { data: company } = useCompany();
  const companyId = company?.id;

  return useQuery({
    queryKey: ['aggregated-followers', companyId, days],
    queryFn: async () => {
      if (!companyId) return [];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('account_analytics_snapshots')
        .select('snapshot_date, followers')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .gte('snapshot_date', startDate.toISOString().split('T')[0])
        .order('snapshot_date', { ascending: true });

      if (error) throw new Error('Failed to fetch follower data');

      // Aggregate by date
      const byDate = new Map<string, number>();
      for (const row of data || []) {
        const existing = byDate.get(row.snapshot_date) || 0;
        byDate.set(row.snapshot_date, existing + row.followers);
      }

      return Array.from(byDate.entries()).map(([date, followers]) => ({
        date,
        followers,
      }));
    },
    enabled: !!companyId,
  });
}
