import { useState } from 'react';
import { cn } from '@/lib/utils';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const PREVIEW_BASE = `${SUPABASE_URL}/storage/v1/object/public/post-images/og-previews`;

interface TemplatePreviewCardProps {
  id: string;
  name: string;
  category: string;
  requiresImage: boolean;
  disabled: boolean;
  onToggle: () => void;
  isPending: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  photo: '#3B82F6',
  gradient: '#8B5CF6',
  news: '#EF4444',
  stats: '#10B981',
  editorial: '#D97706',
  brand: '#6366F1',
};

export function TemplatePreviewCard({ id, name, category, requiresImage, disabled, onToggle, isPending }: TemplatePreviewCardProps) {
  const [imgError, setImgError] = useState(false);
  const previewUrl = `${PREVIEW_BASE}/${id}.png`;
  const accent = CATEGORY_COLORS[category] || '#6366F1';

  return (
    <button
      onClick={onToggle}
      disabled={isPending}
      className={cn(
        'group relative rounded-lg border overflow-hidden text-left transition-all duration-200',
        disabled
          ? 'border-dashed border-muted-foreground/20 opacity-40 grayscale'
          : 'border-border hover:border-primary/50 hover:shadow-lg hover:scale-[1.02]'
      )}
    >
      {/* Preview image or fallback */}
      <div style={{ width: '100%', aspectRatio: '1200/630' }} className="bg-muted relative overflow-hidden">
        {!imgError ? (
          <img
            src={previewUrl}
            alt={`${name} template preview`}
            onError={() => setImgError(true)}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <FallbackPreview id={id} accent={accent} />
        )}
      </div>

      {/* Label bar */}
      <div className={cn(
        'px-2.5 py-1.5 bg-card border-t',
        disabled ? 'border-dashed border-muted-foreground/20' : 'border-border'
      )}>
        <div className="flex items-center justify-between gap-1">
          <span className={cn(
            'text-[11px] font-medium truncate',
            disabled ? 'text-muted-foreground/50' : 'text-foreground'
          )}>
            {name}
          </span>
          <div className={cn(
            'w-2 h-2 rounded-full flex-shrink-0 transition-colors',
            disabled ? 'bg-muted-foreground/30' : 'bg-green-500'
          )} />
        </div>
      </div>

      {disabled && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-semibold text-muted-foreground bg-background/90 px-2.5 py-1 rounded-md shadow-sm">
            DISABLED
          </span>
        </div>
      )}
    </button>
  );
}

/** Simple CSS fallback when no preview PNG exists yet */
function FallbackPreview({ id, accent }: { id: string; accent: string }) {
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = hash % 360;
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center gap-1"
      style={{ background: `linear-gradient(135deg, hsl(${hue}, 40%, 15%), hsl(${(hue + 40) % 360}, 35%, 10%))` }}
    >
      <div
        className="w-6 h-1 rounded-full"
        style={{ background: accent, opacity: 0.6 }}
      />
      <div className="text-[6px] text-white/40 font-medium">{id}</div>
    </div>
  );
}
