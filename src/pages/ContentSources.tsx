import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FeedsTab } from "@/components/content/FeedsTab";
import { Rss } from "lucide-react";

export default function ContentSources() {
  return (
    <DashboardLayout>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 border-b px-6 py-3">
          <Rss className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-bold">Content Sources</h1>
          <p className="text-sm text-muted-foreground">
            Manage RSS feeds and automation rules
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <FeedsTab />
        </div>
      </div>
    </DashboardLayout>
  );
}
