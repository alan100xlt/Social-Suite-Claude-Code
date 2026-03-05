import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSearchParams } from 'react-router-dom';
import { AutomationsContent } from '@/components/content/AutomationsContent';
import { AutomationLogsContent } from '@/components/content/AutomationLogsContent';

export default function AutomationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'rules';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Automations</h1>
          <p className="text-muted-foreground">
            Set up rules to automatically create and publish posts from your content
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })}>
          <TabsList>
            <TabsTrigger value="rules">Rules</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="mt-4">
            <AutomationsContent />
          </TabsContent>

          <TabsContent value="logs" className="mt-4">
            <AutomationLogsContent />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
