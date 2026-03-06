import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, RefreshCw, Activity, Webhook } from 'lucide-react';
import { InboxDataTab } from '@/components/admin/ops/InboxDataTab';
import { SyncStatusTab } from '@/components/admin/ops/SyncStatusTab';
import { ApiHealthTab } from '@/components/admin/ops/ApiHealthTab';
import { WebhookHealthTab } from '@/components/admin/ops/WebhookHealthTab';

const TABS = [
  { value: 'data', label: 'Inbox Data', icon: Database },
  { value: 'sync', label: 'Sync Status', icon: RefreshCw },
  { value: 'api', label: 'API Health', icon: Activity },
  { value: 'webhook', label: 'Webhook Health', icon: Webhook },
] as const;

export default function OperationsCenter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'data';

  const onTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">Operations Center</h1>
          <p className="text-muted-foreground">Monitor inbox data, sync health, API health, and the GetLate pipeline.</p>
        </div>

        <Tabs value={activeTab} onValueChange={onTabChange}>
          <TabsList>
            {TABS.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="data" className="mt-4">
            <InboxDataTab />
          </TabsContent>
          <TabsContent value="sync" className="mt-4">
            <SyncStatusTab />
          </TabsContent>
          <TabsContent value="api" className="mt-4">
            <ApiHealthTab />
          </TabsContent>
          <TabsContent value="webhook" className="mt-4">
            <WebhookHealthTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
