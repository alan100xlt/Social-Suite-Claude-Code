import { useLocation } from 'react-router-dom';
import { useKoko } from '@/contexts/KokoContext';
import { KokoAvatar } from './KokoAvatar';
import { cn } from '@/lib/utils';

export function KokoFab() {
  const { isOpen, toggle } = useKoko();
  const { pathname } = useLocation();

  // Only show on protected /app/* routes
  if (!pathname.startsWith('/app')) return null;
  if (isOpen) return null;

  return (
    <button
      onClick={toggle}
      className={cn(
        'fixed bottom-6 right-6 z-50',
        'flex items-center justify-center',
        'h-12 w-12 rounded-full',
        'bg-primary text-primary-foreground',
        'shadow-lg shadow-primary/25',
        'transition-all duration-200',
        'hover:scale-110 hover:shadow-xl hover:shadow-primary/30',
        'active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
      )}
      aria-label="Open Koko AI Copilot"
    >
      <KokoAvatar size={28} />
    </button>
  );
}
