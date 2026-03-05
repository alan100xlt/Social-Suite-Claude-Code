import { X, Plus, MessageSquare, ChevronDown } from 'lucide-react';
import { useKoko } from '@/contexts/KokoContext';
import { useKokoThreads, useCreateKokoThread } from '@/hooks/useKokoThreads';
import { KokoAvatar } from './KokoAvatar';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';

export function KokoHeader() {
  const { close, activeThreadId, setActiveThread } = useKoko();
  const { threads, isLoading } = useKokoThreads();
  const createThread = useCreateKokoThread();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen]);

  const handleNewChat = async () => {
    try {
      const thread = await createThread.mutateAsync();
      setActiveThread(thread.id);
      setDropdownOpen(false);
    } catch (error) {
      console.error('Failed to create thread:', error);
    }
  };

  const activeThread = threads.find(t => t.id === activeThreadId);

  return (
    <div className="flex items-center gap-2 border-b border-border px-4 py-3 shrink-0">
      {/* Title */}
      <KokoAvatar size={20} className="text-primary" />
      <span className="text-sm font-semibold">Koko</span>

      {/* Thread selector */}
      <div className="relative ml-auto" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-md text-xs',
            'text-muted-foreground hover:text-foreground hover:bg-muted',
            'transition-colors',
          )}
          disabled={isLoading}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span className="max-w-[120px] truncate">
            {activeThread?.title || (activeThreadId ? 'Untitled chat' : 'No chat')}
          </span>
          <ChevronDown className="h-3 w-3" />
        </button>

        {dropdownOpen && (
          <div className={cn(
            'absolute right-0 top-full mt-1 z-50',
            'w-56 rounded-lg border border-border',
            'bg-popover text-popover-foreground',
            'shadow-lg',
            'py-1',
          )}>
            {/* New chat button */}
            <button
              onClick={handleNewChat}
              disabled={createThread.isPending}
              className={cn(
                'flex items-center gap-2 w-full px-3 py-2 text-xs',
                'hover:bg-muted transition-colors',
                'text-primary font-medium',
              )}
            >
              <Plus className="h-3.5 w-3.5" />
              New chat
            </button>

            {threads.length > 0 && (
              <div className="border-t border-border my-1" />
            )}

            {/* Thread list */}
            <div className="max-h-48 overflow-y-auto">
              {threads.map(thread => (
                <button
                  key={thread.id}
                  onClick={() => {
                    setActiveThread(thread.id);
                    setDropdownOpen(false);
                  }}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-2 text-xs text-left',
                    'hover:bg-muted transition-colors',
                    'truncate',
                    thread.id === activeThreadId && 'bg-muted font-medium',
                  )}
                >
                  <MessageSquare className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="truncate">
                    {thread.title || 'Untitled chat'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* New chat shortcut */}
      <button
        onClick={handleNewChat}
        disabled={createThread.isPending}
        className={cn(
          'flex items-center justify-center h-7 w-7 rounded-md',
          'text-muted-foreground hover:text-foreground hover:bg-muted',
          'transition-colors',
        )}
        aria-label="New chat"
      >
        <Plus className="h-4 w-4" />
      </button>

      {/* Close button */}
      <button
        onClick={close}
        className={cn(
          'flex items-center justify-center h-7 w-7 rounded-md',
          'text-muted-foreground hover:text-foreground hover:bg-muted',
          'transition-colors',
        )}
        aria-label="Close Koko"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
