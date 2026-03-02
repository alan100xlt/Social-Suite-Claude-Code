import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Building2, Users, Link2, Newspaper, Trash2, AlertTriangle, Plus } from 'lucide-react';
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
      if (error) throw error;
      return data.companies as CompanyRow[];
    },
  });
}

function OnboardingBadge({ status, step }: { status: string; step: number }) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    complete: { label: 'Complete', variant: 'default' },
    wizard_complete: { label: `Wizard Done (${step}/6)`, variant: 'secondary' },
    in_progress: { label: `Step ${step}/6`, variant: 'outline' },
  };
  const info = map[status] || { label: status, variant: 'outline' as const };
  return <Badge variant={info.variant} className="text-xs whitespace-nowrap">{info.label}</Badge>;
}

function DaysSinceLogin({ lastLogin }: { lastLogin: string | null }) {
  if (!lastLogin) return <span className="text-muted-foreground text-xs">Never</span>;
  const days = differenceInDays(new Date(), parseISO(lastLogin));
  const isStale = days > 14;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`text-xs ${isStale ? 'text-destructive font-medium' : 'text-foreground'}`}>
          {days === 0 ? 'Today' : `${days}d ago`}
          {isStale && <AlertTriangle className="inline w-3 h-3 ml-1" />}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        Last login: {formatDistanceToNow(parseISO(lastLogin), { addSuffix: true })}
      </TooltipContent>
    </Tooltip>
  );
}

export default function SuperadminCompanies() {
  const { isSuperAdmin } = useAuth();
  const { data: companies, isLoading, error } = useAdminCompanies();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCreateMC, setShowCreateMC] = useState(false);
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const queryClient = useQueryClient();
  const { data: mediaCompanyMap } = useCompanyMediaCompanyMap();

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
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const allIds = companies?.map(c => c.id) ?? [];
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  };

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectedNames = companies?.filter(c => selected.has(c.id)).map(c => c.name) ?? [];

  if (!isSuperAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Superadmin access required
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Building2 className="w-6 h-6" /> Companies
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {companies ? `${companies.length} companies` : 'Loading...'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowConfirm(true)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Delete {selected.size}
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

        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead className="font-semibold">Company</TableHead>
                  <TableHead className="font-semibold">Media Company</TableHead>
                  <TableHead className="font-semibold">Onboarding</TableHead>
                  <TableHead className="font-semibold">Signed Up</TableHead>
                  <TableHead className="font-semibold">Last Login</TableHead>
                  <TableHead className="font-semibold text-center">
                    <Tooltip>
                      <TooltipTrigger asChild><span className="flex items-center gap-1 justify-center"><Link2 className="w-3.5 h-3.5" /> Connections</span></TooltipTrigger>
                      <TooltipContent>Active / Total (Discovered)</TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="font-semibold text-center">
                    <Tooltip>
                      <TooltipTrigger asChild><span className="flex items-center gap-1 justify-center"><Users className="w-3.5 h-3.5" /> Users</span></TooltipTrigger>
                      <TooltipContent>Verified / Invited</TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="font-semibold text-center">
                    <Tooltip>
                      <TooltipTrigger asChild><span className="flex items-center gap-1 justify-center"><Newspaper className="w-3.5 h-3.5" /> Posts</span></TooltipTrigger>
                      <TooltipContent>Last 7 days / Total</TooltipContent>
                    </Tooltip>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-destructive py-8">
                      Failed to load companies: {error instanceof Error ? error.message : 'Unknown error'}
                    </TableCell>
                  </TableRow>
                ) : companies?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No companies found
                    </TableCell>
                  </TableRow>
                ) : (
                  companies?.map((c) => (
                    <TableRow
                      key={c.id}
                      className={`transition-colors ${selected.has(c.id) ? 'bg-primary/5' : 'hover:bg-muted/30'}`}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selected.has(c.id)}
                          onCheckedChange={() => toggle(c.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="min-w-[160px]">
                          <p className="font-medium text-sm text-foreground">{c.name}</p>
                          {c.website_url && (
                            <a href={c.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary truncate block max-w-[200px]">
                              {c.website_url.replace(/^https?:\/\//, '')}
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[160px]">
                        <MediaCompanyCombobox
                          companyId={c.id}
                          currentMediaCompanyId={mediaCompanyMap?.get(c.id)?.mediaCompanyId}
                          currentMediaCompanyName={mediaCompanyMap?.get(c.id)?.mediaCompanyName}
                        />
                      </TableCell>
                      <TableCell>
                        <OnboardingBadge status={c.onboarding_status} step={c.onboarding_step} />
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs text-foreground whitespace-nowrap">
                              {formatDistanceToNow(parseISO(c.created_at), { addSuffix: true })}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{new Date(c.created_at).toLocaleDateString()}</TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <DaysSinceLogin lastLogin={c.last_login} />
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`text-sm font-medium ${c.connections_active === 0 && c.connections_total > 0 ? 'text-destructive' : 'text-foreground'}`}>{c.connections_active}</span>
                        <span className="text-muted-foreground text-xs"> / {c.connections_total}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm font-medium text-foreground">{c.verified_users}</span>
                        <span className="text-muted-foreground text-xs"> / {c.pending_invitations}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm font-medium text-foreground">{c.posts_last_7_days}</span>
                        <span className="text-muted-foreground text-xs"> / {c.posts_total}</span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} company(ies)?</AlertDialogTitle>
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
              onClick={() => deleteMutation.mutate(Array.from(selected))}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateMediaCompanyDialog open={showCreateMC} onOpenChange={setShowCreateMC} />
      <CreateCompanyDialog open={showCreateCompany} onOpenChange={setShowCreateCompany} />
    </DashboardLayout>
  );
}
