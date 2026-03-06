import { useState, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, type ColDef } from 'ag-grid-community';
import { gridTheme, gridThemeDark } from '@/lib/ag-grid-theme';
import { useTheme } from '@/contexts/ThemeContext';
import { DataGridToolbar } from '@/components/ui/data-grid-toolbar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAdminInboxData, useAdminCompanies, type InboxTableName } from '@/hooks/useAdminInboxData';
import { format } from 'date-fns';

const TABLE_OPTIONS: { value: InboxTableName; label: string }[] = [
  { value: 'conversations', label: 'Conversations' },
  { value: 'messages', label: 'Messages' },
  { value: 'contacts', label: 'Contacts' },
  { value: 'sync_state', label: 'Sync State' },
];

const COLUMN_DEFS: Record<InboxTableName, ColDef[]> = {
  conversations: [
    { headerName: 'ID', field: 'id', width: 100, cellRenderer: (p: any) => p.value?.slice(0, 8) + '...' },
    { headerName: 'Platform', field: 'platform', width: 100, cellRenderer: (p: any) => <Badge variant="outline">{p.value}</Badge> },
    { headerName: 'Type', field: 'type', width: 90 },
    { headerName: 'Status', field: 'status', width: 90, cellRenderer: (p: any) => {
      const colors: Record<string, string> = { open: 'text-green-500', pending: 'text-yellow-500', resolved: 'text-blue-500', closed: 'text-muted-foreground' };
      return <span className={colors[p.value] || ''}>{p.value}</span>;
    }},
    { headerName: 'Subject', field: 'subject', flex: 1, minWidth: 180 },
    { headerName: 'Last Message', field: 'last_message_preview', flex: 1, minWidth: 150 },
    { headerName: 'Sentiment', field: 'sentiment', width: 90 },
    { headerName: 'Unread', field: 'unread_count', width: 70 },
    { headerName: 'Last Activity', field: 'last_message_at', width: 140, cellRenderer: (p: any) => p.value ? format(new Date(p.value), 'MMM d, HH:mm') : '' },
  ],
  messages: [
    { headerName: 'ID', field: 'id', width: 100, cellRenderer: (p: any) => p.value?.slice(0, 8) + '...' },
    { headerName: 'Conversation', field: 'conversation_id', width: 110, cellRenderer: (p: any) => p.value?.slice(0, 8) + '...' },
    { headerName: 'Sender', field: 'sender_type', width: 80 },
    { headerName: 'Content', field: 'content', flex: 1, minWidth: 200 },
    { headerName: 'Type', field: 'content_type', width: 80 },
    { headerName: 'Note', field: 'is_internal_note', width: 60, cellRenderer: (p: any) => p.value ? 'Yes' : '' },
    { headerName: 'Created', field: 'created_at', width: 140, cellRenderer: (p: any) => p.value ? format(new Date(p.value), 'MMM d, HH:mm') : '' },
  ],
  contacts: [
    { headerName: 'ID', field: 'id', width: 100, cellRenderer: (p: any) => p.value?.slice(0, 8) + '...' },
    { headerName: 'Platform', field: 'platform', width: 100 },
    { headerName: 'Username', field: 'username', flex: 1, minWidth: 140 },
    { headerName: 'Display Name', field: 'display_name', flex: 1, minWidth: 140 },
    { headerName: 'Platform User ID', field: 'platform_user_id', width: 140 },
    { headerName: 'Created', field: 'created_at', width: 140, cellRenderer: (p: any) => p.value ? format(new Date(p.value), 'MMM d, HH:mm') : '' },
  ],
  sync_state: [
    { headerName: 'Company', field: 'company_id', width: 120, cellRenderer: (p: any) => p.value?.slice(0, 8) + '...' },
    { headerName: 'Platform', field: 'platform', width: 100 },
    { headerName: 'Sync Type', field: 'sync_type', width: 100 },
    { headerName: 'Last Synced', field: 'last_synced_at', flex: 1, cellRenderer: (p: any) => p.value ? format(new Date(p.value), 'MMM d, HH:mm:ss') : 'Never' },
    { headerName: 'Cursor', field: 'cursor', flex: 1 },
  ],
};

export function InboxDataTab() {
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark-pro' || currentTheme === 'aurora';
  const gridRef = useRef<AgGridReact>(null);

  const [table, setTable] = useState<InboxTableName>('conversations');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [quickFilter, setQuickFilter] = useState('');
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null);

  const { data: companies } = useAdminCompanies();
  const { data, isLoading } = useAdminInboxData(table, companyId, page);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
    cellStyle: { display: 'flex', alignItems: 'center', overflow: 'hidden' },
  }), []);

  const onExportCsv = () => {
    gridRef.current?.api?.exportDataAsCsv({ fileName: `inbox-${table}-export.csv` });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={table} onValueChange={(v) => { setTable(v as InboxTableName); setPage(0); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TABLE_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={companyId || 'all'} onValueChange={(v) => { setCompanyId(v === 'all' ? null : v); setPage(0); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All companies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All companies</SelectItem>
            {companies?.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataGridToolbar
        quickFilter={quickFilter}
        onQuickFilterChange={setQuickFilter}
        onExport={onExportCsv}
        quickFilterPlaceholder={`Search ${table}...`}
      />

      <div className="border rounded-lg">
        <style>{`.ag-cell-wrapper { width: 100%; } .ag-cell-value { width: 100%; }`}</style>
        <AgGridReact
          ref={gridRef}
          theme={isDark ? gridThemeDark : gridTheme}
          modules={[AllCommunityModule]}
          rowData={data || []}
          columnDefs={COLUMN_DEFS[table]}
          defaultColDef={defaultColDef}
          quickFilterText={quickFilter}
          domLayout="autoHeight"
          suppressCellFocus
          animateRows
          loading={isLoading}
          onRowClicked={(e) => setSelectedRow(e.data)}
          getRowId={(params) => params.data.id || JSON.stringify(params.data)}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{data?.length || 0} rows loaded</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <span className="text-sm py-1 px-2">Page {page + 1}</span>
          <Button variant="outline" size="sm" disabled={(data?.length || 0) < 50} onClick={() => setPage(p => p + 1)}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={!!selectedRow} onOpenChange={() => setSelectedRow(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Row Detail</DialogTitle>
          </DialogHeader>
          <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-[60vh]">
            {JSON.stringify(selectedRow, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
