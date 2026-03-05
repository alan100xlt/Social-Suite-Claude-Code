import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { isDemoCompany } from '@/lib/demo/demo-constants';
import { inboxApi } from '@/lib/api/inbox';

export function useInboxSearch(query: string) {
  const { selectedCompanyId } = useSelectedCompany();
  const isDemo = isDemoCompany(selectedCompanyId);
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  return useQuery({
    queryKey: ['inbox-search', selectedCompanyId, debouncedQuery],
    queryFn: async () => {
      if (!selectedCompanyId || !debouncedQuery) return [];
      const result = await inboxApi.search.messages(selectedCompanyId, debouncedQuery);
      if (!result.success) throw new Error(result.error);
      return result.results;
    },
    enabled: !!selectedCompanyId && !!debouncedQuery && debouncedQuery.length >= 2 && !isDemo,
  });
}
