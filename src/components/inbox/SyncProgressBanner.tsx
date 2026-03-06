import { useState, useEffect } from 'react';
import { Download, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHistoricalSyncJob, useStartHistoricalSync } from '@/hooks/useInboxBackfill';

export function SyncProgressBanner() {
  const { data: job } = useHistoricalSyncJob();
  const retrySync = useStartHistoricalSync();
  const [dismissed, setDismissed] = useState(false);

  // Auto-dismiss completed banner after 10s
  useEffect(() => {
    if (job?.status === 'completed') {
      const timer = setTimeout(() => setDismissed(true), 10000);
      return () => clearTimeout(timer);
    }
    setDismissed(false);
  }, [job?.status, job?.id]);

  if (!job || dismissed) return null;

  // Only show for recent jobs (within 24h)
  const jobAge = Date.now() - new Date(job.created_at).getTime();
  if (jobAge > 24 * 60 * 60 * 1000 && job.status !== 'running' && job.status !== 'pending') return null;

  if (job.status === 'pending') {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 text-sm flex-shrink-0 bg-blue-50 border-b border-blue-200 text-blue-900">
        <Loader2 className="h-4 w-4 flex-shrink-0 text-blue-600 animate-spin" />
        <span className="flex-1">Preparing to import your social inbox...</span>
      </div>
    );
  }

  if (job.status === 'running') {
    const convs = job.synced_conversations || 0;
    const msgs = job.synced_messages || 0;
    const phase = job.cursor_state?.phase || 'dms';

    return (
      <div className="flex items-center gap-3 px-4 py-2.5 text-sm flex-shrink-0 bg-blue-50 border-b border-blue-200 text-blue-900">
        <Download className="h-4 w-4 flex-shrink-0 text-blue-600 animate-pulse" />
        <div className="flex-1 min-w-0">
          <span className="font-medium">Importing your inbox...</span>{' '}
          <span>{convs} conversations, {msgs} messages</span>
          <span className="ml-2 text-xs text-blue-600">
            ({phase === 'dms' ? 'Direct messages' : phase === 'comments' ? 'Comments' : 'Finishing up'})
          </span>
        </div>
        <div className="h-1 w-24 bg-blue-200 rounded-full overflow-hidden flex-shrink-0">
          <div className="h-full bg-blue-600 rounded-full animate-pulse" style={{ width: '60%' }} />
        </div>
      </div>
    );
  }

  if (job.status === 'completed') {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 text-sm flex-shrink-0 bg-green-50 border-b border-green-200 text-green-900">
        <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600" />
        <span className="flex-1">
          Import complete! {job.synced_conversations || 0} conversations, {job.synced_messages || 0} messages imported.
        </span>
        <button
          onClick={() => setDismissed(true)}
          className="text-green-600 hover:text-green-800 text-xs underline flex-shrink-0"
        >
          Dismiss
        </button>
      </div>
    );
  }

  if (job.status === 'failed') {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 text-sm flex-shrink-0 bg-red-50 border-b border-red-200 text-red-900">
        <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-600" />
        <span className="flex-1 truncate">
          Import failed: {job.error || 'Unknown error'}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1 text-red-700 hover:bg-red-100 flex-shrink-0"
          onClick={() => retrySync.mutate()}
          disabled={retrySync.isPending}
        >
          <RefreshCw className={`h-3 w-3 ${retrySync.isPending ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    );
  }

  return null;
}
