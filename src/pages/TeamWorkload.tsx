import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ActivityFeed } from '@/components/inbox/ActivityFeed';
import { useTeamWorkload } from '@/hooks/useTeamWorkload';
import { useTeamMetrics } from '@/hooks/useTeamMetrics';
import { Loader2, Users, MessageSquare, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#22c55e',
  neutral: '#94a3b8',
  negative: '#ef4444',
  mixed: '#f59e0b',
};

function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function WorkloadTab() {
  const { data: workloads, isLoading } = useTeamWorkload();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!workloads?.length) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">No team members found</p>
        <p className="text-sm mt-1">Add team members in Settings to see workload data.</p>
      </div>
    );
  }

  const chartData = workloads.map(m => ({
    name: m.fullName.split(' ')[0],
    assigned: m.assignedCount,
    open: m.openCount,
    resolved: m.resolvedToday,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Member cards + chart */}
      <div className="lg:col-span-2 space-y-6">
        {/* Member cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {workloads.map(member => (
            <Card key={member.userId}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {getInitials(member.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{member.fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-2">
                    <p className="text-lg font-bold text-blue-600">{member.assignedCount}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Assigned</p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2">
                    <p className="text-lg font-bold text-amber-600">{member.openCount}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Open</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-2">
                    <p className="text-lg font-bold text-green-600">{member.resolvedToday}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Today</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assignments per Member</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="assigned" name="Assigned" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="open" name="Open" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="resolved" name="Resolved Today" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right: Activity Feed */}
      <div className="lg:col-span-1">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ActivityFeed limit={30} className="max-h-[600px] overflow-y-auto px-4 pb-4" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricsTab() {
  const [days, setDays] = useState(30);
  const { data: metrics, isLoading } = useTeamMetrics(days);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No metrics data available.</p>
      </div>
    );
  }

  const sentimentData = Object.entries(metrics.sentimentDistribution).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    fill: SENTIMENT_COLORS[name] || '#94a3b8',
  }));

  return (
    <div className="space-y-6">
      {/* Time range selector */}
      <div className="flex gap-2">
        {[7, 30, 90].map(d => (
          <Button
            key={d}
            variant={days === d ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDays(d)}
          >
            {d}d
          </Button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <MessageSquare className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{metrics.totalConversations}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertCircle className="h-6 w-6 mx-auto mb-2 text-amber-500" />
            <p className="text-2xl font-bold">{metrics.openCount}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Open</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{metrics.resolvedCount}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Resolved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold">
              {metrics.avgResponseTimeMinutes != null ? `${metrics.avgResponseTimeMinutes}m` : '--'}
            </p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Response</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sentiment distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sentiment Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {sentimentData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {sentimentData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No sentiment data</p>
            )}
          </CardContent>
        </Card>

        {/* Per-member breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Per-Member Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.perMember.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium text-muted-foreground">Member</th>
                      <th className="pb-2 font-medium text-muted-foreground text-right">Assigned</th>
                      <th className="pb-2 font-medium text-muted-foreground text-right">Resolved</th>
                      <th className="pb-2 font-medium text-muted-foreground text-right">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.perMember.map(m => (
                      <tr key={m.userId} className="border-b last:border-0">
                        <td className="py-2 font-medium">{m.name || 'Unknown'}</td>
                        <td className="py-2 text-right">{m.assigned}</td>
                        <td className="py-2 text-right">{m.resolved}</td>
                        <td className="py-2 text-right">
                          {m.assigned > 0 ? `${Math.round((m.resolved / m.assigned) * 100)}%` : '--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No member data</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function TeamWorkload() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Team Workload</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor team assignments, activity, and performance metrics.
          </p>
        </div>

        <Tabs defaultValue="workload" className="space-y-4">
          <TabsList>
            <TabsTrigger value="workload">Workload</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="workload">
            <WorkloadTab />
          </TabsContent>

          <TabsContent value="metrics">
            <MetricsTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
