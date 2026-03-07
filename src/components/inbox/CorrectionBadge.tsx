import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import type { CorrectionStatus } from '@/hooks/useCorrections';

const statusConfig: Record<CorrectionStatus, { label: string; className: string }> = {
  open: { label: 'Correction', className: 'bg-red-100 text-red-800 border-red-200' },
  in_progress: { label: 'In Progress', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  resolved: { label: 'Resolved', className: 'bg-green-100 text-green-800 border-green-200' },
  rejected: { label: 'Rejected', className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

export function CorrectionBadge({ status }: { status: CorrectionStatus }) {
  const config = statusConfig[status];
  return (
    <Badge variant="outline" className={`text-xs gap-1 ${config.className}`}>
      <AlertTriangle className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
