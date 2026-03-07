import { cn } from '@/lib/utils';
import { Eye, PenTool } from 'lucide-react';
import type { PresenceUser } from '@/hooks/useConversationPresence';

interface PresenceBannerProps {
  others: PresenceUser[];
}

export function PresenceBanner({ others }: PresenceBannerProps) {
  if (others.length === 0) return null;

  const typing = others.filter(o => o.action === 'typing');
  const viewing = others.filter(o => o.action === 'viewing');
  const hasCollision = typing.length > 0;

  return (
    <div className={cn(
      'px-3 py-1.5 text-xs flex items-center gap-2 border-b',
      hasCollision ? 'bg-yellow-50 text-yellow-800 border-yellow-200' : 'bg-blue-50 text-blue-700 border-blue-200'
    )}>
      {typing.length > 0 && (
        <span className="flex items-center gap-1">
          <PenTool className="h-3 w-3" />
          {typing.map(t => t.userName).join(', ')} {typing.length === 1 ? 'is' : 'are'} typing a reply...
        </span>
      )}
      {viewing.length > 0 && typing.length === 0 && (
        <span className="flex items-center gap-1">
          <Eye className="h-3 w-3" />
          {viewing.map(v => v.userName).join(', ')} {viewing.length === 1 ? 'is' : 'are'} also viewing
        </span>
      )}
    </div>
  );
}
