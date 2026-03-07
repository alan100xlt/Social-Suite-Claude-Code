import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CorrectionBadge } from './CorrectionBadge';
import { useUpdateCorrectionStatus } from '@/hooks/useCorrections';
import type { Correction, CorrectionStatus } from '@/hooks/useCorrections';
import { AlertTriangle, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CorrectionsPanelProps {
  correction: Correction;
}

export function CorrectionsPanel({ correction }: CorrectionsPanelProps) {
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [showResolutionInput, setShowResolutionInput] = useState(false);
  const updateStatus = useUpdateCorrectionStatus();
  const { toast } = useToast();

  const handleStatusChange = async (status: CorrectionStatus) => {
    if (status === 'resolved' && !showResolutionInput) {
      setShowResolutionInput(true);
      return;
    }

    try {
      await updateStatus.mutateAsync({
        correctionId: correction.id,
        status,
        resolutionSummary: status === 'resolved' ? resolutionSummary || undefined : undefined,
      });
      toast({
        title: `Correction ${status === 'resolved' ? 'resolved' : status === 'rejected' ? 'rejected' : 'updated'}`,
      });
      setShowResolutionInput(false);
      setResolutionSummary('');
    } catch {
      toast({ title: 'Failed to update correction', variant: 'destructive' });
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          Correction Request
          <span className="ml-auto">
            <CorrectionBadge status={correction.status as CorrectionStatus} />
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3">
        {correction.notes && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
            <p className="text-sm">{correction.notes}</p>
          </div>
        )}

        {correction.resolution_summary && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Resolution</p>
            <p className="text-sm">{correction.resolution_summary}</p>
          </div>
        )}

        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>Created: {formatDate(correction.created_at)}</span>
          {correction.updated_at && correction.updated_at !== correction.created_at && (
            <span>Updated: {formatDate(correction.updated_at)}</span>
          )}
          {correction.resolved_at && <span>Resolved: {formatDate(correction.resolved_at)}</span>}
        </div>

        {showResolutionInput && (
          <div className="space-y-2">
            <Textarea
              placeholder="Describe how this was resolved..."
              value={resolutionSummary}
              onChange={(e) => setResolutionSummary(e.target.value)}
              className="text-sm min-h-[60px]"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => handleStatusChange('resolved')}
                disabled={updateStatus.isPending}
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Confirm Resolution
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowResolutionInput(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {!showResolutionInput && correction.status === 'open' && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => handleStatusChange('in_progress')}
              disabled={updateStatus.isPending}
            >
              <ArrowRight className="h-3 w-3 mr-1" />
              Start Working
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-red-600 hover:text-red-700"
              onClick={() => handleStatusChange('rejected')}
              disabled={updateStatus.isPending}
            >
              <XCircle className="h-3 w-3 mr-1" />
              Reject
            </Button>
          </div>
        )}

        {!showResolutionInput && correction.status === 'in_progress' && (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => handleStatusChange('resolved')}
              disabled={updateStatus.isPending}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Resolve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-red-600 hover:text-red-700"
              onClick={() => handleStatusChange('rejected')}
              disabled={updateStatus.isPending}
            >
              <XCircle className="h-3 w-3 mr-1" />
              Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
