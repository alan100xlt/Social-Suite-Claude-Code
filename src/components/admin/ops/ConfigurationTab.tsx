import { useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, type ColDef } from 'ag-grid-community';
import { gridTheme, gridThemeDark } from '@/lib/ag-grid-theme';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowRight, Clock, Database, Globe, Shield, Zap, Brain,
  MessageSquare, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// ─── AI Health Types ──────────────────────────────────────

interface AIHealthRow {
  company_id: string;
  company_type: string;
  auto_classify: boolean;
  smart_acknowledgment: boolean;
  crisis_detection: boolean;
  ai_calls_count: number;
  ai_calls_reset_at: string;
  updated_at: string;
  companies: { name: string } | null;
}

function FeatureIndicator({ enabled }: { enabled: boolean }) {
  return (
    <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
      enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-muted text-muted-foreground'
    }`}>
      {enabled ? '\u2713' : '\u2013'}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────

export function ConfigurationTab() {
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark-pro' || currentTheme === 'aurora';
  const aiGridRef = useRef<AgGridReact>(null);

  // AI health queries
  const { data: aiCompanies = [], isLoading: aiLoading } = useQuery({
    queryKey: ['admin-ai-health'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inbox_ai_settings' as any)
        .select('*, companies:company_id(name)')
        .order('ai_calls_count', { ascending: false });
      if (error) throw error;
      return (data || []) as AIHealthRow[];
    },
  });

  const { data: aiStats } = useQuery({
    queryKey: ['admin-ai-results-stats'],
    queryFn: async () => {
      const { count: totalResults } = await supabase
        .from('inbox_ai_results' as any)
        .select('*', { count: 'exact', head: true });
      const { count: totalFeedback } = await supabase
        .from('inbox_ai_feedback' as any)
        .select('*', { count: 'exact', head: true });
      const { count: classifiedConversations } = await supabase
        .from('inbox_conversations' as any)
        .select('*', { count: 'exact', head: true })
        .not('ai_classified_at', 'is', null);
      return {
        totalResults: totalResults || 0,
        totalFeedback: totalFeedback || 0,
        classifiedConversations: classifiedConversations || 0,
      };
    },
  });

  const totalCalls = aiCompanies.reduce((sum, c) => sum + c.ai_calls_count, 0);
  const autoClassifyCount = aiCompanies.filter(c => c.auto_classify).length;

  const aiColDefs = useMemo<ColDef[]>(() => [
    {
      field: 'companies', headerName: 'Company', flex: 1, minWidth: 150, filter: true,
      cellRenderer: (p: any) => p.value?.name || p.data?.company_id?.slice(0, 8),
      comparator: (a: any, b: any) => (a?.name || '').localeCompare(b?.name || ''),
    },
    {
      field: 'company_type', headerName: 'Type', width: 110, filter: true,
      cellRenderer: (p: any) => <Badge variant="outline" className="text-xs capitalize">{p.value}</Badge>,
    },
    {
      field: 'ai_calls_count', headerName: 'AI Calls', width: 110, type: 'numericColumn',
      cellRenderer: (p: any) => <span className="font-mono">{(p.value || 0).toLocaleString()}</span>,
    },
    {
      field: 'auto_classify', headerName: 'Auto-Classify', width: 120,
      cellRenderer: (p: any) => <FeatureIndicator enabled={p.value} />,
      cellStyle: { display: 'flex', justifyContent: 'center', alignItems: 'center' },
    },
    {
      field: 'smart_acknowledgment', headerName: 'Smart Ack', width: 110,
      cellRenderer: (p: any) => <FeatureIndicator enabled={p.value} />,
      cellStyle: { display: 'flex', justifyContent: 'center', alignItems: 'center' },
    },
    {
      field: 'crisis_detection', headerName: 'Crisis', width: 100,
      cellRenderer: (p: any) => <FeatureIndicator enabled={p.value} />,
      cellStyle: { display: 'flex', justifyContent: 'center', alignItems: 'center' },
    },
    {
      field: 'updated_at', headerName: 'Last Activity', width: 150,
      cellRenderer: (p: any) => p.value
        ? <span className="text-muted-foreground text-xs">{formatDistanceToNow(new Date(p.value), { addSuffix: true })}</span>
        : '',
    },
  ], []);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
    cellStyle: { display: 'flex', alignItems: 'center' },
  }), []);

  return (
    <div className="space-y-6">
      {/* Pipeline Architecture Diagram */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" /> Pipeline Architecture
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-3 py-4">
            <div className="text-center p-3 border rounded-lg bg-muted/30 min-w-[100px]">
              <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs font-medium">pg_cron</p>
              <p className="text-[10px] text-muted-foreground">Scheduler</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="text-center p-3 border rounded-lg bg-primary/5 border-primary/20 min-w-[120px]">
              <Shield className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-xs font-medium">cron-dispatcher</p>
              <p className="text-[10px] text-muted-foreground">Edge function</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="text-center p-3 border rounded-lg bg-muted/30 min-w-[100px]">
              <Globe className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs font-medium">Target Fn</p>
              <p className="text-[10px] text-muted-foreground">Per company</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="text-center p-3 border rounded-lg bg-muted/30 min-w-[100px]">
              <Database className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs font-medium">Supabase</p>
              <p className="text-[10px] text-muted-foreground">Data store</p>
            </div>
          </div>
          <p className="text-xs text-center text-muted-foreground mt-1">
            pg_cron triggers the dispatcher edge function, which fans out per-company requests using a single auto-injected service key.
          </p>
        </CardContent>
      </Card>

      {/* AI Health Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Brain className="h-3.5 w-3.5" /> Total AI Calls
            </div>
            <p className="text-2xl font-bold">{totalCalls.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">This billing period</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Zap className="h-3.5 w-3.5" /> Auto-Classify
            </div>
            <p className="text-2xl font-bold">{autoClassifyCount} / {aiCompanies.length}</p>
            <p className="text-xs text-muted-foreground">Companies opted in</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <MessageSquare className="h-3.5 w-3.5" /> Classified
            </div>
            <p className="text-2xl font-bold">{(aiStats?.classifiedConversations || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Conversations total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Corrections
            </div>
            <p className="text-2xl font-bold">{(aiStats?.totalFeedback || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Human feedback</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-Company AI Usage Grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Per-Company AI Usage</CardTitle>
        </CardHeader>
        <CardContent>
          {aiLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : aiCompanies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No companies have AI settings configured yet.</p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <AgGridReact
                ref={aiGridRef}
                theme={isDark ? gridThemeDark : gridTheme}
                modules={[AllCommunityModule]}
                rowData={aiCompanies}
                columnDefs={aiColDefs}
                defaultColDef={defaultColDef}
                domLayout="autoHeight"
                suppressCellFocus
                getRowId={(p) => p.data.company_id}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
