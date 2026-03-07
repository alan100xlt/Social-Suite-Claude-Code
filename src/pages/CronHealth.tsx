import { useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Activity, Settings, RefreshCw } from 'lucide-react';
import { IssuesTab } from '@/components/admin/ops/IssuesTab';
import { PerformanceTab } from '@/components/admin/ops/PerformanceTab';
import { ConfigurationTab } from '@/components/admin/ops/ConfigurationTab';

export default function CronHealth() {
  const queryClient = useQueryClient();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">System Health</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Unified monitoring for cron jobs, sync pipelines, API health, and AI classification
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['cron-health-logs'] });
              queryClient.invalidateQueries({ queryKey: ['admin-ai-health'] });
              queryClient.invalidateQueries({ queryKey: ['admin-sync-state'] });
              queryClient.invalidateQueries({ queryKey: ['admin-api-errors-24h'] });
              queryClient.invalidateQueries({ queryKey: ['admin-sync-cron-logs'] });
              queryClient.invalidateQueries({ queryKey: ['cron-job-settings'] });
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* 3-Tab Layout */}
        <Tabs defaultValue="issues">
          <TabsList>
            <TabsTrigger value="issues" className="gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> Issues
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-1.5">
              <Activity className="h-3.5 w-3.5" /> Performance
            </TabsTrigger>
            <TabsTrigger value="configuration" className="gap-1.5">
              <Settings className="h-3.5 w-3.5" /> Configuration
            </TabsTrigger>
          </TabsList>

          <TabsContent value="issues" className="mt-4">
            <IssuesTab />
          </TabsContent>

          <TabsContent value="performance" className="mt-4">
            <PerformanceTab />
          </TabsContent>

          <TabsContent value="configuration" className="mt-4">
            <ConfigurationTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
