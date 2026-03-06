import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, BarChart3, Users, Sparkles, Loader2, Play, FileText, TrendingUp, AlertTriangle } from 'lucide-react';
import { useLatestBackfillJob, useStartBackfill } from '@/hooks/useInboxBackfill';

export default function SocialIntelligence() {
  const { data: job, isLoading } = useLatestBackfillJob();
  const startBackfill = useStartBackfill();

  const isRunning = job?.status === 'running' || job?.status === 'pending';
  const isCompleted = job?.status === 'completed';
  const progress = job && job.total_conversations > 0
    ? Math.round((job.classified_conversations / job.total_conversations) * 100)
    : 0;

  const report = job?.report_data as {
    summary?: string;
    audience_profile?: {
      total_contacts?: number;
      primary_language?: string;
      sentiment_breakdown?: Record<string, number>;
      top_topics?: string[];
    };
    editorial_intelligence?: {
      editorial_leads_found?: number;
      correction_requests?: number;
      highest_value_count?: number;
    };
    content_performance?: {
      best_performing_topics?: string[];
      recommendations?: string[];
    };
    recommendations?: string[];
  } | null;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6 text-violet-600" />
              Social Intelligence Audit
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              AI-powered analysis of your audience, content performance, and editorial opportunities.
            </p>
          </div>
          {!isRunning && (
            <Button
              onClick={() => startBackfill.mutate()}
              disabled={startBackfill.isPending}
              className="gap-2"
            >
              {startBackfill.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {isCompleted ? 'Run New Audit' : 'Start Audit'}
            </Button>
          )}
        </div>

        {/* Progress bar while running */}
        {isRunning && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
                <span className="font-medium">
                  Analyzing {job?.total_conversations || 0} conversations...
                </span>
                <Badge variant="secondary" className="ml-auto">{progress}%</Badge>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {job?.classified_conversations || 0} of {job?.total_conversations || 0} classified
              </p>
            </CardContent>
          </Card>
        )}

        {/* Failed state */}
        {job?.status === 'failed' && (
          <Card className="border-red-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Audit failed</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{job.error || 'Unknown error'}</p>
            </CardContent>
          </Card>
        )}

        {/* Report display */}
        {isCompleted && report && (
          <div className="space-y-6">
            {/* Executive Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-violet-600" />
                  Executive Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{report.summary}</p>
              </CardContent>
            </Card>

            {/* Stats grid */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground font-medium">Total Contacts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    {report.audience_profile?.total_contacts?.toLocaleString() || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground font-medium">Primary Language</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold uppercase">
                    {report.audience_profile?.primary_language || 'N/A'}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground font-medium">Editorial Leads</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    {report.editorial_intelligence?.editorial_leads_found || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground font-medium">Conversations Analyzed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                    {job?.classified_conversations?.toLocaleString() || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sentiment breakdown */}
            {report.audience_profile?.sentiment_breakdown && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sentiment Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    {Object.entries(report.audience_profile.sentiment_breakdown).map(([sentiment, count]) => (
                      <div key={sentiment} className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          sentiment === 'positive' ? 'bg-green-500' :
                          sentiment === 'negative' ? 'bg-red-500' :
                          'bg-gray-400'
                        }`} />
                        <span className="text-sm capitalize">{sentiment}</span>
                        <span className="text-sm font-bold">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top Topics */}
            {report.audience_profile?.top_topics && report.audience_profile.top_topics.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    Top Topics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {report.audience_profile.top_topics.map((topic, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{topic}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {report.recommendations && report.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-violet-600" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {report.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-violet-600 font-bold mt-0.5">{i + 1}.</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !job && (
          <Card>
            <CardContent className="py-12 text-center">
              <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h2 className="text-lg font-medium mb-2">No audit yet</h2>
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                Run a Social Intelligence Audit to analyze your audience, identify editorial leads, and get actionable recommendations.
              </p>
              <Button onClick={() => startBackfill.mutate()} disabled={startBackfill.isPending} className="gap-2">
                {startBackfill.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Start Audit
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
