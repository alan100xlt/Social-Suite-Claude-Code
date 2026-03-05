import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraftPreviewCardProps {
  result: Record<string, unknown>;
}

export function DraftPreviewCard({ result }: DraftPreviewCardProps) {
  const navigate = useNavigate();

  const title = (result.title as string) || 'Untitled Draft';
  const content = (result.content as string) || '';
  const draftId = result.draft_id as string | undefined;
  const platforms = (result.platforms as string[]) || [];

  const preview = content.length > 100 ? content.slice(0, 100) + '...' : content;

  const handleEdit = () => {
    if (draftId) {
      navigate(`/app/content?tab=posts&draft=${draftId}`);
    }
  };

  return (
    <div className={cn(
      'rounded-lg border border-border',
      'bg-muted/30 p-3 my-2',
    )}>
      <div className="flex items-start gap-2 mb-2">
        <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium truncate">{title}</p>
          {platforms.length > 0 && (
            <div className="flex gap-1 mt-1">
              {platforms.map(platform => (
                <span
                  key={platform}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                >
                  {platform}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {preview && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
          {preview}
        </p>
      )}

      {draftId && (
        <button
          onClick={handleEdit}
          className={cn(
            'text-xs font-medium text-primary',
            'hover:underline',
          )}
        >
          Edit in Composer
        </button>
      )}
    </div>
  );
}
