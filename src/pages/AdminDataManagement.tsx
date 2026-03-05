import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompaniesTab } from "@/components/admin/CompaniesTab";
import { UsersTab } from "@/components/admin/UsersTab";
import { Building2, Users } from "lucide-react";
import { useSearchParams } from "react-router-dom";

export default function AdminDataManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'companies';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Data Management</h1>
          <p className="text-muted-foreground mt-1">Manage companies, users, and platform data</p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="companies" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />Companies
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />Users
            </TabsTrigger>
          </TabsList>
          <TabsContent value="companies"><CompaniesTab /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
