import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileTab } from "@/components/settings/ProfileTab";
import { CompanyTab } from "@/components/settings/CompanyTab";
import { NotificationsTab } from "@/components/settings/NotificationsTab";
import { BrandVoiceTabV2 } from "@/components/settings/BrandVoiceTabV2";
import { BrandVoiceTab } from "@/components/settings/BrandVoiceTab";
import { OgSettingsTab } from "@/components/settings/OgSettingsTab";
import { useUserRole } from "@/hooks/useCompany";
import { User, Building2, Bell, Volume2, Image } from "lucide-react";
import { useSearchParams } from "react-router-dom";

export default function SettingsPage() {
  const { data: userRole } = useUserRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';
  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />Profile
            </TabsTrigger>
            {isOwnerOrAdmin && (
              <TabsTrigger value="company" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />Company
              </TabsTrigger>
            )}
            {isOwnerOrAdmin && (
              <TabsTrigger value="voice" className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />Voice V1
              </TabsTrigger>
            )}
            {isOwnerOrAdmin && (
              <TabsTrigger value="voice-v2" className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />Voice V2
              </TabsTrigger>
            )}
            {isOwnerOrAdmin && (
              <TabsTrigger value="og-images" className="flex items-center gap-2">
                <Image className="h-4 w-4" />OG Images
              </TabsTrigger>
            )}
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />Notifications
            </TabsTrigger>
          </TabsList>
          <TabsContent value="profile"><ProfileTab /></TabsContent>
          {isOwnerOrAdmin && <TabsContent value="company"><CompanyTab /></TabsContent>}
          {isOwnerOrAdmin && <TabsContent value="voice"><BrandVoiceTab /></TabsContent>}
          {isOwnerOrAdmin && <TabsContent value="voice-v2"><BrandVoiceTabV2 /></TabsContent>}
          {isOwnerOrAdmin && <TabsContent value="og-images"><OgSettingsTab /></TabsContent>}
          <TabsContent value="notifications"><NotificationsTab /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
