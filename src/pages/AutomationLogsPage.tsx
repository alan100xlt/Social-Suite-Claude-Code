import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AutomationLogsContent } from "@/components/content/AutomationLogsContent";
import { ScrollText } from "lucide-react";

export default function AutomationLogsPage() {
  return (
    <DashboardLayout>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 border-b px-6 py-3">
          <ScrollText className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-bold">Automation Logs</h1>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <AutomationLogsContent />
        </div>
      </div>
    </DashboardLayout>
  );
}
