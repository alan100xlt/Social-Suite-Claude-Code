import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ComposeTab } from "@/components/posts/ComposeTab";
import { CalendarTab } from "@/components/posts/CalendarTab";
import { PenSquare, Calendar } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useCompany } from "@/hooks/useCompany";

export default function PostsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'compose';
  const draftId = searchParams.get('draft') || null;
  const { data: company } = useCompany();

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  const handleOpenDraft = (id: string) => {
    setSearchParams({ tab: 'compose', draft: id }, { replace: true });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Posts</h1>
          <p className="text-muted-foreground mt-1">Craft, schedule, and manage your content</p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="compose" className="flex items-center gap-2">
              <PenSquare className="h-4 w-4" />Compose
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />Calendar
            </TabsTrigger>
          </TabsList>
          <TabsContent value="compose">
            <ComposeTab key={company?.id || 'no-company'} draftId={draftId} onOpenDraft={handleOpenDraft} />
          </TabsContent>
          <TabsContent value="calendar"><CalendarTab /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}