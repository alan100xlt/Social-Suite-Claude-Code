import { Activity, Facebook, Instagram, Twitter, Linkedin, Youtube, ExternalLink, Database } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAccounts } from "@/hooks/useGetLateAccounts";
import { useCompany } from "@/hooks/useCompany";
import { useAnalyticsStats } from "@/hooks/useAnalyticsStats";
import { DataStatsDialog } from "@/components/analytics/DataStatsDialog";
import { format, addHours, differenceInMinutes, differenceInHours } from "date-fns";
import { cn } from "@/lib/utils";

type StatusType = 'success' | 'warning' | 'error';

interface StatusInfo {
  status: StatusType;
  message: string;
}

const platformIcons: Record<string, React.ElementType> = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
};

export function IntegrationStatusMenu() {
  const { data: company } = useCompany();
  const { data: accounts, isError: accountsError } = useAccounts();
  const analyticsStats = useAnalyticsStats();
  const lastSyncAt = analyticsStats.lastSyncAt;
  const syncLoading = analyticsStats.isLoading;
  const syncError = !!analyticsStats.error;
  const calculateStatus = (): StatusInfo => {
    // Red: No integration profile linked
    if (!company?.getlate_profile_id) {
      return { status: 'error', message: 'No integration profile linked' };
    }

    // Red: No accounts connected
    if (!accounts || accounts.length === 0) {
      return { status: 'error', message: 'No accounts connected' };
    }

    // Orange: Error fetching data
    if (accountsError || syncError) {
      return { status: 'warning', message: 'Unable to fetch status' };
    }

    // Orange: Awaiting first sync
    if (!lastSyncAt) {
      return { status: 'warning', message: 'Awaiting first sync' };
    }

    // Orange: Sync delayed (> 2 hours)
    const hoursSinceSync = differenceInHours(new Date(), new Date(lastSyncAt));
    if (hoursSinceSync > 2) {
      return { status: 'warning', message: 'Sync may be delayed' };
    }

    // Green: All systems healthy
    return { status: 'success', message: 'All systems healthy' };
  };

  const statusInfo = calculateStatus();

  const getStatusColor = (status: StatusType) => {
    switch (status) {
      case 'success': return 'bg-success';
      case 'warning': return 'bg-warning';
      case 'error': return 'bg-destructive';
    }
  };

  const getStatusTextColor = (status: StatusType) => {
    switch (status) {
      case 'success': return 'text-success';
      case 'warning': return 'text-warning';
      case 'error': return 'text-destructive';
    }
  };

  const getSyncInfo = () => {
    if (syncLoading) return { formatted: 'Loading...', nextSync: null };
    if (!lastSyncAt) return { formatted: 'No sync data yet', nextSync: 60 };

    const lastSyncDate = new Date(lastSyncAt);
    const formatted = format(lastSyncDate, "MMM d, yyyy 'at' h:mm a");

    const nextSync = addHours(lastSyncDate, 1);
    const now = new Date();
    let minutesUntil = differenceInMinutes(nextSync, now);

    if (minutesUntil <= 0) {
      const nextHour = new Date(now);
      nextHour.setMinutes(0, 0, 0);
      nextHour.setHours(nextHour.getHours() + 1);
      minutesUntil = differenceInMinutes(nextHour, now);
    }

    return { formatted, nextSync: minutesUntil };
  };

  const syncInfo = getSyncInfo();

  const getPlatformIcon = (platform: string) => {
    const Icon = platformIcons[platform.toLowerCase()] || Activity;
    return Icon;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Activity className="h-5 w-5" />
          <span 
            className={cn(
              "absolute top-1 right-1 h-2.5 w-2.5 rounded-full border-2 border-background",
              getStatusColor(statusInfo.status)
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold">Data Sync & Integrations</p>
        </div>

        <div className="p-4 space-y-4">
          {/* Status Section */}
          <div className="flex items-center gap-3">
            <span className={cn("h-3 w-3 rounded-full", getStatusColor(statusInfo.status))} />
            <span className={cn("text-sm font-medium", getStatusTextColor(statusInfo.status))}>
              {statusInfo.message}
            </span>
          </div>

          <Separator />

          {/* Sync Information */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Last Sync
            </p>
            <p className="text-sm">{syncInfo.formatted}</p>
            {syncInfo.nextSync !== null && (
              <p className="text-xs text-muted-foreground">
                Next sync in about {syncInfo.nextSync} minutes
              </p>
            )}
          </div>

          <Separator />

          {/* Synced Data Stats */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Synced Data
            </p>
            {analyticsStats.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : analyticsStats.uniquePosts > 0 ? (
              <div className="space-y-1">
                <p className="text-sm">
                  <span className="font-medium">{analyticsStats.uniquePosts}</span> posts across{" "}
                  <span className="font-medium">{analyticsStats.platformBreakdown.length}</span> platform
                  {analyticsStats.platformBreakdown.length !== 1 ? "s" : ""}
                </p>
                {analyticsStats.earliestDate && analyticsStats.latestDate && (
                  <p className="text-xs text-muted-foreground">
                    Data from {format(new Date(analyticsStats.earliestDate), "MMM d")} to{" "}
                    {format(new Date(analyticsStats.latestDate), "MMM d, yyyy")}
                  </p>
                )}
                <div className="flex flex-wrap gap-1 mt-1">
                  {analyticsStats.platformBreakdown.map((p) => (
                    <span 
                      key={p.platform} 
                      className="text-xs bg-muted px-1.5 py-0.5 rounded capitalize"
                    >
                      {p.platform}: {p.count}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No analytics data yet</p>
            )}
          </div>

          <Separator />

          {/* Connected Accounts */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Connected Accounts
            </p>
            {accounts && accounts.length > 0 ? (
              <ScrollArea className="max-h-24">
                <div className="space-y-2">
                  {accounts.map((account) => {
                    const Icon = getPlatformIcon(account.platform);
                    return (
                      <div key={account.id} className="flex items-center gap-2 text-sm">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="capitalize">{account.platform}</span>
                        <span className="text-muted-foreground">-</span>
                        <span className="truncate text-muted-foreground">
                          {account.username || account.displayName || 'Unknown'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground">No accounts connected</p>
            )}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-border space-y-2">
          <DataStatsDialog>
            <Button variant="outline" className="w-full" size="sm">
              <Database className="h-4 w-4 mr-2" />
              View Raw Data
            </Button>
          </DataStatsDialog>
          <Button asChild variant="outline" className="w-full" size="sm">
            <Link to="/app/connections" className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Manage Connections
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
