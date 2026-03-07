import { useMemo } from "react";
import { useInboxConversations } from "@/hooks/useInboxConversations";
import { ChartCard } from "@/components/analytics-v2/widgets-v2/ChartCard";
import { getPremiumSeries } from "@/components/analytics-v2/widgets-v2/premium-theme";
import { Skeleton } from "@/components/ui/skeleton";
import { Inbox, Mail, Clock, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function InboxSummaryWidget() {
  const navigate = useNavigate();
  const { data: conversations, isLoading } = useInboxConversations();
  const series = getPremiumSeries();

  const stats = useMemo(() => {
    if (!conversations?.length) {
      return { unread: 0, unresponded: 0, dms: 0, comments: 0, total: 0 };
    }

    let unread = 0;
    let unresponded = 0;
    let dms = 0;
    let comments = 0;

    for (const c of conversations) {
      if (c.unread_count > 0) unread++;
      // Unresponded: open conversations where we haven't replied (approximated by unread + open)
      if (c.status === "open" && c.unread_count > 0) unresponded++;
      if (c.type === "dm") dms++;
      if (c.type === "comment") comments++;
    }

    return { unread, unresponded, dms, comments, total: conversations.length };
  }, [conversations]);

  const dmPercent = stats.total > 0 ? Math.round((stats.dms / stats.total) * 100) : 0;
  const commentPercent = stats.total > 0 ? 100 - dmPercent : 0;

  if (isLoading) {
    return (
      <ChartCard accentColor={series[4]} accentColorEnd={series[5]}>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-6 w-10" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard accentColor={series[4]} accentColorEnd={series[5]}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Inbox className="w-4 h-4 text-muted-foreground" />
          <h3
            className="font-semibold text-sm tracking-tight text-card-foreground"
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
          >
            Inbox
          </h3>
        </div>
        <button
          onClick={() => navigate("/app/inbox")}
          className="text-[11px] font-medium text-primary hover:underline"
        >
          Open Inbox
        </button>
      </div>

      {stats.total === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-3">
            <Inbox className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">No conversations yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Messages will appear here</p>
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Mail className="w-3 h-3 text-muted-foreground/70" />
              </div>
              <p
                className="text-xl font-bold text-card-foreground"
                style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
              >
                {stats.unread}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Unread</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="w-3 h-3 text-muted-foreground/70" />
              </div>
              <p
                className="text-xl font-bold text-card-foreground"
                style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
              >
                {stats.unresponded}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Awaiting</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <MessageSquare className="w-3 h-3 text-muted-foreground/70" />
              </div>
              <p
                className="text-xl font-bold text-card-foreground"
                style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
              >
                {stats.total}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
            </div>
          </div>

          {/* Type breakdown bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                DMs vs Comments
              </span>
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {stats.dms} / {stats.comments}
              </span>
            </div>
            <div className="flex h-2 w-full rounded-full overflow-hidden bg-muted/50">
              {dmPercent > 0 && (
                <div
                  className="h-full rounded-l-full transition-all duration-500"
                  style={{ width: `${dmPercent}%`, background: series[4] }}
                />
              )}
              {commentPercent > 0 && (
                <div
                  className="h-full rounded-r-full transition-all duration-500"
                  style={{ width: `${commentPercent}%`, background: series[5] }}
                />
              )}
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: series[4] }} />
                <span className="text-[10px] text-muted-foreground">DMs</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: series[5] }} />
                <span className="text-[10px] text-muted-foreground">Comments</span>
              </div>
            </div>
          </div>
        </>
      )}
    </ChartCard>
  );
}
