import { useState, useMemo, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ConversationList } from '@/components/inbox/ConversationList';
import { ConversationThread } from '@/components/inbox/ConversationThread';
import { ConversationHeader } from '@/components/inbox/ConversationHeader';
import { MessageComposer } from '@/components/inbox/MessageComposer';
import { ContactDetailPanel } from '@/components/inbox/ContactDetailPanel';
import { BulkActionBar } from '@/components/inbox/BulkActionBar';
import { SearchResults } from '@/components/inbox/SearchResults';
import { CannedReplyPicker } from '@/components/inbox/CannedReplyPicker';
import { AISuggestionsPanel } from '@/components/inbox/AISuggestionsPanel';
import {
  Search,
  PanelRight,
  MessageSquare,
  Mail,
  Star,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { FaFacebook, FaInstagram, FaTwitter, FaLinkedin, FaTiktok, FaYoutube } from 'react-icons/fa';
import { SiBluesky, SiThreads } from 'react-icons/si';
import { cn } from '@/lib/utils';
import {
  useInboxConversations,
  useUpdateConversationStatus,
  useAssignConversation,
  useMarkConversationRead,
  useBulkUpdateStatus,
} from '@/hooks/useInboxConversations';
import { useInboxMessages, useReplyToComment, useReplyToDM, useAddInternalNote } from '@/hooks/useInboxMessages';
import { useInboxLabels, useInboxCannedReplies, useAddConversationLabel, useRemoveConversationLabel } from '@/hooks/useInboxLabels';
import { useInboxSearch } from '@/hooks/useInboxSearch';
import { useInboxRealtime } from '@/hooks/useInboxRealtime';
import { useDemo } from '@/lib/demo/DemoDataProvider';
import type { ConversationStatus, ConversationType, InboxConversation, InboxMessage } from '@/lib/api/inbox';

const platformTabIcons: { key: string; icon: React.ElementType; color: string }[] = [
  { key: 'facebook', icon: FaFacebook, color: 'text-blue-600' },
  { key: 'instagram', icon: FaInstagram, color: 'text-pink-500' },
  { key: 'twitter', icon: FaTwitter, color: 'text-sky-500' },
  { key: 'linkedin', icon: FaLinkedin, color: 'text-blue-700' },
  { key: 'tiktok', icon: FaTiktok, color: 'text-foreground' },
  { key: 'youtube', icon: FaYoutube, color: 'text-red-500' },
  { key: 'bluesky', icon: SiBluesky, color: 'text-sky-400' },
  { key: 'threads', icon: SiThreads, color: 'text-foreground' },
];

type TypeTab = 'all' | 'dm' | 'comment' | 'review';

export default function InboxPage() {
  const { isDemo } = useDemo();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showCannedPicker, setShowCannedPicker] = useState(false);
  const [replyTo, setReplyTo] = useState<InboxMessage | null>(null);
  const [composerContent, setComposerContent] = useState('');
  const [activeTypeTab, setActiveTypeTab] = useState<TypeTab>('all');
  const [activePlatform, setActivePlatform] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<{
    status?: ConversationStatus;
    platform?: string;
    type?: ConversationType;
  }>({});

  // FTS search mode
  const [ftsQuery, setFtsQuery] = useState('');
  const isSearchMode = ftsQuery.length >= 2;

  // Data hooks
  const { data: conversations = [], isLoading: conversationsLoading } = useInboxConversations({
    status: filters.status,
    platform: filters.platform || activePlatform || undefined,
    type: activeTypeTab === 'all' ? filters.type : activeTypeTab as ConversationType,
  });

  const { data: messages = [], isLoading: messagesLoading } = useInboxMessages(selectedConversationId);
  const { data: labels = [] } = useInboxLabels();
  const { data: cannedReplies = [] } = useInboxCannedReplies();
  const { data: searchResults = [], isLoading: searchLoading } = useInboxSearch(ftsQuery);

  // Realtime
  useInboxRealtime(selectedConversationId);

  // Mutations
  const updateStatus = useUpdateConversationStatus();
  const assignConversation = useAssignConversation();
  const markRead = useMarkConversationRead();
  const bulkUpdate = useBulkUpdateStatus();
  const replyComment = useReplyToComment();
  const replyDM = useReplyToDM();
  const addNote = useAddInternalNote();
  const addLabel = useAddConversationLabel();
  const removeLabel = useRemoveConversationLabel();

  // Filter by search locally
  const filteredConversations = useMemo(() => {
    let result = conversations;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c: InboxConversation) =>
        c.contact?.display_name?.toLowerCase().includes(q) ||
        c.contact?.username?.toLowerCase().includes(q) ||
        c.last_message_preview?.toLowerCase().includes(q) ||
        c.subject?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [conversations, searchQuery]);

  const selectedConversation = filteredConversations.find((c: InboxConversation) => c.id === selectedConversationId) || null;

  // Counts
  const totalCount = conversations.length;
  const dmCount = conversations.filter((c: InboxConversation) => c.type === 'dm').length;
  const commentCount = conversations.filter((c: InboxConversation) => c.type === 'comment').length;
  const reviewCount = conversations.filter((c: InboxConversation) => c.type === 'review').length;

  // Platform counts for the platform bar
  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    conversations.forEach((c: InboxConversation) => {
      counts[c.platform] = (counts[c.platform] || 0) + 1;
    });
    return counts;
  }, [conversations]);

  const handleSelectConversation = useCallback((id: string) => {
    setSelectedConversationId(id);
    setFtsQuery('');
    setReplyTo(null);
    setComposerContent('');
    markRead.mutate(id);
  }, [markRead]);

  const handleStatusChange = useCallback((status: ConversationStatus) => {
    if (!selectedConversationId) return;
    updateStatus.mutate({ conversationId: selectedConversationId, status });
  }, [selectedConversationId, updateStatus]);

  const handleAssign = useCallback((assigneeId: string | null) => {
    if (!selectedConversationId) return;
    assignConversation.mutate({ conversationId: selectedConversationId, assigneeId });
  }, [selectedConversationId, assignConversation]);

  const handleAddLabel = useCallback((labelId: string) => {
    if (!selectedConversationId) return;
    addLabel.mutate({ conversationId: selectedConversationId, labelId });
  }, [selectedConversationId, addLabel]);

  const handleRemoveLabel = useCallback((labelId: string) => {
    if (!selectedConversationId) return;
    removeLabel.mutate({ conversationId: selectedConversationId, labelId });
  }, [selectedConversationId, removeLabel]);

  const handleSend = useCallback((content: string, mediaUrl?: string) => {
    if (!selectedConversation) return;
    if (selectedConversation.type === 'dm') {
      replyDM.mutate({ conversationId: selectedConversation.id, content, mediaUrl });
    } else {
      replyComment.mutate({
        conversationId: selectedConversation.id,
        content,
        parentCommentId: replyTo?.platform_message_id || undefined,
      });
    }
    setReplyTo(null);
    setComposerContent('');
  }, [selectedConversation, replyDM, replyComment, replyTo]);

  const handleAddNote = useCallback((content: string) => {
    if (!selectedConversation) return;
    addNote.mutate({ conversationId: selectedConversation.id, content });
  }, [selectedConversation, addNote]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSnooze = useCallback((_until: Date) => {
    if (!selectedConversationId) return;
    updateStatus.mutate({ conversationId: selectedConversationId, status: 'snoozed' });
  }, [selectedConversationId, updateStatus]);

  const handleInsertReply = useCallback((content: string) => {
    setComposerContent(content);
  }, []);

  // Bulk actions
  const handleBulkMarkRead = useCallback(() => {
    selectedIds.forEach(id => markRead.mutate(id));
    setSelectedIds(new Set());
  }, [selectedIds, markRead]);

  const handleBulkUpdateStatus = useCallback((status: ConversationStatus) => {
    bulkUpdate.mutate({ conversationIds: Array.from(selectedIds), status });
    setSelectedIds(new Set());
  }, [selectedIds, bulkUpdate]);

  const handleBulkAssign = useCallback((assigneeId: string) => {
    selectedIds.forEach(id => assignConversation.mutate({ conversationId: id, assigneeId }));
    setSelectedIds(new Set());
  }, [selectedIds, assignConversation]);

  const handleBulkAddLabel = useCallback((labelId: string) => {
    selectedIds.forEach(id => addLabel.mutate({ conversationId: id, labelId }));
    setSelectedIds(new Set());
  }, [selectedIds, addLabel]);

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* === TOPBAR === */}
        <div className="bg-background border-b flex-shrink-0 px-6">
          {/* Row 1: Title + count + sync indicator */}
          <div className="flex items-center gap-4 h-[54px]">
            <h1 className="text-lg font-extrabold tracking-tight">Inbox</h1>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary">
              {totalCount} conversations
            </span>
            <div className="flex items-center gap-1.5 ml-auto text-xs font-semibold text-emerald-600">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Syncing
            </div>
          </div>

          {/* Row 2: Filters + drawer toggle */}
          <div className="flex items-center gap-2 pb-3 flex-wrap">
            <span className="text-xs font-bold text-muted-foreground mr-1">Filters:</span>

            <FilterDropdown
              label="Status"
              value={filters.status}
              options={[
                { value: 'open', label: 'Open' },
                { value: 'pending', label: 'Pending' },
                { value: 'resolved', label: 'Resolved' },
                { value: 'closed', label: 'Closed' },
              ]}
              onChange={(v) => setFilters(f => ({ ...f, status: v as ConversationStatus | undefined }))}
            />

            <FilterDropdown
              label="Platform"
              value={filters.platform}
              options={platformTabIcons.map(p => ({ value: p.key, label: p.key.charAt(0).toUpperCase() + p.key.slice(1) }))}
              onChange={(v) => setFilters(f => ({ ...f, platform: v }))}
            />

            <FilterDropdown
              label="Type"
              value={filters.type}
              options={[
                { value: 'comment', label: 'Comments' },
                { value: 'dm', label: 'DMs' },
                { value: 'review', label: 'Reviews' },
                { value: 'mention', label: 'Mentions' },
              ]}
              onChange={(v) => setFilters(f => ({ ...f, type: v as ConversationType | undefined }))}
            />

            <button
              onClick={() => setDrawerOpen(!drawerOpen)}
              className={cn(
                'ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors',
                drawerOpen
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
              )}
            >
              <PanelRight className="h-4 w-4" />
              Details
            </button>
          </div>
        </div>

        {/* === MAIN GRID === */}
        <div
          className={cn(
            'flex-1 grid gap-3.5 p-3.5 min-h-0 transition-all',
            drawerOpen
              ? 'grid-cols-[480px_1fr_340px]'
              : 'grid-cols-[480px_1fr]'
          )}
        >
          {/* === CONVERSATION PANEL (left) === */}
          <div className="bg-background rounded-xl border shadow-sm flex flex-col overflow-hidden min-h-0">
            {/* Platform icon bar */}
            <div className="flex items-center gap-1.5 px-4 py-3 border-b">
              <button
                onClick={() => setActivePlatform(null)}
                className={cn(
                  'h-9 w-9 rounded-full flex items-center justify-center text-[11px] font-extrabold transition-colors border-2',
                  !activePlatform
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-transparent bg-muted text-muted-foreground hover:border-border'
                )}
              >
                ALL
              </button>
              {platformTabIcons
                .filter(p => platformCounts[p.key])
                .map(p => (
                  <button
                    key={p.key}
                    onClick={() => setActivePlatform(activePlatform === p.key ? null : p.key)}
                    className={cn(
                      'h-9 w-9 rounded-full flex items-center justify-center transition-colors border-2',
                      activePlatform === p.key
                        ? 'border-primary bg-primary/5'
                        : 'border-transparent bg-muted hover:border-border',
                      p.color
                    )}
                  >
                    <p.icon className="h-4 w-4" />
                  </button>
                ))
              }
              <span className="ml-auto text-xs font-semibold text-muted-foreground">
                {filteredConversations.length} total
              </span>
            </div>

            {/* Search */}
            <div className="px-4 py-2.5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border bg-muted/50 text-sm outline-none focus:border-primary focus:bg-background transition-colors"
                />
              </div>
            </div>

            {/* Type tabs: All / DMs / Comments / Reviews */}
            <div className="flex border-b px-4">
              {([
                { key: 'all', label: 'All', count: totalCount },
                { key: 'dm', label: 'DMs', count: dmCount },
                { key: 'comment', label: 'Comments', count: commentCount },
                { key: 'review', label: 'Reviews', count: reviewCount },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTypeTab(tab.key)}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-semibold border-b-[2.5px] transition-colors',
                    activeTypeTab === tab.key
                      ? 'text-primary border-primary'
                      : 'text-muted-foreground border-transparent hover:text-foreground/70'
                  )}
                >
                  {tab.label}
                  <span className={cn(
                    'text-[11px] font-bold px-2 py-0.5 rounded-full',
                    activeTypeTab === tab.key
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Conversation list */}
            <div className="flex-1 min-h-0 relative">
              {isSearchMode ? (
                <SearchResults
                  results={searchResults}
                  isLoading={searchLoading}
                  query={ftsQuery}
                  onSelectConversation={handleSelectConversation}
                />
              ) : (
                <ConversationList
                  conversations={filteredConversations}
                  selectedId={selectedConversationId}
                  onSelect={handleSelectConversation}
                  isLoading={conversationsLoading}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                />
              )}

              <BulkActionBar
                selectedCount={selectedIds.size}
                onMarkRead={handleBulkMarkRead}
                onUpdateStatus={handleBulkUpdateStatus}
                onAssign={handleBulkAssign}
                onAddLabel={handleBulkAddLabel}
                onClear={() => setSelectedIds(new Set())}
                labels={labels}
              />
            </div>
          </div>

          {/* === THREAD PANEL (center) === */}
          <div className="bg-background rounded-xl border shadow-sm flex flex-col overflow-hidden min-h-0">
            {selectedConversation ? (
              <>
                <ConversationHeader
                  conversation={selectedConversation}
                  onStatusChange={handleStatusChange}
                  onAssign={handleAssign}
                  onAddLabel={handleAddLabel}
                  onRemoveLabel={handleRemoveLabel}
                  onSnooze={handleSnooze}
                  labels={labels}
                />

                <AISuggestionsPanel
                  conversation={selectedConversation}
                  onInsertReply={handleInsertReply}
                />

                <div className="flex-1 min-h-0">
                  <ConversationThread
                    messages={messages}
                    isLoading={messagesLoading}
                    onReplyToMessage={setReplyTo}
                    conversation={selectedConversation}
                  />
                </div>

                <div className="relative">
                  <CannedReplyPicker
                    open={showCannedPicker}
                    onClose={() => setShowCannedPicker(false)}
                    onSelect={(content) => {
                      setComposerContent(content);
                      setShowCannedPicker(false);
                    }}
                    cannedReplies={cannedReplies}
                    platform={selectedConversation.platform}
                    contactName={selectedConversation.contact?.display_name || undefined}
                  />
                  <MessageComposer
                    onSend={handleSend}
                    onAddNote={handleAddNote}
                    isSending={replyComment.isPending || replyDM.isPending || addNote.isPending}
                    conversationType={selectedConversation.type}
                    onSlashTrigger={() => setShowCannedPicker(true)}
                    replyTo={replyTo}
                    onCancelReply={() => setReplyTo(null)}
                    defaultContent={composerContent}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h2 className="text-lg font-medium text-muted-foreground mb-1">Select a conversation</h2>
                <p className="text-sm text-muted-foreground/60 max-w-sm">
                  Choose a conversation from the list to view messages and reply.
                </p>
              </div>
            )}
          </div>

          {/* === DRAWER PANEL (right, conditional) === */}
          {drawerOpen && selectedConversation && (
            <div className="bg-background rounded-xl border shadow-sm flex flex-col overflow-hidden min-h-0">
              <ContactDetailPanel
                conversation={selectedConversation}
                labels={labels}
                onAssign={handleAssign}
                onAddLabel={handleAddLabel}
                onRemoveLabel={handleRemoveLabel}
              />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

// ─── Filter Dropdown Button ───────────────────────────────────

function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value?: string;
  options: { value: string; label: string }[];
  onChange: (value: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap transition-colors',
          value
            ? 'border-primary bg-primary/5 text-primary'
            : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
        )}
      >
        {value ? options.find(o => o.value === value)?.label || label : label}
        <ChevronDown className="h-3 w-3 opacity-50" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 z-50 min-w-[140px] bg-popover border rounded-lg shadow-lg py-1">
            <button
              onClick={() => { onChange(undefined); setOpen(false); }}
              className={cn(
                'w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors',
                !value && 'font-semibold text-primary'
              )}
            >
              All {label.toLowerCase()}s
            </button>
            {options.map(opt => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={cn(
                  'w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors',
                  value === opt.value && 'font-semibold text-primary'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
