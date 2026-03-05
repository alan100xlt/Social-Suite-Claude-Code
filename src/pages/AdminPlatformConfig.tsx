import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlatformBrandingTab } from "@/components/admin/PlatformBrandingTab";
import { EmailBrandingTab } from "@/components/settings/EmailBrandingTab";
import { Palette, Mail } from "lucide-react";
import { useSearchParams } from "react-router-dom";

export default function AdminPlatformConfig() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'branding';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Platform Config</h1>
          <p className="text-muted-foreground mt-1">Configure platform identity, branding, and email templates</p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="branding" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />Branding
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />Email
            </TabsTrigger>
          </TabsList>
          <TabsContent value="branding"><PlatformBrandingTab /></TabsContent>
          <TabsContent value="email"><EmailBrandingTab /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
