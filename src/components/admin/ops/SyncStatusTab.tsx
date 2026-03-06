import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Server, AlertTriangle, MessageSquare } from 'lucide-react';
import { useAdminSyncStatus, type SyncStateEntry, type CronHealthLog } from '@/hooks/useAdminSyncStatus';
import { useAdminCompanies } from '@/hooks/useAdminInboxData';
import { format, formatDistanceToNow } from 'date-fns';

function getSyncHealthStatus(lastSynced: string | null): { label: string; color: string } {
  if (!lastSynced) return { label: 'Never', color: 'text-muted-foreground' };
  const diffMs = Date.now() - new Date(lastSynced).getTime();
  if (diffMs < 15 * 60 * 1000) return { label: 'Healthy', color: 'text-green-500' };
  if (diffMs < 60 * 60 * 1000) return { label: 'Stale', color: 'text-yellow-500' };
  return { label: 'Error', color: 'text-red-500' };
}

export function SyncStatusTab() {
  const { syncStates, cronLogs, messageCount24h, isLoading } = useAdminSyncStatus();
  const { data: companies } = useAdminCompanies();

  const companyMap = useMemo(() => {
    const map: Record<string, string> = {};
    companies?.forEach(c => { map[c.id] = c.name; });
    return map;
  }, [companies]);

  // Group sync states by company
  const companySync = useMemo(() => {
    const map: Record<string, { comments?: SyncStateEntry; dms?: SyncStateEntry }> = {};
    for (const s of syncStates) {
      if (!map[s.company_id]) map[s.company_id] = {};
      if (s.sync_type === 'comments') map[s.company_id].comments = s;
      if (s.sync_type === 'dms') map[s.company_id].dms = s;
    }
    return map;
  }, [syncStates]);

  const uniqueCompanies = Object.keys(companySync);
  const companiesWithErrors = uniqueCompanies.filter(id => {
    const s = companySync[id];
    return getSyncHealthStatus(s.comments?.last_synced_at || null).label === 'Error' ||
           getSyncHealthStatus(s.dms?.last_synced_at || null).label === 'Error';
  });

  const lastGlobalSync = cronLogs[0]?.created_at;

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><RefreshCw className="h-5 w-5 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Server className="h-4 w-4" /> Companies Syncing
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{uniqueCompanies.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> Last Global Sync
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{lastGlobalSync ? formatDistanceToNow(new Date(lastGlobalSync), { addSuffix: true }) : 'Never'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Companies with Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${companiesWithErrors.length > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {companiesWithErrors.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Messages (24h)
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{messageCount24h}</p></CardContent>
        </Card>
      </div>

      {/* Per-company sync table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-Company Sync Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Comments Last Synced</TableHead>
                  <TableHead>DMs Last Synced</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uniqueCompanies.map(companyId => {
                  const s = companySync[companyId];
                  const commentHealth = getSyncHealthStatus(s.comments?.last_synced_at || null);
                  const dmHealth = getSyncHealthStatus(s.dms?.last_synced_at || null);
                  const worstHealth = commentHealth.label === 'Error' || dmHealth.label === 'Error' ? 'Error'
                    : commentHealth.label === 'Stale' || dmHealth.label === 'Stale' ? 'Stale' : 'Healthy';
                  const badgeVariant = worstHealth === 'Healthy' ? 'default' : worstHealth === 'Stale' ? 'secondary' : 'destructive';
                  return (
                    <TableRow key={companyId}>
                      <TableCell className="font-medium">{companyMap[companyId] || companyId.slice(0, 8)}</TableCell>
                      <TableCell>{s.comments?.last_synced_at ? formatDistanceToNow(new Date(s.comments.last_synced_at), { addSuffix: true }) : 'Never'}</TableCell>
                      <TableCell>{s.dms?.last_synced_at ? formatDistanceToNow(new Date(s.dms.last_synced_at), { addSuffix: true }) : 'Never'}</TableCell>
                      <TableCell><Badge variant={badgeVariant as any}>{worstHealth}</Badge></TableCell>
                    </TableRow>
                  );
                })}
                {uniqueCompanies.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No sync data yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Recent sync executions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Sync Executions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cronLogs.slice(0, 20).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{format(new Date(log.created_at), 'MMM d, HH:mm:ss')}</TableCell>
                    <TableCell>
                      <Badge variant={log.status === 'success' ? 'default' : log.status === 'partial' ? 'secondary' : 'destructive'}>
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.duration_ms}ms</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {(log.details as any)?.totalNew != null ? `${(log.details as any).totalNew} new, ${(log.details as any).totalErrors} errors` : JSON.stringify(log.details).slice(0, 100)}
                    </TableCell>
                  </TableRow>
                ))}
                {cronLogs.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No sync executions yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
