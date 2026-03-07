import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tip } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import type { ReadReceipt } from '@/hooks/useReadReceipts';

interface ReadReceiptAvatarsProps {
  receipts: ReadReceipt[];
  maxVisible?: number;
}

export function ReadReceiptAvatars({ receipts, maxVisible = 3 }: ReadReceiptAvatarsProps) {
  if (!receipts?.length) return null;

  const visible = receipts.slice(0, maxVisible);
  const overflow = receipts.length - maxVisible;

  const tooltipContent = receipts
    .map(r => `${r.user_name} — ${formatDistanceToNow(new Date(r.last_read_at), { addSuffix: true })}`)
    .join('\n');

  return (
    <Tip label={tooltipContent}>
      <div className="flex items-center -space-x-1.5">
        {visible.map((r) => {
          const initials = (r.user_name || '??').slice(0, 2).toUpperCase();
          return (
            <Avatar key={r.user_id} className="h-4 w-4 border border-background">
              <AvatarImage src={r.user_avatar || undefined} />
              <AvatarFallback className="text-[6px] bg-muted">{initials}</AvatarFallback>
            </Avatar>
          );
        })}
        {overflow > 0 && (
          <span className="flex items-center justify-center h-4 w-4 rounded-full bg-muted border border-background text-[7px] font-bold text-muted-foreground">
            +{overflow}
          </span>
        )}
      </div>
    </Tip>
  );
}
