import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArticlesTab } from '@/components/content/ArticlesTab';
import { FeedsTab } from '@/components/content/FeedsTab';
import { ComposeTab } from '@/components/posts/ComposeTab';
import { CalendarTab } from '@/components/posts/CalendarTab';
import { AutomationsContent } from '@/components/content/AutomationsContent';
import { AutomationLogsContent } from '@/components/content/AutomationLogsContent';
import { Newspaper, PenSquare, Rss, Zap, ClipboardList, Calendar } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useCompany } from '@/hooks/useCompany';

export default function ContentPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'articles';
  const draftId = searchParams.get('draft') || null;
  const { data: company } = useCompany();

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  const handleOpenDraft = (id: string) => {
    setSearchParams({ tab: 'posts', draft: id }, { replace: true });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Content</h1>
          <p className="text-muted-foreground mt-1">Manage your articles, social posts, feeds and automations</p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="articles" className="flex items-center gap-2">
              <Newspaper className="h-4 w-4" />Articles
            </TabsTrigger>
            <TabsTrigger value="posts" className="flex items-center gap-2">
              <PenSquare className="h-4 w-4" />Social Posts
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />Calendar
            </TabsTrigger>
            <TabsTrigger value="feeds" className="flex items-center gap-2">
              <Rss className="h-4 w-4" />Feeds
            </TabsTrigger>
            <TabsTrigger value="automations" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />Automations
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="articles">
            <ArticlesTab />
          </TabsContent>
          <TabsContent value="posts">
            <ComposeTab key={company?.id || 'no-company'} draftId={draftId} onOpenDraft={handleOpenDraft} />
          </TabsContent>
          <TabsContent value="calendar">
            <CalendarTab />
          </TabsContent>
          <TabsContent value="feeds">
            <FeedsTab />
          </TabsContent>
          <TabsContent value="automations">
            <AutomationsContent />
          </TabsContent>
          <TabsContent value="logs">
            <AutomationLogsContent />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
