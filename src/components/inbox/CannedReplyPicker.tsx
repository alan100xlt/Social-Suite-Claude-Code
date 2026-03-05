import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare } from 'lucide-react';
import type { InboxCannedReply } from '@/lib/api/inbox';

interface CannedReplyPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (content: string) => void;
  cannedReplies: InboxCannedReply[];
  platform?: string;
  contactName?: string;
}

export function CannedReplyPicker({
  open,
  onClose,
  onSelect,
  cannedReplies,
  platform,
  contactName,
}: CannedReplyPickerProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter by platform and search
  const filtered = cannedReplies.filter((r) => {
    if (r.platform && platform && r.platform !== platform) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return r.title.toLowerCase().includes(q) || r.shortcut?.toLowerCase().includes(q) || r.content.toLowerCase().includes(q);
  });

  useEffect(() => {
    if (open) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const handleSelect = (reply: InboxCannedReply) => {
    let content = reply.content;
    if (contactName) {
      content = content.replace(/\{\{contact_name\}\}/g, contactName);
    }
    onSelect(content);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      handleSelect(filtered[selectedIndex]);
    }
  };

  if (!open) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 z-30 bg-popover border rounded-lg shadow-lg overflow-hidden">
      <div className="p-2 border-b">
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search canned replies..."
          className="w-full text-sm bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="p-4 text-center text-sm text-muted-foreground">
          <MessageSquare className="h-6 w-6 mx-auto mb-1 opacity-30" />
          No canned replies found
        </div>
      ) : (
        <ScrollArea className="max-h-[240px]">
          <div className="p-1">
            {filtered.map((reply, i) => (
              <button
                key={reply.id}
                onClick={() => handleSelect(reply)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-md transition-colors text-sm',
                  i === selectedIndex ? 'bg-accent' : 'hover:bg-accent/50'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-xs">{reply.title}</span>
                  {reply.shortcut && (
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      /{reply.shortcut}
                    </span>
                  )}
                  {reply.platform && (
                    <span className="text-[10px] text-muted-foreground capitalize">{reply.platform}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{reply.content}</p>
              </button>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
