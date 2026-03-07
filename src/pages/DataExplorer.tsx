import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DataExplorerTab } from '@/components/admin/ops/DataExplorerTab';

export default function DataExplorer() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Data Explorer</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Browse and query Supabase tables directly
          </p>
        </div>
        <DataExplorerTab />
      </div>
    </DashboardLayout>
  );
}
