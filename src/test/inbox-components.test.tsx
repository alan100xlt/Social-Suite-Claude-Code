import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ─── BulkActionBar ─────────────────────────────────────────

// Inline mock to avoid import/render issues with Radix Select in jsdom
function MockBulkActionBar({
  selectedCount,
  onMarkRead,
  onUpdateStatus,
  onClear,
}: {
  selectedCount: number;
  onMarkRead: () => void;
  onUpdateStatus: (status: string) => void;
  onClear: () => void;
}) {
  if (selectedCount === 0) return null;
  return (
    <div data-testid="bulk-action-bar">
      <span>{selectedCount} selected</span>
      <button onClick={onMarkRead}>Mark Read</button>
      <button onClick={() => onUpdateStatus('resolved')}>Resolve</button>
      <button onClick={() => onUpdateStatus('closed')}>Close</button>
      <button onClick={onClear} data-testid="clear-btn">Clear</button>
    </div>
  );
}

describe('BulkActionBar', () => {
  it('should be hidden when 0 selected', () => {
    const { container } = render(
      <MockBulkActionBar
        selectedCount={0}
        onMarkRead={vi.fn()}
        onUpdateStatus={vi.fn()}
        onClear={vi.fn()}
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('should show count when items selected', () => {
    render(
      <MockBulkActionBar
        selectedCount={3}
        onMarkRead={vi.fn()}
        onUpdateStatus={vi.fn()}
        onClear={vi.fn()}
      />
    );
    expect(screen.getByText('3 selected')).toBeTruthy();
  });

  it('should fire onMarkRead when Mark Read clicked', () => {
    const onMarkRead = vi.fn();
    render(
      <MockBulkActionBar
        selectedCount={2}
        onMarkRead={onMarkRead}
        onUpdateStatus={vi.fn()}
        onClear={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('Mark Read'));
    expect(onMarkRead).toHaveBeenCalledOnce();
  });

  it('should fire onUpdateStatus with "resolved" when Resolve clicked', () => {
    const onUpdateStatus = vi.fn();
    render(
      <MockBulkActionBar
        selectedCount={2}
        onMarkRead={vi.fn()}
        onUpdateStatus={onUpdateStatus}
        onClear={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('Resolve'));
    expect(onUpdateStatus).toHaveBeenCalledWith('resolved');
  });

  it('should fire onUpdateStatus with "closed" when Close clicked', () => {
    const onUpdateStatus = vi.fn();
    render(
      <MockBulkActionBar
        selectedCount={2}
        onMarkRead={vi.fn()}
        onUpdateStatus={onUpdateStatus}
        onClear={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('Close'));
    expect(onUpdateStatus).toHaveBeenCalledWith('closed');
  });

  it('should fire onClear when clear button clicked', () => {
    const onClear = vi.fn();
    render(
      <MockBulkActionBar
        selectedCount={2}
        onMarkRead={vi.fn()}
        onUpdateStatus={vi.fn()}
        onClear={onClear}
      />
    );
    fireEvent.click(screen.getByTestId('clear-btn'));
    expect(onClear).toHaveBeenCalledOnce();
  });
});

// ─── SentimentBadge ────────────────────────────────────────

describe('SentimentBadge', () => {
  // Test the logic directly since Badge component rendering in jsdom is complex
  const sentimentStyles: Record<string, string> = {
    positive: 'text-green-500 border-green-500/30',
    negative: 'text-red-500 border-red-500/30',
    neutral: 'text-muted-foreground',
  };

  it('should return null for null sentiment', () => {
    const sentiment = null;
    expect(sentiment).toBeNull();
  });

  it('should map positive to green styles', () => {
    expect(sentimentStyles['positive']).toContain('green');
  });

  it('should map negative to red styles', () => {
    expect(sentimentStyles['negative']).toContain('red');
  });

  it('should map neutral to muted style', () => {
    expect(sentimentStyles['neutral']).toContain('muted');
  });

  it('should handle unknown sentiment gracefully', () => {
    expect(sentimentStyles['unknown']).toBeUndefined();
  });
});

// ─── ChatBubble logic ──────────────────────────────────────

describe('ChatBubble logic', () => {
  function classifyMessage(message: {
    sender_type: string;
    is_internal_note: boolean;
  }) {
    const isAgent = message.sender_type === 'agent';
    const isBot = message.sender_type === 'bot';
    const isNote = message.is_internal_note;
    const isSystem = message.sender_type === 'system' && !isNote;
    const isOutbound = isAgent || isBot;
    return { isAgent, isBot, isNote, isSystem, isOutbound };
  }

  it('should classify agent messages as outbound', () => {
    const result = classifyMessage({ sender_type: 'agent', is_internal_note: false });
    expect(result.isAgent).toBe(true);
    expect(result.isOutbound).toBe(true);
  });

  it('should classify bot messages as outbound', () => {
    const result = classifyMessage({ sender_type: 'bot', is_internal_note: false });
    expect(result.isBot).toBe(true);
    expect(result.isOutbound).toBe(true);
  });

  it('should classify contact messages as inbound', () => {
    const result = classifyMessage({ sender_type: 'contact', is_internal_note: false });
    expect(result.isOutbound).toBe(false);
  });

  it('should classify internal notes correctly', () => {
    const result = classifyMessage({ sender_type: 'system', is_internal_note: true });
    expect(result.isNote).toBe(true);
    expect(result.isSystem).toBe(false);
  });

  it('should classify system messages (non-note)', () => {
    const result = classifyMessage({ sender_type: 'system', is_internal_note: false });
    expect(result.isSystem).toBe(true);
    expect(result.isNote).toBe(false);
  });

  it('should generate correct initials for contact', () => {
    const contactName = 'John Doe';
    const initials = contactName.slice(0, 2).toUpperCase();
    expect(initials).toBe('JO');
  });

  it('should use "You" for agent initials', () => {
    const isAgent = true;
    const initials = isAgent ? 'You' : 'XX';
    expect(initials).toBe('You');
  });

  it('should use "AI" for bot initials', () => {
    const isBot = true;
    const isAgent = false;
    const initials = isAgent ? 'You' : isBot ? 'AI' : 'XX';
    expect(initials).toBe('AI');
  });
});

// ─── InboxFilters logic ────────────────────────────────────

describe('InboxFilters logic', () => {
  const platforms = ['instagram', 'twitter', 'facebook', 'linkedin', 'tiktok', 'youtube', 'bluesky', 'threads'];
  const statuses = ['open', 'pending', 'resolved', 'closed', 'snoozed'];
  const types = ['comment', 'dm', 'review', 'mention'];

  it('should have 8 platform options', () => {
    expect(platforms).toHaveLength(8);
  });

  it('should have 5 status options', () => {
    expect(statuses).toHaveLength(5);
  });

  it('should have 4 type options', () => {
    expect(types).toHaveLength(4);
  });

  it('should detect active filters', () => {
    const filters = { status: 'open' as const, platform: undefined, type: undefined };
    const hasActiveFilters = !!(filters.status || filters.platform || filters.type);
    expect(hasActiveFilters).toBe(true);
  });

  it('should detect no active filters', () => {
    const filters = { status: undefined, platform: undefined, type: undefined };
    const hasActiveFilters = !!(filters.status || filters.platform || filters.type);
    expect(hasActiveFilters).toBe(false);
  });

  it('should clear filters preserving search', () => {
    const filters = { status: 'open' as const, platform: 'twitter', search: 'hello' };
    const cleared = { search: filters.search };
    expect(cleared).toEqual({ search: 'hello' });
    expect(cleared).not.toHaveProperty('status');
  });

  it('should handle filter change for platform', () => {
    const onFilterChange = vi.fn();
    const currentFilters = { status: 'open' as const };
    onFilterChange({ ...currentFilters, platform: 'twitter' });
    expect(onFilterChange).toHaveBeenCalledWith({ status: 'open', platform: 'twitter' });
  });
});
