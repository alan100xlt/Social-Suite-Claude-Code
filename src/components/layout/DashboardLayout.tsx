import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ImpersonationBanner } from "./ImpersonationBanner";
import { EarlyAccessBanner } from "./EarlyAccessBanner";
import { SyncProgressBanner } from "@/components/inbox/SyncProgressBanner";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <EarlyAccessBanner />
        <ImpersonationBanner />
        <SyncProgressBanner />
        <TopBar />
        <main className="flex-1 overflow-auto">
          <div className="p-6 lg:p-8 pb-24">{children}</div>
        </main>
      </div>
    </div>
  );
}
