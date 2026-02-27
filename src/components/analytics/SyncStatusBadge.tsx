import { RefreshCw, Clock } from "lucide-react";
import { format, addHours, differenceInMinutes } from "date-fns";

interface SyncStatusBadgeProps {
  lastSyncAt: string | null;
  isLoading?: boolean;
}

export function SyncStatusBadge({
  lastSyncAt,
  isLoading = false,
}: SyncStatusBadgeProps) {
  // Calculate next hourly sync time
  const getNextSyncInfo = () => {
    if (!lastSyncAt) return { nextSyncTime: null, minutesUntil: null };
    const lastSync = new Date(lastSyncAt);
    const nextSync = addHours(lastSync, 1);
    const now = new Date();
    
    // If next sync is in the past, next one is at the top of the next hour
    if (nextSync < now) {
      const nextHour = new Date(now);
      nextHour.setMinutes(0, 0, 0);
      nextHour.setHours(nextHour.getHours() + 1);
      return { 
        nextSyncTime: nextHour, 
        minutesUntil: differenceInMinutes(nextHour, now) 
      };
    }
    
    return { 
      nextSyncTime: nextSync, 
      minutesUntil: differenceInMinutes(nextSync, now) 
    };
  };

  const { minutesUntil } = getNextSyncInfo();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm bg-muted/50 text-muted-foreground px-3 py-1.5 rounded-lg">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span>Loading sync status...</span>
      </div>
    );
  }

  // Format the last sync date and time
  const formatLastSync = () => {
    if (!lastSyncAt) return null;
    const date = new Date(lastSyncAt);
    return format(date, "MMM d, yyyy 'at' h:mm a");
  };

  const lastSyncFormatted = formatLastSync();

  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg">
      <Clock className="w-3.5 h-3.5" />
      <span>
        {lastSyncFormatted 
          ? `Data last synced at: ${lastSyncFormatted}. Next sync in about ${minutesUntil !== null ? minutesUntil : 60} minutes`
          : "No sync data yet. Next sync in about 60 minutes"
        }
      </span>
    </div>
  );
}
