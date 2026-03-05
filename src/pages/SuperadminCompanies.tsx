import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CompaniesTab } from '@/components/admin/CompaniesTab';

export default function SuperadminCompanies() {
  return (
    <DashboardLayout>
      <CompaniesTab />
    </DashboardLayout>
  );
}
