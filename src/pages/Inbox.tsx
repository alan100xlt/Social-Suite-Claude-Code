import { useState, useMemo, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { InboxLayout } from '@/components/inbox/InboxLayout';
import { ConversationList } from '@/components/inbox/ConversationList';
import { ConversationThread } from '@/components/inbox/ConversationThread';
import { ConversationHeader } from '@/components/inbox/ConversationHeader';
import { MessageComposer } from '@/components/inbox/MessageComposer';
import { InboxFilters } from '@/components/inbox/InboxFilters';
import { ContactDetailPanel } from '@/components/inbox/ContactDetailPanel';
import { BulkActionBar } from '@/components/inbox/BulkActionBar';
import { SearchResults } from '@/components/inbox/SearchResults';
import { CannedReplyPicker } from '@/components/inbox/CannedReplyPicker';
import { AISuggestionsPanel } from '@/components/inbox/AISuggestionsPanel';
import { Inbox as InboxIcon, MessageSquare } from 'lucide-react';
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

export default function InboxPage() {
  const { isDemo } = useDemo();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDetail, setShowDetail] = useState(false);
  const [showCannedPicker, setShowCannedPicker] = useState(false);
  const [replyTo, setReplyTo] = useState<InboxMessage | null>(null);
  const [filters, setFilters] = useState<{
    status?: ConversationStatus;
    platform?: string;
    type?: ConversationType;
    search?: string;
  }>({});

  // FTS search mode
  const [ftsQuery, setFtsQuery] = useState('');
  const isSearchMode = ftsQuery.length >= 2;

  // Data hooks
  const { data: conversations = [], isLoading: conversationsLoading } = useInboxConversations({
    status: filters.status,
    platform: filters.platform,
    type: filters.type,
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
    if (!filters.search) return conversations;
    const q = filters.search.toLowerCase();
    return conversations.filter((c: InboxConversation) =>
      c.contact?.display_name?.toLowerCase().includes(q) ||
      c.contact?.username?.toLowerCase().includes(q) ||
      c.last_message_preview?.toLowerCase().includes(q) ||
      c.subject?.toLowerCase().includes(q)
    );
  }, [conversations, filters.search]);

  const selectedConversation = filteredConversations.find((c: InboxConversation) => c.id === selectedConversationId) || null;

  const handleSelectConversation = useCallback((id: string) => {
    setSelectedConversationId(id);
    setFtsQuery('');
    setReplyTo(null);
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

  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
    if (!newFilters.search) setFtsQuery('');
  }, []);

  // Stats
  const openCount = conversations.filter((c: InboxConversation) => c.status === 'open').length;
  const unreadCount = conversations.reduce((sum: number, c: InboxConversation) => sum + (c.unread_count || 0), 0);

  const sidebarContent = (
    <div className="flex flex-col h-full relative">
      <InboxFilters
        filters={filters}
        onFilterChange={handleFilterChange}
      />
      <div className="flex-1 min-h-0">
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
      </div>

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
  );

  const mainContent = selectedConversation ? (
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
        onInsertReply={handleSend}
      />

      <div className="flex-1 min-h-0">
        <ConversationThread
          messages={messages}
          isLoading={messagesLoading}
          onReplyToMessage={setReplyTo}
        />
      </div>
      <div className="relative">
        <CannedReplyPicker
          open={showCannedPicker}
          onClose={() => setShowCannedPicker(false)}
          onSelect={(content) => {
            handleSend(content);
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
        Choose a conversation from the list to view messages and reply. Comments, DMs, and reviews from all your connected platforms appear here.
      </p>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b">
          <InboxIcon className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-lg font-semibold">Inbox</h1>
            <p className="text-xs text-muted-foreground">
              {openCount} open{unreadCount > 0 ? ` \u00B7 ${unreadCount} unread` : ''}
              {selectedIds.size > 0 ? ` \u00B7 ${selectedIds.size} selected` : ''}
            </p>
          </div>
        </div>

        {/* Resizable layout */}
        <InboxLayout
          sidebar={sidebarContent}
          main={mainContent}
          detail={
            selectedConversation ? (
              <ContactDetailPanel
                conversation={selectedConversation}
                labels={labels}
                onAssign={handleAssign}
                onAddLabel={handleAddLabel}
                onRemoveLabel={handleRemoveLabel}
              />
            ) : undefined
          }
          showDetail={showDetail && !!selectedConversation}
          onToggleDetail={() => setShowDetail(prev => !prev)}
        />
      </div>
    </DashboardLayout>
  );
}
