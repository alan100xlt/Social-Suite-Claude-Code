import { useEffect, useRef, createContext, useContext, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Search, BookOpen } from 'lucide-react';

// ---------------------------------------------------------------------------
// Glossary data
// ---------------------------------------------------------------------------

export interface GlossaryEntry {
  term: string;
  short: string;
  detail: string;
  category: 'ai' | 'inbox' | 'platform' | 'action' | 'metric';
}

const categoryLabels: Record<string, { label: string; color: string }> = {
  ai: { label: 'AI', color: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400' },
  inbox: { label: 'Inbox', color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400' },
  platform: { label: 'Platform', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' },
  action: { label: 'Action', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' },
  metric: { label: 'Metric', color: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400' },
};

export const glossary: GlossaryEntry[] = [
  // AI features
  {
    term: 'Sentiment',
    short: 'AI-detected emotional tone',
    detail: 'Every message is analyzed by Gemini AI and scored as Positive, Negative, or Neutral.\n\n• Positive — praise, gratitude, excitement, or satisfaction ("Love this article!", "Great work")\n• Negative — complaints, frustration, anger, or disappointment ("This is wrong", "Very disappointed")\n• Neutral — factual questions, informational messages, or ambiguous tone\n\nThe AI considers the full message context, not just keywords — sarcasm and nuance are handled. Sentiment is shown as a colored chip on each conversation card (blue = positive, red = negative, gray = neutral) and can be used as a filter to quickly surface unhappy contacts.',
    category: 'ai',
  },
  {
    term: 'Category',
    short: 'AI-classified message type',
    detail: 'Each conversation is classified into one of five categories based on its content and intent:\n\n• Editorial — news tips, story leads, content feedback, corrections, or media-related inquiries\n• Business — partnership proposals, sponsorship requests, sales inquiries, or commercial opportunities\n• Support — help requests, technical issues, account problems, or service complaints\n• Community — fan engagement, casual conversation, sharing, or general social interaction\n• Noise — spam, bot messages, irrelevant content, or automated notifications\n\nThe AI reads the full conversation thread (not just the last message) to determine category. You can filter by category to focus on what matters — for example, show only Business messages to your sales team.',
    category: 'ai',
  },
  {
    term: 'Editorial Value',
    short: 'AI-scored relevance (1-5)',
    detail: 'A score from 1 to 5 indicating how valuable a conversation is for your editorial or content strategy. The AI grades based on:\n\n★ 1 — No editorial relevance (spam, generic greetings, noise)\n★ 2 — Low relevance (casual comments, simple reactions)\n★ 3 — Moderate relevance (feedback on content, audience questions worth noting)\n★ 4 — High relevance (story leads, expert sources, detailed audience insights)\n★ 5 — Critical relevance (breaking news tips, exclusive sources, viral content opportunities)\n\nScores of 3+ are shown in the conversation list. Scores of 4-5 get a gold star badge — these are conversations your editorial team should review. Lower scores use a gray badge. Use the filter to surface only high-value conversations.',
    category: 'ai',
  },
  {
    term: 'Translate',
    short: 'AI-powered translation',
    detail: 'Translates your reply into the detected language of the conversation. Powered by Gemini AI.\n\nHow it works:\n1. The AI detects the language of incoming messages automatically\n2. The detected language appears next to the translate button\n3. Write your reply in your native language\n4. Click the translate icon to convert it before sending\n\nThe translation preserves your tone and intent while adapting to the target language. Useful for managing international audiences without needing multilingual team members.',
    category: 'ai',
  },
  // Inbox concepts
  {
    term: 'Conversation',
    short: 'A thread of messages',
    detail: 'A conversation groups all messages between you and a contact on a specific platform. It can be a DM thread, a comment thread on a post, or a review.\n\nEach conversation independently tracks:\n• Status (open, pending, resolved, closed)\n• AI analysis (sentiment, category, editorial value)\n• Labels and assignments\n• Read/unread state per team member\n\nConversations are synced from your connected social platforms via webhooks (real-time) and periodic polling (every 15 minutes as a safety net).',
    category: 'inbox',
  },
  {
    term: 'Internal Note',
    short: 'Private team note',
    detail: 'Notes added to a conversation that are only visible to your team — they are never sent to the contact or published on any platform.\n\nUse cases:\n• Add context before handing off to a colleague\n• Record follow-up reminders\n• Note important details from a phone call or meeting\n• Flag sensitive information about the contact\n\nInternal notes appear as yellow cards in the thread. Toggle note mode with the sticky note icon in the composer.',
    category: 'inbox',
  },
  {
    term: 'Flag',
    short: 'Mark for follow-up',
    detail: 'Flagging a conversation marks it for follow-up. Flagged conversations are visually highlighted with an amber badge in the list so you can easily find them later.\n\nFlags are personal to your session — other team members won\'t see your flags. Use them as quick bookmarks for conversations you want to return to.',
    category: 'inbox',
  },
  {
    term: 'Snooze',
    short: 'Temporarily hide a conversation',
    detail: 'Snoozing moves a conversation out of your active inbox until a specified time. When the snooze expires, the conversation reappears as if it just received a new message.\n\nPreset options: 1 hour, 4 hours, tomorrow, 3 days, 1 week — or pick a custom date. Great for "reply tomorrow" situations or waiting for information before responding.',
    category: 'inbox',
  },
  {
    term: 'Canned Reply',
    short: 'Pre-saved response template',
    detail: 'Saved message templates you can quickly insert by typing "/" in the composer. They save time on frequently asked questions and ensure consistent brand voice across your team.\n\nCanned replies can be platform-specific (e.g., different templates for Facebook vs. Instagram) and support variable placeholders for the contact\'s name.',
    category: 'inbox',
  },
  {
    term: 'Unread Count',
    short: 'New messages since last viewed',
    detail: 'The number badge shows how many new messages arrived since you last viewed this conversation. Opening a conversation automatically marks it as read.\n\nThe badge appears as a blue circle with the count on each conversation card. Bold text on the contact name and preview also indicates unread messages.',
    category: 'inbox',
  },
  // Platform
  {
    term: 'DM',
    short: 'Direct Message',
    detail: 'A private message sent directly to your account on a social platform. DMs are not publicly visible — only you and the sender can see them.\n\nYou can reply with text and media attachments (images, videos). DMs are synced in real-time via webhooks from connected platforms.',
    category: 'platform',
  },
  {
    term: 'Comment',
    short: 'Public comment on a post',
    detail: 'A message left on one of your published posts. Comments are publicly visible on the platform.\n\n⚠️ When you reply to a comment from the inbox, your reply is also publicly visible. A yellow warning banner appears in the composer to remind you of this. Use Internal Notes instead if you want to discuss a comment privately with your team.',
    category: 'platform',
  },
  {
    term: 'Syncing',
    short: 'Real-time data sync',
    detail: 'The green "Syncing" indicator means the inbox is actively connected to your social platforms.\n\nHow syncing works:\n• Webhooks deliver new messages in real-time (instant)\n• A background job polls every 15 minutes as a safety net for any missed webhooks\n• New conversations and messages appear automatically — no manual refresh needed\n\nIf the indicator disappears, check your platform connections in Settings.',
    category: 'platform',
  },
  {
    term: 'View on Platform',
    short: 'Open in the original platform',
    detail: 'Opens the original post or conversation directly on the social platform (Facebook, Instagram, etc.) in a new tab.\n\nUseful for seeing the full context — other comments, reactions, shares — or taking platform-specific actions that aren\'t available in the inbox (like hiding a comment or pinning a post).',
    category: 'platform',
  },
  // Actions
  {
    term: 'Resolve',
    short: 'Mark conversation as done',
    detail: 'Resolving a conversation marks it as handled. It moves out of your active inbox but can be found with the "Resolved" status filter.\n\nYou can reopen it any time if the contact follows up. If a resolved conversation receives a new message, it automatically reopens and returns to your active inbox.',
    category: 'action',
  },
  {
    term: 'Reopen',
    short: 'Move back to active inbox',
    detail: 'Reopening a resolved or closed conversation brings it back to your active inbox as an open conversation.\n\nUse this when a contact follows up, when an issue resurfaces, or when you realize a conversation was resolved prematurely.',
    category: 'action',
  },
  {
    term: 'Assign',
    short: 'Route to a team member',
    detail: 'Assigning a conversation to a team member makes them responsible for responding. The assignee can see their assigned conversations using the inbox filters.\n\nUse assignments to distribute workload across your team or route specialized topics (e.g., business inquiries to sales, support requests to customer service).',
    category: 'action',
  },
  {
    term: 'Label',
    short: 'Custom tag for organization',
    detail: 'Labels are custom color-coded tags you can attach to conversations for organization.\n\nExamples: "VIP", "Press", "Bug Report", "Partnership", "Story Lead"\n\nLabels can be added from the conversation header menu. You can attach multiple labels to a single conversation. Use the Label filter in the toolbar to view all conversations with a specific label.',
    category: 'action',
  },
  // Metrics
  {
    term: 'Message Count',
    short: 'Messages in thread',
    detail: 'The total number of messages exchanged in this conversation thread, including messages from the contact, your replies, and any internal notes.\n\nShown as a small counter with a message icon on the conversation card. Higher counts indicate more active or longer-running conversations.',
    category: 'metric',
  },
  {
    term: 'Priority',
    short: 'Conversation urgency level',
    detail: 'Conversations can be tagged with one of four priority levels:\n\n🔴 Urgent — requires immediate attention (e.g., crisis, PR issue, VIP complaint)\n🟠 High — important, should be handled soon (e.g., business opportunity, negative press)\n🟡 Normal — standard priority, handle in regular workflow\n⚪ Low — informational, can be addressed when time permits\n\nPriority can be set manually or automatically by AI rules. Auto-rules can escalate priority based on sentiment (negative → high), category (business → high), or editorial value (4-5 → urgent).',
    category: 'metric',
  },
];

// ---------------------------------------------------------------------------
// Context for opening the glossary from anywhere
// ---------------------------------------------------------------------------

interface GlossaryContextValue {
  open: (term?: string) => void;
}

const GlossaryContext = createContext<GlossaryContextValue>({ open: () => {} });

export function useGlossary() {
  return useContext(GlossaryContext);
}

// ---------------------------------------------------------------------------
// Provider + Dialog
// ---------------------------------------------------------------------------

export function GlossaryProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightTerm, setHighlightTerm] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const termRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const open = useCallback((term?: string) => {
    setHighlightTerm(term || null);
    setSearch('');
    setIsOpen(true);
  }, []);

  // Scroll to highlighted term after dialog opens (target only the ScrollArea viewport)
  useEffect(() => {
    if (isOpen && highlightTerm) {
      const timer = setTimeout(() => {
        const el = termRefs.current.get(highlightTerm.toLowerCase());
        if (!el) return;
        const viewport = el.closest('[data-radix-scroll-area-viewport]') as HTMLElement;
        if (viewport) {
          const elTop = el.offsetTop - viewport.offsetTop;
          viewport.scrollTo({ top: Math.max(0, elTop - 80), behavior: 'smooth' });
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, highlightTerm]);

  const filtered = search
    ? glossary.filter(
        (e) =>
          e.term.toLowerCase().includes(search.toLowerCase()) ||
          e.short.toLowerCase().includes(search.toLowerCase()) ||
          e.detail.toLowerCase().includes(search.toLowerCase())
      )
    : glossary;

  // Group by category
  const grouped = filtered.reduce<Record<string, GlossaryEntry[]>>((acc, entry) => {
    (acc[entry.category] = acc[entry.category] || []).push(entry);
    return acc;
  }, {});

  return (
    <GlossaryContext.Provider value={{ open }}>
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <BookOpen className="w-4.5 h-4.5 text-primary" />
              Inbox Glossary
            </DialogTitle>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search terms..."
                className="pl-9 h-9 text-sm"
                autoFocus
              />
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0 px-5 pb-5">
            {Object.entries(grouped).map(([cat, entries]) => {
              const catInfo = categoryLabels[cat] || { label: cat, color: 'bg-muted text-muted-foreground' };
              return (
                <div key={cat} className="mb-5 last:mb-0">
                  <div className="flex items-center gap-2 mb-2.5 sticky top-0 bg-background py-1 z-10">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${catInfo.color}`}>
                      {catInfo.label}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <div className="space-y-2.5">
                    {entries.map((entry) => {
                      const isHighlighted = highlightTerm?.toLowerCase() === entry.term.toLowerCase();
                      return (
                        <div
                          key={entry.term}
                          ref={(el) => {
                            if (el) termRefs.current.set(entry.term.toLowerCase(), el);
                          }}
                          className={`rounded-lg border p-3.5 transition-colors ${
                            isHighlighted
                              ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                              : 'border-border'
                          }`}
                        >
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="font-semibold text-sm text-foreground">{entry.term}</span>
                            <span className="text-xs text-muted-foreground">{entry.short}</span>
                          </div>
                          <p className="text-[13px] leading-relaxed text-muted-foreground whitespace-pre-line">
                            {entry.detail}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No matching terms found.
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </GlossaryContext.Provider>
  );
}
