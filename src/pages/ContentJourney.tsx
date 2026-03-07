import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BarChart3, Eye, MousePointerClick, Users, Clock, ArrowRight, RefreshCcw, Loader2, ExternalLink } from 'lucide-react';
import { FaTwitter, FaLinkedin, FaFacebook, FaInstagram } from 'react-icons/fa';
import { useGAPageMetrics } from '@/hooks/useGAPageMetrics';
import { useGATrafficSources } from '@/hooks/useGATrafficSources';
import { useContentJourney } from '@/hooks/useContentJourney';
import { useGAConnections, useSyncGA } from '@/hooks/useGoogleAnalytics';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { format, subDays } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const DATE_RANGES = [
  { label: 'Last 7 days', value: '7' },
  { label: 'Last 30 days', value: '30' },
  { label: 'Last 90 days', value: '90' },
];

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  twitter: <FaTwitter className="w-4 h-4 text-sky-500" />,
  linkedin: <FaLinkedin className="w-4 h-4 text-blue-700" />,
  facebook: <FaFacebook className="w-4 h-4 text-blue-600" />,
  instagram: <FaInstagram className="w-4 h-4 text-pink-500" />,
};

const CHART_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export default function ContentJourney() {
  const { selectedCompanyId } = useSelectedCompany();
  const [dateRange, setDateRange] = useState('30');
  const syncGA = useSyncGA();

  const today = format(new Date(), 'yyyy-MM-dd');
  const startDate = format(subDays(new Date(), parseInt(dateRange)), 'yyyy-MM-dd');

  const { data: gaConnections } = useGAConnections();
  const { data: pageMetrics, isLoading: metricsLoading } = useGAPageMetrics({ startDate, endDate: today });
  const { data: trafficSources, isLoading: sourcesLoading } = useGATrafficSources({ startDate, endDate: today });
  const { data: contentJourney, isLoading: journeyLoading } = useContentJourney({ startDate, endDate: today });

  const isConnected = gaConnections && gaConnections.length > 0;
  const isLoading = metricsLoading || sourcesLoading || journeyLoading;

  // ── KPI aggregations ──────────────────────────────────────
  const kpis = useMemo(() => {
    const totalPageviews = pageMetrics?.reduce((sum, m) => sum + m.totalPageviews, 0) || 0;
    const socialReferrals = trafficSources
      ?.filter((s) => s.medium === 'social')
      .reduce((sum, s) => sum + s.totalSessions, 0) || 0;
    const totalSessions = trafficSources?.reduce((sum, s) => sum + s.totalSessions, 0) || 0;
    const conversionRate = totalSessions > 0 ? (socialReferrals / totalSessions) * 100 : 0;
    const avgTimeOnPage = pageMetrics && pageMetrics.length > 0
      ? pageMetrics.reduce((sum, m) => sum + m.avgTimeOnPage, 0) / pageMetrics.length
      : 0;

    return { totalPageviews, socialReferrals, conversionRate, avgTimeOnPage };
  }, [pageMetrics, trafficSources]);

  // ── Traffic source donut chart data ───────────────────────
  const donutData = useMemo(() => {
    if (!trafficSources) return [];
    // Group by medium
    const mediumMap = new Map<string, number>();
    for (const s of trafficSources) {
      const medium = s.medium === '(none)' ? 'Direct' : s.medium.charAt(0).toUpperCase() + s.medium.slice(1);
      mediumMap.set(medium, (mediumMap.get(medium) || 0) + s.totalSessions);
    }
    return Array.from(mediumMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [trafficSources]);

  // ── Social platform referral bar chart ────────────────────
  const socialBarData = useMemo(() => {
    if (!trafficSources) return [];
    return trafficSources
      .filter((s) => s.medium === 'social')
      .map((s) => ({
        source: s.source.replace('.com', ''),
        sessions: s.totalSessions,
        users: s.totalUsers,
      }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 8);
  }, [trafficSources]);

  // ── Not connected state ───────────────────────────────────
  if (!isConnected && !isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BarChart3 className="w-16 h-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Content Journey Analytics</h1>
          <p className="text-muted-foreground max-w-md mb-6">
            Connect Google Analytics to see the full journey from social post to website
            engagement. Track which posts drive the most traffic and how visitors
            interact with your content.
          </p>
          <Button asChild>
            <a href="/app/connections">Connect Google Analytics</a>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Content Journey
          </h1>
          <p className="text-muted-foreground mt-1">
            Track the full lifecycle: Social Post → Clicks → Website Engagement
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => selectedCompanyId && syncGA.mutate(selectedCompanyId)}
            disabled={syncGA.isPending}
          >
            {syncGA.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
          </Button>
          {isConnected && (
            <Badge variant="outline" className="text-green-600 border-green-200">
              GA4 Connected
            </Badge>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Pageviews</span>
            </div>
            <div className="text-2xl font-bold">{formatNumber(kpis.totalPageviews)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <MousePointerClick className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Social Referrals</span>
            </div>
            <div className="text-2xl font-bold">{formatNumber(kpis.socialReferrals)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Social Traffic %</span>
            </div>
            <div className="text-2xl font-bold">{kpis.conversionRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Avg Time on Page</span>
            </div>
            <div className="text-2xl font-bold">{formatDuration(kpis.avgTimeOnPage)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Content Hub Table */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Content Hub</CardTitle>
        </CardHeader>
        <CardContent>
          {metricsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pageMetrics && pageMetrics.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Page</TableHead>
                    <TableHead className="text-right">Pageviews</TableHead>
                    <TableHead className="text-right">Sessions</TableHead>
                    <TableHead className="text-right">Users</TableHead>
                    <TableHead className="text-right">Bounce Rate</TableHead>
                    <TableHead className="text-right">Avg Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageMetrics.slice(0, 20).map((metric, i) => (
                    <TableRow key={`${metric.pagePath}-${i}`}>
                      <TableCell className="max-w-[300px] truncate font-medium">
                        {metric.pagePath}
                      </TableCell>
                      <TableCell className="text-right">{formatNumber(metric.totalPageviews)}</TableCell>
                      <TableCell className="text-right">{formatNumber(metric.totalSessions)}</TableCell>
                      <TableCell className="text-right">{formatNumber(metric.totalUsers)}</TableCell>
                      <TableCell className="text-right">{metric.avgBounceRate.toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{formatDuration(metric.avgTimeOnPage)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No page data available for this period.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Journeys */}
      {contentJourney && contentJourney.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Top Content Journeys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {contentJourney.map((item, i) => (
                <div
                  key={`${item.postId}-${i}`}
                  className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                >
                  {/* Social Post Side */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {PLATFORM_ICONS[item.platform] || null}
                      <span className="text-xs text-muted-foreground capitalize">{item.platform}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(item.publishedAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <p className="text-sm line-clamp-2 mb-2">{item.postContent}</p>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>{formatNumber(item.impressions)} impressions</span>
                      <span>{formatNumber(item.socialClicks)} clicks</span>
                      <span>{item.engagementRate.toFixed(1)}% engagement</span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center self-center px-2">
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </div>

                  {/* Web Performance Side */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium mb-1 truncate">{item.pagePath}</div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>{formatNumber(item.pageviews)} pageviews</span>
                      <span>{formatNumber(item.sessionsFromSocial)} from social</span>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                      <span>{item.bounceRate.toFixed(1)}% bounce</span>
                      <span>{formatDuration(item.avgTimeOnPage)} avg time</span>
                    </div>
                    <Badge variant="outline" className="mt-2 text-xs">
                      {item.matchType} match ({(item.matchConfidence * 100).toFixed(0)}%)
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Traffic Source Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart: Traffic by Medium */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Traffic by Channel</CardTitle>
          </CardHeader>
          <CardContent>
            {sourcesLoading ? (
              <div className="flex items-center justify-center h-[300px]">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : donutData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {donutData.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatNumber(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
                No traffic data available.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bar Chart: Social Platform Referrals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Social Platform Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            {sourcesLoading ? (
              <div className="flex items-center justify-center h-[300px]">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : socialBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={socialBarData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="source" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip formatter={(v: number) => formatNumber(v)} />
                  <Bar dataKey="sessions" fill="#3b82f6" name="Sessions" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="users" fill="#22c55e" name="Users" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
                No social referral data available.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
