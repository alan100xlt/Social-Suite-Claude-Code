import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { InboxMessage } from '@/lib/api/inbox';

interface SearchResult extends InboxMessage {
  conversation?: {
    id: string;
    platform: string;
    type: string;
    subject: string | null;
    contact: { display_name: string | null; username: string | null; avatar_url: string | null } | null;
  };
}

interface SearchResultsProps {
  results: SearchResult[];
  isLoading: boolean;
  query: string;
  onSelectConversation: (conversationId: string) => void;
}

function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-yellow-200/60 dark:bg-yellow-800/40 rounded-sm px-0.5">{part}</mark>
      : part
  );
}

export function SearchResults({ results, isLoading, query, onSelectConversation }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="p-3 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Search className="h-10 w-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No results for "{query}"</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Try different search terms</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2">
        <p className="text-xs text-muted-foreground px-2 py-1 mb-1">{results.length} result{results.length !== 1 ? 's' : ''}</p>
        <div className="space-y-1">
          {results.map((result) => {
            const contact = result.conversation?.contact || result.contact;
            const name = contact?.display_name || contact?.username || 'Unknown';
            const initials = name.slice(0, 2).toUpperCase();
            const convId = result.conversation?.id || result.conversation_id;

            return (
              <button
                key={result.id}
                onClick={() => onSelectConversation(convId)}
                className="w-full flex items-start gap-3 p-2.5 rounded-md text-left transition-colors hover:bg-accent/50"
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={contact?.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium truncate">{name}</span>
                    {result.conversation?.platform && (
                      <Badge variant="secondary" className="text-[9px] px-1 capitalize">
                        {result.conversation.platform}
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm mt-0.5 line-clamp-2">
                    {highlightMatch(result.content, query)}
                  </p>

                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    {formatDistanceToNow(new Date(result.created_at), { addSuffix: true })}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
