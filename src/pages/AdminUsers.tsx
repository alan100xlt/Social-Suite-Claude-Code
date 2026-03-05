import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { UsersTab } from '@/components/admin/UsersTab';

export default function AdminUsers() {
  return (
    <DashboardLayout>
      <UsersTab />
    </DashboardLayout>
  );
}
