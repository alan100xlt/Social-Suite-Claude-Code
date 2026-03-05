import { useState, useMemo, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  type ColDef,
  type ICellRendererParams,
  type GridReadyEvent,
  type SelectionChangedEvent,
} from 'ag-grid-community';
import { gridTheme, gridThemeDark } from '@/lib/ag-grid-theme';
import { useTheme } from '@/contexts/ThemeContext';
import { DataGridToolbar } from '@/components/ui/data-grid-toolbar';
import { Building2, Trash2, AlertTriangle, Plus, Loader2 } from 'lucide-react';
import { formatDistanceToNow, differenceInDays, parseISO } from 'date-fns';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import { CreateMediaCompanyDialog } from '@/components/admin/CreateMediaCompanyDialog';
import { CreateCompanyDialog } from '@/components/admin/CreateCompanyDialog';
import { MediaCompanyCombobox } from '@/components/admin/MediaCompanyCombobox';
import { useCompanyMediaCompanyMap } from '@/hooks/useMediaCompanyManagement';

interface CompanyRow {
  id: string;
  name: string;
  slug: string;
  website_url: string | null;
  onboarding_status: string;
  onboarding_step: number;
  created_at: string;
  has_getlate: boolean;
  last_login: string | null;
  verified_users: number;
  pending_invitations: number;
  connections_active: number;
  connections_total: number;
  connections_found: number;
  posts_last_7_days: number;
  posts_total: number;
}

function useAdminCompanies() {
  return useQuery({
    queryKey: ['admin-companies'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-companies');
      if (error) {
        const detail = (data as any)?.error ?? error.message;
        throw new Error(detail);
      }
      return data.companies as CompanyRow[];
    },
  });
}

export function CompaniesTab() {
  const { isSuperAdmin } = useAuth();
  const { data: companies, isLoading, error } = useAdminCompanies();
  const [selected, setSelected] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCreateMC, setShowCreateMC] = useState(false);
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [quickFilter, setQuickFilter] = useState('');
  const queryClient = useQueryClient();
  const { data: mediaCompanyMap } = useCompanyMediaCompanyMap();
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark-pro' || currentTheme === 'aurora';
  const gridRef = useRef<AgGridReact<CompanyRow>>(null);

  const deleteMutation = useMutation({
    mutationFn: async (companyIds: string[]) => {
      const { data, error } = await supabase.functions.invoke('admin-delete-companies', {
        body: { companyIds },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, companyIds) => {
      toast({ title: 'Deleted', description: `${companyIds.length} company(ies) deleted.` });
      setSelected([]);
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.sizeColumnsToFit();
  }, []);

  const onExportCsv = useCallback(() => {
    gridRef.current?.api?.exportDataAsCsv({ fileName: 'companies-export.csv' });
  }, []);

  const onSelectionChanged = useCallback((event: SelectionChangedEvent<CompanyRow>) => {
    setSelected(event.api.getSelectedRows().map((r) => r.id));
  }, []);

  const selectedNames = useMemo(
    () => companies?.filter((c) => selected.includes(c.id)).map((c) => c.name) ?? [],
    [companies, selected]
  );

  const colDefs = useMemo<ColDef<CompanyRow>[]>(
    () => [
      {
        headerCheckboxSelection: true,
        checkboxSelection: true,
        width: 50,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        resizable: false,
      },
      {
        headerName: 'Company',
        field: 'name',
        flex: 1,
        minWidth: 180,
        cellRenderer: (params: ICellRendererParams<CompanyRow>) => {
          const c = params.data;
          if (!c) return null;
          return (
            <div className="min-w-0 py-1">
              <p className="font-medium text-sm truncate">{c.name}</p>
              {c.website_url && (
                <a
                  href={c.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary truncate block max-w-[200px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {c.website_url.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          );
        },
        filter: 'agTextColumnFilter',
      },
      {
        headerName: 'Media Company',
        width: 180,
        cellRenderer: (params: ICellRendererParams<CompanyRow>) => {
          const c = params.data;
          if (!c) return null;
          const mapping = mediaCompanyMap?.get(c.id);
          return (
            <MediaCompanyCombobox
              companyId={c.id}
              currentMediaCompanyId={mapping?.mediaCompanyId}
              currentMediaCompanyName={mapping?.mediaCompanyName}
            />
          );
        },
        sortable: false,
        filter: false,
      },
      {
        headerName: 'Onboarding',
        field: 'onboarding_status',
        width: 130,
        cellRenderer: (params: ICellRendererParams<CompanyRow>) => {
          const c = params.data;
          if (!c) return null;
          const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
            complete: { label: 'Complete', variant: 'default' },
            wizard_complete: { label: `Wizard Done (${c.onboarding_step}/6)`, variant: 'secondary' },
            in_progress: { label: `Step ${c.onboarding_step}/6`, variant: 'outline' },
          };
          const info = map[c.onboarding_status] || { label: c.onboarding_status, variant: 'outline' as const };
          return <Badge variant={info.variant} className="text-xs whitespace-nowrap">{info.label}</Badge>;
        },
        filter: 'agTextColumnFilter',
      },
      {
        headerName: 'Signed Up',
        field: 'created_at',
        width: 120,
        cellRenderer: (params: ICellRendererParams<CompanyRow>) => {
          const c = params.data;
          if (!c) return null;
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs whitespace-nowrap">
                  {formatDistanceToNow(parseISO(c.created_at), { addSuffix: true })}
                </span>
              </TooltipTrigger>
              <TooltipContent>{new Date(c.created_at).toLocaleDateString()}</TooltipContent>
            </Tooltip>
          );
        },
        comparator: (a: string, b: string) => new Date(a).getTime() - new Date(b).getTime(),
        filter: 'agDateColumnFilter',
      },
      {
        headerName: 'Last Login',
        field: 'last_login',
        width: 110,
        cellRenderer: (params: ICellRendererParams<CompanyRow>) => {
          const lastLogin = params.data?.last_login;
          if (!lastLogin) return <span className="text-muted-foreground text-xs">Never</span>;
          const days = differenceInDays(new Date(), parseISO(lastLogin));
          const isStale = days > 14;
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={`text-xs ${isStale ? 'text-destructive font-medium' : ''}`}>
                  {days === 0 ? 'Today' : `${days}d ago`}
                  {isStale && <AlertTriangle className="inline w-3 h-3 ml-1" />}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Last login: {formatDistanceToNow(parseISO(lastLogin), { addSuffix: true })}
              </TooltipContent>
            </Tooltip>
          );
        },
        comparator: (a: string | null, b: string | null) => {
          const ta = a ? new Date(a).getTime() : 0;
          const tb = b ? new Date(b).getTime() : 0;
          return ta - tb;
        },
      },
      {
        headerName: 'Connections',
        width: 110,
        cellRenderer: (params: ICellRendererParams<CompanyRow>) => {
          const c = params.data;
          if (!c) return null;
          const warn = c.connections_active === 0 && c.connections_total > 0;
          return (
            <span className="text-sm">
              <span className={`font-medium ${warn ? 'text-destructive' : ''}`}>{c.connections_active}</span>
              <span className="text-muted-foreground text-xs"> / {c.connections_total}</span>
            </span>
          );
        },
        type: 'rightAligned',
        comparator: (_a: unknown, _b: unknown, nodeA, nodeB) =>
          (nodeA.data?.connections_active ?? 0) - (nodeB.data?.connections_active ?? 0),
      },
      {
        headerName: 'Users',
        width: 90,
        cellRenderer: (params: ICellRendererParams<CompanyRow>) => {
          const c = params.data;
          if (!c) return null;
          return (
            <span className="text-sm">
              <span className="font-medium">{c.verified_users}</span>
              <span className="text-muted-foreground text-xs"> / {c.pending_invitations}</span>
            </span>
          );
        },
        type: 'rightAligned',
        comparator: (_a: unknown, _b: unknown, nodeA, nodeB) =>
          (nodeA.data?.verified_users ?? 0) - (nodeB.data?.verified_users ?? 0),
      },
      {
        headerName: 'Posts',
        width: 100,
        cellRenderer: (params: ICellRendererParams<CompanyRow>) => {
          const c = params.data;
          if (!c) return null;
          return (
            <span className="text-sm">
              <span className="font-medium">{c.posts_last_7_days}</span>
              <span className="text-muted-foreground text-xs"> / {c.posts_total}</span>
            </span>
          );
        },
        type: 'rightAligned',
        comparator: (_a: unknown, _b: unknown, nodeA, nodeB) =>
          (nodeA.data?.posts_total ?? 0) - (nodeB.data?.posts_total ?? 0),
      },
    ],
    [mediaCompanyMap]
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      resizable: true,
      cellStyle: { display: 'flex', alignItems: 'center', overflow: 'hidden' },
    }),
    []
  );

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Superadmin access required
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-5 h-5" /> Companies
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {companies ? `${companies.length} companies` : 'Loading...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowConfirm(true)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete {selected.length}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setShowCreateMC(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Media Company
          </Button>
          <Button size="sm" onClick={() => setShowCreateCompany(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Company
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center text-destructive py-8">
          Failed to load companies: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      ) : (
        <>
          <DataGridToolbar
            quickFilter={quickFilter}
            onQuickFilterChange={setQuickFilter}
            onExport={onExportCsv}
            quickFilterPlaceholder="Search companies..."
          />
          <div className="relative">
            <style>{`.ag-cell-wrapper { width: 100%; } .ag-cell-value { width: 100%; }`}</style>
            <AgGridReact<CompanyRow>
              ref={gridRef}
              theme={isDark ? gridThemeDark : gridTheme}
              modules={[AllCommunityModule]}
              rowData={companies || []}
              columnDefs={colDefs}
              defaultColDef={defaultColDef}
              quickFilterText={quickFilter}
              domLayout="autoHeight"
              rowSelection="multiple"
              suppressRowClickSelection
              suppressCellFocus
              animateRows
              onGridReady={onGridReady}
              onSelectionChanged={onSelectionChanged}
              getRowId={(params) => params.data.id}
            />
          </div>
        </>
      )}

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.length} company(ies)?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This will permanently delete the following companies and all their related data (posts, analytics, feeds, automations, memberships, etc.):</p>
              <ul className="list-disc pl-5 text-sm max-h-40 overflow-y-auto">
                {selectedNames.map(name => <li key={name}>{name}</li>)}
              </ul>
              <p className="font-medium text-destructive">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate(selected)}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateMediaCompanyDialog open={showCreateMC} onOpenChange={setShowCreateMC} />
      <CreateCompanyDialog open={showCreateCompany} onOpenChange={setShowCreateCompany} />
    </div>
  );
}
