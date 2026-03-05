import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, XCircle, Eye, UserPlus, Tag, X } from 'lucide-react';
import type { ConversationStatus, InboxLabel } from '@/lib/api/inbox';

interface BulkActionBarProps {
  selectedCount: number;
  onMarkRead: () => void;
  onUpdateStatus: (status: ConversationStatus) => void;
  onAssign: (assigneeId: string) => void;
  onAddLabel: (labelId: string) => void;
  onClear: () => void;
  labels?: InboxLabel[];
}

export function BulkActionBar({
  selectedCount,
  onMarkRead,
  onUpdateStatus,
  onAddLabel,
  onClear,
  labels = [],
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2.5 bg-background border rounded-lg shadow-lg">
      <span className="text-sm font-medium mr-2">{selectedCount} selected</span>

      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onMarkRead}>
        <Eye className="h-3.5 w-3.5" />
        Mark Read
      </Button>

      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => onUpdateStatus('resolved')}>
        <CheckCircle2 className="h-3.5 w-3.5" />
        Resolve
      </Button>

      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => onUpdateStatus('closed')}>
        <XCircle className="h-3.5 w-3.5" />
        Close
      </Button>

      {labels.length > 0 && (
        <Select onValueChange={onAddLabel}>
          <SelectTrigger className="h-7 text-xs w-[100px]">
            <Tag className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Label" />
          </SelectTrigger>
          <SelectContent>
            {labels.map((label) => (
              <SelectItem key={label.id} value={label.id}>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: label.color }} />
                  {label.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Button variant="ghost" size="icon" className="h-7 w-7 ml-1" onClick={onClear}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
