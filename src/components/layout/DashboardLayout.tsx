import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ImpersonationBanner } from "./ImpersonationBanner";
import { EarlyAccessBanner } from "./EarlyAccessBanner";
import { SyncProgressBanner } from "@/components/inbox/SyncProgressBanner";

interface DashboardLayoutProps {
  children: ReactNode;
  noPadding?: boolean;
}

export function DashboardLayout({ children, noPadding }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <EarlyAccessBanner />
        <ImpersonationBanner />
        <SyncProgressBanner />
        <TopBar />
        <main className={`flex-1 min-h-0 flex flex-col ${noPadding ? 'overflow-hidden' : 'overflow-auto'}`}>
          {noPadding ? children : <div className="p-6 lg:p-8 pb-24">{children}</div>}
        </main>
      </div>
    </div>
  );
}
