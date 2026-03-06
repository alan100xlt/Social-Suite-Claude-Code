import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, Activity, Zap, AlertTriangle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

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

function useAIHealthData() {
  return useQuery({
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
}

function useAIResultsStats() {
  return useQuery({
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
}

export default function AdminAIHealth() {
  const { data: companies = [], isLoading } = useAIHealthData();
  const { data: stats } = useAIResultsStats();

  const totalCalls = companies.reduce((sum, c) => sum + c.ai_calls_count, 0);
  const autoClassifyCount = companies.filter(c => c.auto_classify).length;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-violet-600" />
            AI Health Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor AI usage, classification accuracy, and costs across all companies.
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">Total AI Calls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCalls.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">This billing period</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">Auto-Classify Enabled</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{autoClassifyCount} / {companies.length}</div>
              <p className="text-xs text-muted-foreground">Companies opted in</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">Classified Conversations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats?.classifiedConversations || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total across all companies</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">Feedback Corrections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats?.totalFeedback || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Human corrections submitted</p>
            </CardContent>
          </Card>
        </div>

        {/* Companies table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Per-Company AI Usage</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : companies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No companies have AI settings configured yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-2 font-medium">Company</th>
                      <th className="pb-2 font-medium">Type</th>
                      <th className="pb-2 font-medium text-right">AI Calls</th>
                      <th className="pb-2 font-medium text-center">Auto-Classify</th>
                      <th className="pb-2 font-medium text-center">Smart Ack</th>
                      <th className="pb-2 font-medium text-center">Crisis</th>
                      <th className="pb-2 font-medium">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((company) => (
                      <tr key={company.company_id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-3 font-medium">
                          {company.companies?.name || company.company_id.slice(0, 8)}
                        </td>
                        <td className="py-3">
                          <Badge variant="outline" className="text-xs capitalize">
                            {company.company_type}
                          </Badge>
                        </td>
                        <td className="py-3 text-right font-mono">
                          {company.ai_calls_count.toLocaleString()}
                        </td>
                        <td className="py-3 text-center">
                          <FeatureIndicator enabled={company.auto_classify} />
                        </td>
                        <td className="py-3 text-center">
                          <FeatureIndicator enabled={company.smart_acknowledgment} />
                        </td>
                        <td className="py-3 text-center">
                          <FeatureIndicator enabled={company.crisis_detection} />
                        </td>
                        <td className="py-3 text-muted-foreground text-xs">
                          {formatDistanceToNow(new Date(company.updated_at), { addSuffix: true })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function FeatureIndicator({ enabled }: { enabled: boolean }) {
  return (
    <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
      enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-muted text-muted-foreground'
    }`}>
      {enabled ? '✓' : '–'}
    </span>
  );
}
