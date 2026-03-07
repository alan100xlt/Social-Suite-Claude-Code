import { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type ICellRendererParams,
} from 'ag-grid-community';
import { gridTheme, gridThemeDark } from '@/lib/ag-grid-theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import type { InboxConversation } from '@/lib/api/inbox';

ModuleRegistry.registerModules([AllCommunityModule]);

// Priority sort order: urgent first
const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

// Badge color mapping for priority
const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  normal: 'bg-blue-100 text-blue-700 border-blue-200',
  low: 'bg-gray-100 text-gray-600 border-gray-200',
};

// Badge color mapping for sentiment
const SENTIMENT_COLORS: Record<string, string> = {
  positive: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  neutral: 'bg-gray-100 text-gray-600 border-gray-200',
  negative: 'bg-red-100 text-red-700 border-red-200',
};

// Badge color mapping for platform
const PLATFORM_COLORS: Record<string, string> = {
  facebook: 'bg-blue-100 text-blue-700 border-blue-200',
  instagram: 'bg-pink-100 text-pink-700 border-pink-200',
  twitter: 'bg-sky-100 text-sky-700 border-sky-200',
  linkedin: 'bg-blue-100 text-blue-800 border-blue-300',
  tiktok: 'bg-gray-100 text-gray-700 border-gray-200',
  youtube: 'bg-red-100 text-red-700 border-red-200',
  bluesky: 'bg-sky-100 text-sky-600 border-sky-200',
  threads: 'bg-gray-100 text-gray-700 border-gray-200',
};

interface AssignmentQueueProps {
  conversations: InboxConversation[];
  currentUserId?: string;
  onSelectConversation: (id: string) => void;
  filter: 'mine' | 'unassigned' | 'all';
}

export function AssignmentQueue({
  conversations,
  currentUserId,
  onSelectConversation,
  filter,
}: AssignmentQueueProps) {
  const { themeVariant } = useTheme();
  const isDark = themeVariant === 'dark-pro' || themeVariant === 'aurora';
  const theme = isDark ? gridThemeDark : gridTheme;

  // Filter by assignment
  const filtered = useMemo(() => {
    let result = conversations;
    if (filter === 'mine' && currentUserId) {
      result = result.filter(c => c.assigned_to === currentUserId);
    } else if (filter === 'unassigned') {
      result = result.filter(c => !c.assigned_to);
    }
    // Sort: urgent first, then newest activity
    return [...result].sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 2;
      const pb = PRIORITY_ORDER[b.priority] ?? 2;
      if (pa !== pb) return pa - pb;
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
    });
  }, [conversations, filter, currentUserId]);

  const columnDefs = useMemo<ColDef<InboxConversation>[]>(() => [
    {
      headerName: 'Subject',
      field: 'subject',
      flex: 2,
      minWidth: 200,
      valueGetter: (params) => {
        const c = params.data;
        return c?.subject || c?.last_message_preview || 'No subject';
      },
      cellStyle: { fontWeight: 500 },
    },
    {
      headerName: 'Platform',
      field: 'platform',
      width: 120,
      cellRenderer: (params: ICellRendererParams<InboxConversation>) => {
        const platform = params.value as string;
        if (!platform) return null;
        const colorClass = PLATFORM_COLORS[platform] || 'bg-gray-100 text-gray-700 border-gray-200';
        return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass}">${platform}</span>`;
      },
    },
    {
      headerName: 'Priority',
      field: 'priority',
      width: 110,
      cellRenderer: (params: ICellRendererParams<InboxConversation>) => {
        const priority = params.value as string;
        if (!priority) return null;
        const colorClass = PRIORITY_COLORS[priority] || 'bg-gray-100 text-gray-600 border-gray-200';
        return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass}">${priority}</span>`;
      },
    },
    {
      headerName: 'Status',
      field: 'status',
      width: 100,
      cellRenderer: (params: ICellRendererParams<InboxConversation>) => {
        const status = params.value as string;
        if (!status) return null;
        return `<span class="text-xs font-medium capitalize">${status}</span>`;
      },
    },
    {
      headerName: 'Sentiment',
      field: 'sentiment',
      width: 110,
      cellRenderer: (params: ICellRendererParams<InboxConversation>) => {
        const sentiment = params.value as string | null;
        if (!sentiment) return '<span class="text-xs text-muted-foreground">--</span>';
        const colorClass = SENTIMENT_COLORS[sentiment] || 'bg-gray-100 text-gray-600 border-gray-200';
        return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass}">${sentiment}</span>`;
      },
    },
    {
      headerName: 'Last Activity',
      field: 'last_message_at',
      width: 150,
      valueFormatter: (params) => {
        if (!params.value) return '';
        const date = new Date(params.value as string);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        // If within last 24h, show relative time; otherwise show date
        if (diffMs < 86400000) {
          return formatDistanceToNow(date, { addSuffix: true });
        }
        return format(date, 'MMM d, h:mm a');
      },
      sort: 'desc',
    },
  ], []);

  return (
    <div style={{ width: '100%' }}>
      <AgGridReact<InboxConversation>
        theme={theme}
        rowData={filtered}
        columnDefs={columnDefs}
        domLayout="autoHeight"
        suppressCellFocus
        rowSelection="single"
        onRowClicked={(event) => {
          if (event.data) {
            onSelectConversation(event.data.id);
          }
        }}
        getRowId={(params) => params.data.id}
        overlayNoRowsTemplate={
          filter === 'mine'
            ? '<span class="text-sm text-muted-foreground">No conversations assigned to you</span>'
            : filter === 'unassigned'
              ? '<span class="text-sm text-muted-foreground">No unassigned conversations</span>'
              : '<span class="text-sm text-muted-foreground">No conversations found</span>'
        }
      />
    </div>
  );
}
