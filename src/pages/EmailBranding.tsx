import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { EmailBrandingTab } from "@/components/settings/EmailBrandingTab";

export default function EmailBrandingPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Email Branding</h1>
          <p className="text-muted-foreground mt-1">Configure global email templates, colors, and sender details</p>
        </div>
        <EmailBrandingTab />
      </div>
    </DashboardLayout>
  );
}
