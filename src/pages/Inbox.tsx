import { useState, useMemo, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
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
import { SocialPostTab } from '@/components/inbox/SocialPostTab';
import { CrisisAlertBanner } from '@/components/inbox/CrisisAlertBanner';
import { AssignmentQueue } from '@/components/inbox/AssignmentQueue';
import { Button } from '@/components/ui/button';
import {
  Search,
  PanelRight,
  MessageSquare,
  ListTodo,
  Mail,
  Star,
  ChevronDown,
  Loader2,
  UserPlus,
} from 'lucide-react';
import { FaFacebook, FaInstagram, FaTwitter, FaLinkedin, FaTiktok, FaYoutube } from 'react-icons/fa';
import { SiBluesky, SiThreads } from 'react-icons/si';
import { cn } from '@/lib/utils';
import { Tip } from '@/components/ui/tooltip';
import { GlossaryProvider, useGlossary } from '@/components/inbox/GlossaryDialog';
import {
  useInboxConversations,
  useUpdateConversationStatus,
  useAssignConversation,
  useMarkConversationRead,
  useBulkUpdateStatus,
} from '@/hooks/useInboxConversations';
import { useInboxMessages, useReplyToComment, useReplyToDM, useAddInternalNote } from '@/hooks/useInboxMessages';
import { useCompanyMembers } from '@/hooks/useCompany';
import { useAuth } from '@/contexts/AuthContext';
import { useInboxLabels, useInboxCannedReplies, useAddConversationLabel, useRemoveConversationLabel } from '@/hooks/useInboxLabels';
import { useInboxSearch } from '@/hooks/useInboxSearch';
import { useInboxRealtime } from '@/hooks/useInboxRealtime';
import { useDemo } from '@/lib/demo/DemoDataProvider';
import { useTranslateMessage } from '@/hooks/useInboxAI';
import { useMessageReactions, useToggleReaction } from '@/hooks/useMessageReactions';
import { useReadReceipts } from '@/hooks/useReadReceipts';
import { useConversationPresence } from '@/hooks/useConversationPresence';
import { PresenceBanner } from '@/components/inbox/PresenceBanner';
import type { ConversationStatus, ConversationType, ConversationPriority, Sentiment, MessageCategory, InboxConversation, InboxMessage } from '@/lib/api/inbox';

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
  const { user } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [drawerTab, setDrawerTab] = useState<'contact' | 'post'>('contact');
  const [showCannedPicker, setShowCannedPicker] = useState(false);
  const [replyTo, setReplyTo] = useState<InboxMessage | null>(null);
  const [composerContent, setComposerContent] = useState('');
  const [activeTypeTab, setActiveTypeTab] = useState<TypeTab>('all');
  const [activePlatform, setActivePlatform] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'conversations' | 'queue'>('conversations');
  const [queueFilter, setQueueFilter] = useState<'mine' | 'unassigned' | 'all'>('mine');
  const [filters, setFilters] = useState<{
    status?: ConversationStatus;
    platform?: string;
    type?: ConversationType;
    sentiment?: Sentiment;
    priority?: ConversationPriority;
    category?: MessageCategory;
    dateRange?: 'today' | '7d' | '30d' | '90d';
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

  // Presence (collision detection)
  const { others: presenceOthers, broadcastTyping } = useConversationPresence(selectedConversationId);

  // Mutations
  const updateStatus = useUpdateConversationStatus();
  const assignConversation = useAssignConversation();
  const markRead = useMarkConversationRead();
  const bulkUpdate = useBulkUpdateStatus();
  const replyComment = useReplyToComment();
  const replyDM = useReplyToDM();
  const { data: companyMembers } = useCompanyMembers();
  const addNote = useAddInternalNote(companyMembers);
  const addLabel = useAddConversationLabel();
  const removeLabel = useRemoveConversationLabel();
  const translateMessage = useTranslateMessage();

  // Reactions + read receipts
  const { data: reactions = {} } = useMessageReactions(selectedConversationId);
  const toggleReaction = useToggleReaction();
  const conversationIds = useMemo(() => conversations.map((c: InboxConversation) => c.id), [conversations]);
  const { data: readReceipts = {} } = useReadReceipts(conversationIds);

  // Surface reply errors to the user
  useEffect(() => {
    if (replyDM.error) toast.error(`Failed to send DM: ${replyDM.error.message}`);
  }, [replyDM.error]);
  useEffect(() => {
    if (replyComment.error) toast.error(`Failed to send reply: ${replyComment.error.message}`);
  }, [replyComment.error]);

  // Filter by search + client-side filters
  const filteredConversations = useMemo(() => {
    let result = conversations;
    if (assignedToMe && user?.id) {
      result = result.filter((c: InboxConversation) => c.assigned_to === user.id);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c: InboxConversation) =>
        c.contact?.display_name?.toLowerCase().includes(q) ||
        c.contact?.username?.toLowerCase().includes(q) ||
        c.last_message_preview?.toLowerCase().includes(q) ||
        c.subject?.toLowerCase().includes(q)
      );
    }
    if (filters.sentiment) {
      result = result.filter((c: InboxConversation) => c.sentiment === filters.sentiment);
    }
    if (filters.priority) {
      result = result.filter((c: InboxConversation) => c.priority === filters.priority);
    }
    if (filters.category) {
      result = result.filter((c: InboxConversation) => c.message_type === filters.category);
    }
    if (filters.dateRange) {
      const now = Date.now();
      const msMap = { today: 86400000, '7d': 604800000, '30d': 2592000000, '90d': 7776000000 };
      const cutoff = now - msMap[filters.dateRange];
      result = result.filter((c: InboxConversation) => new Date(c.last_message_at).getTime() >= cutoff);
    }
    return result;
  }, [conversations, searchQuery, filters.sentiment, filters.priority, filters.category, filters.dateRange, assignedToMe, user?.id]);

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

  const handleToggleFlag = useCallback((id: string) => {
    setFlaggedIds(prev => {
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

  const handleToggleReaction = useCallback((messageId: string, emoji: string, hasReacted: boolean) => {
    toggleReaction.mutate({ messageId, emoji, hasReacted });
  }, [toggleReaction]);

  const handleInsertReply = useCallback((content: string) => {
    setComposerContent(content);
  }, []);

  const handleTranslateComposer = useCallback(async (content: string) => {
    if (!selectedConversation) return;
    const targetLang = selectedConversation.detected_language || 'es';
    try {
      const result = await translateMessage.mutateAsync({
        conversationId: selectedConversation.id,
        content,
        targetLanguage: targetLang,
      });
      if (result.translated) {
        setComposerContent(result.translated);
      }
    } catch (err) {
      console.error('Translation failed:', err);
    }
  }, [selectedConversation, translateMessage]);

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
    <GlossaryProvider>
    <DashboardLayout noPadding>
      <div className="flex flex-col flex-1 min-h-0">
        {/* === TOPBAR === */}
        <div className="bg-card border-b border-border-light flex-shrink-0 px-6">
          {/* Row 1: Title + count + sync indicator */}
          <div className="flex items-center gap-4 h-[54px]">
            <h1 className="text-lg font-extrabold tracking-[-0.03em]">Inbox</h1>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary">
              {totalCount} conversations
            </span>

            {/* View mode toggle */}
            <div className="flex items-center gap-1 border rounded-md p-0.5">
              <Button variant={viewMode === 'conversations' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('conversations')}>
                <MessageSquare className="h-4 w-4 mr-1" />Conversations
              </Button>
              <Button variant={viewMode === 'queue' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('queue')}>
                <ListTodo className="h-4 w-4 mr-1" />My Queue
              </Button>
            </div>

            <SyncingIndicator />
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

            <FilterDropdown
              label="Sentiment"
              value={filters.sentiment}
              options={[
                { value: 'positive', label: 'Positive' },
                { value: 'neutral', label: 'Neutral' },
                { value: 'negative', label: 'Negative' },
              ]}
              onChange={(v) => setFilters(f => ({ ...f, sentiment: v as Sentiment | undefined }))}
            />

            <FilterDropdown
              label="Priority"
              value={filters.priority}
              options={[
                { value: 'urgent', label: 'Urgent' },
                { value: 'high', label: 'High' },
                { value: 'normal', label: 'Normal' },
                { value: 'low', label: 'Low' },
              ]}
              onChange={(v) => setFilters(f => ({ ...f, priority: v as ConversationPriority | undefined }))}
            />

            <FilterDropdown
              label="Category"
              value={filters.category}
              options={[
                { value: 'editorial', label: 'Editorial' },
                { value: 'business', label: 'Business' },
                { value: 'support', label: 'Support' },
                { value: 'community', label: 'Community' },
                { value: 'noise', label: 'Noise' },
              ]}
              onChange={(v) => setFilters(f => ({ ...f, category: v as MessageCategory | undefined }))}
            />

            <FilterDropdown
              label="Date"
              value={filters.dateRange}
              options={[
                { value: 'today', label: 'Today' },
                { value: '7d', label: 'Last 7 days' },
                { value: '30d', label: 'Last 30 days' },
                { value: '90d', label: 'Last 90 days' },
              ]}
              onChange={(v) => setFilters(f => ({ ...f, dateRange: v as 'today' | '7d' | '30d' | '90d' | undefined }))}
            />

            {/* Assigned to me toggle */}
            <button
              onClick={() => setAssignedToMe(!assignedToMe)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-[7px] rounded-[10px] border-[1.5px] text-[12.5px] font-semibold whitespace-nowrap transition-all',
                assignedToMe
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
              )}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Mine
              {(() => {
                const myCount = conversations.filter((c: InboxConversation) => c.assigned_to === user?.id).length;
                return myCount > 0 ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    {myCount}
                  </span>
                ) : null;
              })()}
            </button>

            <button
              onClick={() => setDrawerOpen(!drawerOpen)}
              className={cn(
                'ml-auto flex items-center gap-1.5 px-3.5 py-[7px] rounded-[10px] border-[1.5px] text-xs font-semibold transition-all',
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

        {/* Crisis alert banner */}
        <CrisisAlertBanner />

        {/* === MAIN GRID === */}
        {viewMode === 'queue' ? (
          <div className="flex-1 p-4 overflow-auto">
            <div className="flex items-center gap-2 mb-3">
              {(['mine', 'unassigned', 'all'] as const).map(f => (
                <Button key={f} variant={queueFilter === f ? 'default' : 'outline'} size="sm" onClick={() => setQueueFilter(f)} className="capitalize">
                  {f === 'mine' ? 'Assigned to Me' : f === 'unassigned' ? 'Unassigned' : 'All Team'}
                </Button>
              ))}
            </div>
            <AssignmentQueue
              conversations={conversations}
              currentUserId={user?.id}
              onSelectConversation={(id) => {
                setSelectedConversationId(id);
                setViewMode('conversations');
                markRead.mutate(id);
              }}
              filter={queueFilter}
            />
          </div>
        ) : (
        <div
          className={cn(
            'flex-1 grid gap-3.5 p-3.5 min-h-0 overflow-hidden transition-all',
            drawerOpen
              ? 'grid-cols-[480px_1fr_340px]'
              : 'grid-cols-[480px_1fr]'
          )}
        >
          {/* === CONVERSATION PANEL (left) === */}
          <div className="bg-card rounded-[14px] border border-border-light shadow-[0_1px_4px_rgba(0,0,0,.07)] flex flex-col overflow-hidden min-h-0">
            {/* Platform icon bar */}
            <div className="flex items-center gap-1.5 px-[18px] py-3.5 border-b border-border-light">
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
                  <Tip key={p.key} label={`${p.key.charAt(0).toUpperCase() + p.key.slice(1)} (${platformCounts[p.key]})`}>
                    <button
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
                  </Tip>
                ))
              }
              <span className="ml-auto text-xs font-semibold text-muted-foreground">
                {filteredConversations.length} total
              </span>
            </div>

            {/* Search */}
            <div className="px-[18px] py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-[38px] pr-3.5 py-2.5 rounded-[10px] border-[1.5px] bg-muted/50 text-[13px] outline-none focus:border-primary focus:bg-background transition-all"
                />
              </div>
            </div>

            {/* Type tabs: All / DMs / Comments / Reviews */}
            <div className="flex border-b border-border-light px-[18px]">
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
                  conversations={filteredConversations.map(c => ({ ...c, flagged: flaggedIds.has(c.id) }))}
                  selectedId={selectedConversationId}
                  onSelect={handleSelectConversation}
                  isLoading={conversationsLoading}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onToggleFlag={handleToggleFlag}
                  readReceipts={readReceipts}
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
          <div className="bg-card rounded-[14px] border border-border-light shadow-[0_1px_4px_rgba(0,0,0,.07)] flex flex-col overflow-hidden min-h-0 max-h-full">
            {selectedConversation ? (
              <>
                <div className="flex-shrink-0">
                  <ConversationHeader
                    conversation={selectedConversation}
                    onStatusChange={handleStatusChange}
                    onAssign={handleAssign}
                    onAddLabel={handleAddLabel}
                    onRemoveLabel={handleRemoveLabel}
                    onSnooze={handleSnooze}
                    labels={labels}
                    companyMembers={companyMembers}
                    currentUserId={user?.id}
                    readReceipts={readReceipts[selectedConversation.id] || []}
                  />
                </div>

                <PresenceBanner others={presenceOthers} />

                <div className="flex-1 min-h-0 overflow-hidden">
                  <ConversationThread
                    messages={messages}
                    isLoading={messagesLoading}
                    onReplyToMessage={setReplyTo}
                    conversation={selectedConversation}
                    reactions={reactions}
                    onToggleReaction={handleToggleReaction}
                  />
                </div>

                <div className="flex-shrink-0">
                  <AISuggestionsPanel
                    conversation={selectedConversation}
                    onInsertReply={handleInsertReply}
                  />
                </div>

                <div className="relative flex-shrink-0">
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
                    onTranslate={handleTranslateComposer}
                    detectedLanguage={selectedConversation.detected_language || undefined}
                    companyMembers={companyMembers}
                    onTypingChange={broadcastTyping}
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
          {drawerOpen && (
            <div className="bg-card rounded-[14px] border border-border-light shadow-[0_1px_4px_rgba(0,0,0,.07)] flex flex-col overflow-hidden min-h-0">
              {selectedConversation ? (
                <>
                  {/* Drawer tabs */}
                  <div className="flex border-b border-border-light">
                    <button
                      onClick={() => setDrawerTab('contact')}
                      className={cn(
                        'flex-1 py-3 text-center text-[12.5px] font-semibold border-b-[2.5px] transition-colors',
                        drawerTab === 'contact'
                          ? 'text-primary border-primary'
                          : 'text-muted-foreground border-transparent hover:text-foreground/70'
                      )}
                    >
                      Contact
                    </button>
                    <button
                      onClick={() => setDrawerTab('post')}
                      className={cn(
                        'flex-1 py-3 text-center text-[12.5px] font-semibold border-b-[2.5px] transition-colors',
                        drawerTab === 'post'
                          ? 'text-primary border-primary'
                          : 'text-muted-foreground border-transparent hover:text-foreground/70'
                      )}
                    >
                      Social Post
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {drawerTab === 'contact' ? (
                      <ContactDetailPanel
                        conversation={selectedConversation}
                        labels={labels}
                        onAssign={handleAssign}
                        onAddLabel={handleAddLabel}
                        onRemoveLabel={handleRemoveLabel}
                        companyMembers={companyMembers}
                        currentUserId={user?.id}
                      />
                    ) : (
                      <SocialPostTab conversation={selectedConversation} />
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mb-3">
                    <PanelRight className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No conversation selected</p>
                  <p className="text-xs text-muted-foreground/60 mt-1 max-w-[200px]">
                    Select a conversation to view contact details and post info
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        )}
      </div>
    </DashboardLayout>
    </GlossaryProvider>
  );
}

// ─── Syncing Indicator (needs GlossaryProvider context) ───────

function SyncingIndicator() {
  const glossary = useGlossary();
  return (
    <Tip label="Real-time sync with connected platforms" onLabelClick={() => glossary.open('Syncing')}>
      <div className="flex items-center gap-1.5 ml-auto text-xs font-semibold text-emerald-600 cursor-help">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        Syncing
      </div>
    </Tip>
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
          'flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] border-[1.5px] text-[12.5px] font-semibold whitespace-nowrap transition-all',
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
