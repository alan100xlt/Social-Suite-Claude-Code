import { useState, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type ICellRendererParams,
} from 'ag-grid-community';
import { gridTheme, gridThemeDark } from '@/lib/ag-grid-theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useRoutingRules, useCreateRoutingRule, useUpdateRoutingRule, useDeleteRoutingRule, type RoutingRule } from '@/hooks/useRoutingRules';
import { useCompanyMembers, type CompanyMember } from '@/hooks/useCompany';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Trash2 } from 'lucide-react';

ModuleRegistry.registerModules([AllCommunityModule]);

const PRIORITY_OPTIONS = ['low', 'normal', 'high', 'urgent'] as const;

export function RoutingRulesPanel() {
  const { theme } = useTheme();
  const isDark = theme === 'dark-pro' || theme === 'aurora';
  const { data: rules = [], isLoading } = useRoutingRules();
  const { data: members = [] } = useCompanyMembers();
  const { mutate: createRule, isPending: isCreating } = useCreateRoutingRule();
  const { mutate: updateRule } = useUpdateRoutingRule();
  const { mutate: deleteRule } = useDeleteRoutingRule();

  // New rule form state
  const [newCategory, setNewCategory] = useState('');
  const [newSubcategory, setNewSubcategory] = useState('');
  const [newAssignedTo, setNewAssignedTo] = useState<string>('none');
  const [newDeskName, setNewDeskName] = useState('');
  const [newPriority, setNewPriority] = useState<string>('none');

  const memberMap = useMemo(() => {
    const map = new Map<string, CompanyMember>();
    members.forEach(m => map.set(m.id, m));
    return map;
  }, [members]);

  const handleAdd = () => {
    if (!newCategory.trim()) return;
    createRule({
      category: newCategory.trim(),
      subcategory: newSubcategory.trim() || null,
      assigned_to: newAssignedTo === 'none' ? null : newAssignedTo,
      desk_name: newDeskName.trim() || null,
      priority_override: newPriority === 'none' ? null : newPriority,
      enabled: true,
    }, {
      onSuccess: () => {
        setNewCategory('');
        setNewSubcategory('');
        setNewAssignedTo('none');
        setNewDeskName('');
        setNewPriority('none');
      },
    });
  };

  const handleToggle = useCallback((id: string, enabled: boolean) => {
    updateRule({ id, enabled });
  }, [updateRule]);

  const handleDelete = useCallback((id: string) => {
    deleteRule(id);
  }, [deleteRule]);

  const columnDefs = useMemo<ColDef<RoutingRule>[]>(() => [
    { field: 'category', headerName: 'Category', flex: 1, minWidth: 120 },
    { field: 'subcategory', headerName: 'Subcategory', flex: 1, minWidth: 120,
      valueFormatter: (p) => p.value || '-' },
    {
      field: 'assigned_to',
      headerName: 'Assigned To',
      flex: 1,
      minWidth: 140,
      valueFormatter: (p) => {
        if (!p.value) return 'Unassigned';
        const member = memberMap.get(p.value);
        return member?.full_name || member?.email || p.value;
      },
    },
    { field: 'desk_name', headerName: 'Desk', flex: 1, minWidth: 100,
      valueFormatter: (p) => p.value || '-' },
    { field: 'priority_override', headerName: 'Priority', width: 100,
      valueFormatter: (p) => p.value ? p.value.charAt(0).toUpperCase() + p.value.slice(1) : '-' },
    {
      field: 'enabled',
      headerName: 'Enabled',
      width: 90,
      cellRenderer: (params: ICellRendererParams<RoutingRule>) => {
        if (!params.data) return null;
        const rule = params.data;
        return (
          <div className="flex items-center justify-center h-full">
            <Switch
              checked={rule.enabled}
              onCheckedChange={(checked) => handleToggle(rule.id, checked)}
            />
          </div>
        );
      },
    },
    {
      headerName: '',
      width: 60,
      sortable: false,
      filter: false,
      cellRenderer: (params: ICellRendererParams<RoutingRule>) => {
        if (!params.data) return null;
        return (
          <div className="flex items-center justify-center h-full">
            <button
              onClick={() => handleDelete(params.data!.id)}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ], [memberMap, handleToggle, handleDelete]);

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-1">Routing Rules</h3>
        <p className="text-xs text-muted-foreground">
          Automatically assign conversations to team members based on category and desk.
        </p>
      </div>

      {/* Add new rule form */}
      <div className="flex flex-wrap items-end gap-2 p-3 border rounded-lg bg-muted/30">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Category *</label>
          <Input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="e.g. editorial"
            className="h-8 w-[130px] text-xs"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Subcategory</label>
          <Input
            value={newSubcategory}
            onChange={(e) => setNewSubcategory(e.target.value)}
            placeholder="e.g. sports"
            className="h-8 w-[130px] text-xs"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Assign To</label>
          <Select value={newAssignedTo} onValueChange={setNewAssignedTo}>
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue placeholder="Select member" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned</SelectItem>
              {members.map(m => (
                <SelectItem key={m.id} value={m.id}>
                  {m.full_name || m.email || 'Unknown'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Desk</label>
          <Input
            value={newDeskName}
            onChange={(e) => setNewDeskName(e.target.value)}
            placeholder="e.g. News Desk"
            className="h-8 w-[120px] text-xs"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Priority</label>
          <Select value={newPriority} onValueChange={setNewPriority}>
            <SelectTrigger className="h-8 w-[100px] text-xs">
              <SelectValue placeholder="Default" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Default</SelectItem>
              {PRIORITY_OPTIONS.map(p => (
                <SelectItem key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          size="sm"
          className="h-8 gap-1"
          onClick={handleAdd}
          disabled={!newCategory.trim() || isCreating}
        >
          {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add
        </Button>
      </div>

      {/* AG Grid table */}
      <div className="h-[400px]">
        <AgGridReact<RoutingRule>
          theme={isDark ? gridThemeDark : gridTheme}
          rowData={rules}
          columnDefs={columnDefs}
          domLayout="normal"
          animateRows
          getRowId={(params) => params.data.id}
          noRowsOverlayComponent={() => (
            <div className="text-sm text-muted-foreground p-4">
              No routing rules configured. Add one above to get started.
            </div>
          )}
        />
      </div>
    </div>
  );
}
