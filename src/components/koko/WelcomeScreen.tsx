import { FileText, BarChart3, Settings, MessageSquare, MessageSquarePlus } from 'lucide-react';
import { KokoAvatar } from './KokoAvatar';
import { cn } from '@/lib/utils';

interface WelcomeScreenProps {
  onAction: (text: string) => void;
}

const QUICK_ACTIONS = [
  { label: 'Create a post', icon: FileText },
  { label: 'Refine a draft', icon: MessageSquare },
  { label: 'Analytics insights', icon: BarChart3 },
  { label: 'Voice settings', icon: Settings },
  { label: 'Send feedback', icon: MessageSquarePlus },
] as const;

export function WelcomeScreen({ onAction }: WelcomeScreenProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
      <KokoAvatar size={56} className="text-primary mb-4" />

      <h2 className="text-base font-semibold mb-1">
        Hey! I'm Koko
      </h2>
      <p className="text-sm text-muted-foreground text-center mb-8 max-w-[280px]">
        Your social media copilot. I can help you create posts, refine drafts, analyze performance, and more.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2 w-full max-w-[320px]">
        {QUICK_ACTIONS.map(({ label, icon: Icon }) => (
          <button
            key={label}
            onClick={() => onAction(label)}
            className={cn(
              'flex items-center gap-1.5',
              'border border-border rounded-full px-3 py-1.5',
              'text-xs text-muted-foreground',
              'hover:bg-muted hover:text-foreground',
              'transition-colors',
            )}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
