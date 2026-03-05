import { useState, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, MoreHorizontal, Star, Plus, Loader2, Trash2, KeyRound, UserPlus, Building2, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  type ColDef,
  type ICellRendererParams,
  type GridReadyEvent,
  type RowClickedEvent,
} from 'ag-grid-community';
import { gridTheme, gridThemeDark } from '@/lib/ag-grid-theme';
import { useTheme } from '@/contexts/ThemeContext';
import { DataGridToolbar } from '@/components/ui/data-grid-toolbar';

// -- Types ------------------------------------------------------------------

interface CompanyMembership {
  company_id: string;
  company_name: string;
  role: 'owner' | 'admin' | 'member';
}

interface MediaMembership {
  media_company_id: string;
  media_company_name: string;
  role: 'admin' | 'member' | 'viewer';
  is_active: boolean;
}

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  is_superadmin: boolean;
  company_memberships: CompanyMembership[];
  media_memberships: MediaMembership[];
}

// -- Hooks ------------------------------------------------------------------

function useAdminUsers() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'list' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.users as AdminUser[];
    },
  });
}

function useAdminUserMutation(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const { data, error } = await supabase.functions.invoke('admin-users', { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      onSuccess?.();
    },
  });
}

// -- Create User Dialog -----------------------------------------------------

function CreateUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [makeSuperadmin, setMakeSuperadmin] = useState(false);

  const mutation = useAdminUserMutation(() => {
    toast({ title: 'User created', description: `${email} has been created and sent a set-password email.` });
    setEmail('');
    setFullName('');
    setMakeSuperadmin(false);
    onClose();
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
          </div>
          <div className="space-y-2">
            <Label>Full Name (optional)</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Smith" />
          </div>
          <div className="flex items-center gap-3">
            <Switch id="superadmin" checked={makeSuperadmin} onCheckedChange={setMakeSuperadmin} />
            <Label htmlFor="superadmin">Make superadmin</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate({ action: 'create', email, full_name: fullName, make_superadmin: makeSuperadmin })}
            disabled={!email || mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create & Send Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -- User Slide-over --------------------------------------------------------

function UserSheet({ user, open, onClose }: { user: AdminUser | null; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const mutation = useAdminUserMutation();

  const { data: allCompanies } = useQuery({
    queryKey: ['all-companies-for-admin'],
    queryFn: async () => {
      const { data } = await supabase.from('companies').select('id, name').order('name');
      return data || [];
    },
    enabled: open,
  });

  const { data: allMediaCompanies } = useQuery({
    queryKey: ['all-media-companies-for-admin'],
    queryFn: async () => {
      const { data } = await supabase.from('media_companies').select('id, name').order('name');
      return data || [];
    },
    enabled: open,
  });

  const [addCompanyId, setAddCompanyId] = useState('');
  const [addCompanyRole, setAddCompanyRole] = useState<'owner' | 'admin' | 'member'>('member');
  const [addMediaId, setAddMediaId] = useState('');
  const [addMediaRole, setAddMediaRole] = useState<'admin' | 'member' | 'viewer'>('member');

  if (!user) return null;

  const displayName = user.full_name || user.email;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{displayName}</SheetTitle>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Account</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Joined</p>
                <p>{formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last sign in</p>
                <p>{user.last_sign_in_at ? formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true }) : 'Never'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Switch
                id="superadmin-toggle"
                checked={user.is_superadmin}
                onCheckedChange={(checked) =>
                  mutation.mutate(
                    { action: 'toggle_superadmin', user_id: user.id, is_superadmin: checked },
                    { onSuccess: () => toast({ title: checked ? 'Superadmin granted' : 'Superadmin removed' }) },
                  )
                }
              />
              <Label htmlFor="superadmin-toggle" className="flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 text-yellow-500" />
                Superadmin
              </Label>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Company Memberships</h3>
            {user.company_memberships.length === 0 && (
              <p className="text-xs text-muted-foreground">No company memberships</p>
            )}
            {user.company_memberships.map((m) => (
              <div key={m.company_id} className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm flex-1 truncate">{m.company_name}</span>
                <Select
                  value={m.role}
                  onValueChange={(role) =>
                    mutation.mutate({ action: 'update_company_membership', user_id: user.id, company_id: m.company_id, role })
                  }
                >
                  <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => mutation.mutate({ action: 'update_company_membership', user_id: user.id, company_id: m.company_id, remove: true })}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1">
              <Select value={addCompanyId} onValueChange={setAddCompanyId}>
                <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue placeholder="Add to company..." /></SelectTrigger>
                <SelectContent>
                  {(allCompanies || [])
                    .filter((c: any) => !user.company_memberships.find((m) => m.company_id === c.id))
                    .map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={addCompanyRole} onValueChange={(v) => setAddCompanyRole(v as any)}>
                <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="h-8" disabled={!addCompanyId || mutation.isPending}
                onClick={() => {
                  mutation.mutate(
                    { action: 'update_company_membership', user_id: user.id, company_id: addCompanyId, role: addCompanyRole },
                    { onSuccess: () => setAddCompanyId('') },
                  );
                }}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Media Company Access</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Grants access to all child companies within the media company</p>
            </div>
            {user.media_memberships.filter((m) => m.is_active).length === 0 && (
              <p className="text-xs text-muted-foreground">No media company access</p>
            )}
            {user.media_memberships.filter((m) => m.is_active).map((m) => (
              <div key={m.media_company_id} className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm flex-1 truncate">{m.media_company_name}</span>
                <Select
                  value={m.role}
                  onValueChange={(role) =>
                    mutation.mutate({ action: 'update_media_membership', user_id: user.id, media_company_id: m.media_company_id, role })
                  }
                >
                  <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => mutation.mutate({ action: 'update_media_membership', user_id: user.id, media_company_id: m.media_company_id, remove: true })}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1">
              <Select value={addMediaId} onValueChange={setAddMediaId}>
                <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue placeholder="Add to media company..." /></SelectTrigger>
                <SelectContent>
                  {(allMediaCompanies || [])
                    .filter((m: any) => !user.media_memberships.find((em) => em.media_company_id === m.id && em.is_active))
                    .map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={addMediaRole} onValueChange={(v) => setAddMediaRole(v as any)}>
                <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="h-8" disabled={!addMediaId || mutation.isPending}
                onClick={() => {
                  mutation.mutate(
                    { action: 'update_media_membership', user_id: user.id, media_company_id: addMediaId, role: addMediaRole },
                    { onSuccess: () => setAddMediaId('') },
                  );
                }}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// -- Main Tab ---------------------------------------------------------------

export function UsersTab() {
  const { toast } = useToast();
  const { data: users, isLoading } = useAdminUsers();
  const mutation = useAdminUserMutation();
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark-pro' || currentTheme === 'aurora';

  const [quickFilter, setQuickFilter] = useState('');
  const [superadminOnly, setSuperadminOnly] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const gridRef = useRef<AgGridReact<AdminUser>>(null);

  const filtered = useMemo(() => {
    if (!users) return [];
    if (!superadminOnly) return users;
    return users.filter((u) => u.is_superadmin);
  }, [users, superadminOnly]);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.sizeColumnsToFit();
  }, []);

  const onExportCsv = useCallback(() => {
    gridRef.current?.api?.exportDataAsCsv({ fileName: 'users-export.csv' });
  }, []);

  const onRowClicked = useCallback((event: RowClickedEvent<AdminUser>) => {
    // Don't open sheet if clicking on the actions column
    const col = event.column?.getColId();
    if (col === 'actions') return;
    if (event.data) setSelectedUser(event.data);
  }, []);

  const colDefs = useMemo<ColDef<AdminUser>[]>(
    () => [
      {
        headerName: 'User',
        field: 'full_name',
        flex: 1,
        minWidth: 200,
        cellRenderer: (params: ICellRendererParams<AdminUser>) => {
          const u = params.data;
          if (!u) return null;
          return (
            <div className="py-1">
              <p className="font-medium text-sm">{u.full_name || '\u2014'}</p>
              <p className="text-xs text-muted-foreground">{u.email}</p>
            </div>
          );
        },
        filter: 'agTextColumnFilter',
        filterValueGetter: (params) => `${params.data?.full_name || ''} ${params.data?.email || ''}`,
      },
      {
        headerName: 'Access',
        field: 'is_superadmin',
        width: 120,
        cellRenderer: (params: ICellRendererParams<AdminUser>) => {
          if (!params.data?.is_superadmin) return null;
          return (
            <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800 border-yellow-200">
              <Star className="h-3 w-3" />
              Superadmin
            </Badge>
          );
        },
        filter: 'agTextColumnFilter',
        filterValueGetter: (params) => params.data?.is_superadmin ? 'superadmin' : '',
      },
      {
        headerName: 'Companies',
        width: 200,
        cellRenderer: (params: ICellRendererParams<AdminUser>) => {
          const u = params.data;
          if (!u) return null;
          return (
            <div className="flex flex-wrap gap-1">
              {u.company_memberships.slice(0, 2).map((m) => (
                <Badge key={m.company_id} variant="outline" className="text-xs">
                  {m.company_name}
                </Badge>
              ))}
              {u.company_memberships.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{u.company_memberships.length - 2}
                </Badge>
              )}
              {u.media_memberships.filter((m) => m.is_active).map((m) => (
                <Badge key={m.media_company_id} variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                  {m.media_company_name}
                </Badge>
              ))}
            </div>
          );
        },
        sortable: false,
        filter: false,
      },
      {
        headerName: 'Joined',
        field: 'created_at',
        width: 120,
        cellRenderer: (params: ICellRendererParams<AdminUser>) => (
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(params.value), { addSuffix: true })}
          </span>
        ),
        comparator: (a: string, b: string) => new Date(a).getTime() - new Date(b).getTime(),
      },
      {
        headerName: 'Last Sign In',
        field: 'last_sign_in_at',
        width: 120,
        cellRenderer: (params: ICellRendererParams<AdminUser>) => (
          <span className="text-xs text-muted-foreground">
            {params.value
              ? formatDistanceToNow(new Date(params.value), { addSuffix: true })
              : 'Never'}
          </span>
        ),
        comparator: (a: string | null, b: string | null) => {
          const ta = a ? new Date(a).getTime() : 0;
          const tb = b ? new Date(b).getTime() : 0;
          return ta - tb;
        },
      },
      {
        colId: 'actions',
        headerName: '',
        width: 60,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        pinned: 'right',
        cellRenderer: (params: ICellRendererParams<AdminUser>) => {
          const user = params.data;
          if (!user) return null;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    mutation.mutate(
                      { action: 'reset_password', email: user.email },
                      { onSuccess: () => toast({ title: 'Password reset email sent', description: user.email }) },
                    )
                  }
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  Reset Password
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    mutation.mutate(
                      { action: 'toggle_superadmin', user_id: user.id, is_superadmin: !user.is_superadmin },
                      {
                        onSuccess: () =>
                          toast({ title: user.is_superadmin ? 'Superadmin removed' : 'Superadmin granted' }),
                      },
                    )
                  }
                >
                  <Star className="h-4 w-4 mr-2" />
                  {user.is_superadmin ? 'Remove Superadmin' : 'Make Superadmin'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    if (!confirm(`Delete ${user.email}? This cannot be undone.`)) return;
                    mutation.mutate(
                      { action: 'delete_user', user_id: user.id },
                      { onSuccess: () => toast({ title: 'User deleted', description: user.email }) },
                    );
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [mutation, toast]
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      resizable: true,
      cellStyle: { display: 'flex', alignItems: 'center', overflow: 'hidden' },
    }),
    []
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5" /> Users
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {users ? `${users.length} total users` : 'Manage all platform users'}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          New User
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <DataGridToolbar
          quickFilter={quickFilter}
          onQuickFilterChange={setQuickFilter}
          onExport={onExportCsv}
          quickFilterPlaceholder="Search by name or email..."
          filterChips={[
            {
              id: 'superadmin',
              label: 'Superadmins only',
              active: superadminOnly,
              color: 'text-yellow-800',
              bgColor: 'bg-yellow-50 border-yellow-200',
            },
          ]}
          onFilterChipToggle={() => setSuperadminOnly((v) => !v)}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="relative">
          <style>{`.ag-cell-wrapper { width: 100%; } .ag-cell-value { width: 100%; }`}</style>
          <AgGridReact<AdminUser>
            ref={gridRef}
            theme={isDark ? gridThemeDark : gridTheme}
            modules={[AllCommunityModule]}
            rowData={filtered}
            columnDefs={colDefs}
            defaultColDef={defaultColDef}
            quickFilterText={quickFilter}
            domLayout="autoHeight"
            suppressCellFocus
            animateRows
            onGridReady={onGridReady}
            onRowClicked={onRowClicked}
            getRowId={(params) => params.data.id}
          />
        </div>
      )}

      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <UserSheet user={selectedUser} open={!!selectedUser} onClose={() => setSelectedUser(null)} />
    </div>
  );
}
