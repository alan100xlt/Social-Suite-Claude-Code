import { useState, useMemo } from "react";
import { usePosts } from "@/hooks/useGetLatePosts";
import { usePostDrafts } from "@/hooks/usePostDrafts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, ChevronDown, BarChart3, CheckCircle, FileEdit } from "lucide-react";
import { FaInstagram, FaTwitter, FaLinkedin, FaFacebook, FaTiktok } from "react-icons/fa";
import { SiBluesky } from "react-icons/si";
import { formatDistanceToNowStrict } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { ChartCard } from "@/components/analytics-v2/widgets-v2/ChartCard";
import { getPremiumSeries } from "@/components/analytics-v2/widgets-v2/premium-theme";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TimelineItem {
  id: string;
  rawId: string;
  type: "scheduled" | "approval" | "draft";
  time: Date;
  content: string;
  platforms: string[];
  approvalToken?: string;
  thumbnailUrl?: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const platformIcons: Record<string, React.ElementType> = {
  instagram: FaInstagram,
  twitter: FaTwitter,
  linkedin: FaLinkedin,
  facebook: FaFacebook,
  tiktok: FaTiktok,
  bluesky: SiBluesky,
};

/** Compact relative-time label: "2h", "5d", "3mo" */
function relativeTime(date: Date): string {
  const raw = formatDistanceToNowStrict(date, { addSuffix: false });
  // formatDistanceToNowStrict returns e.g. "2 hours", "5 days", "3 months", "1 minute"
  const parts = raw.split(" ");
  if (parts.length < 2) return raw;
  const value = parts[0];
  const unit = parts[1];

  const unitMap: Record<string, string> = {
    second: "s",
    seconds: "s",
    minute: "m",
    minutes: "m",
    hour: "h",
    hours: "h",
    day: "d",
    days: "d",
    month: "mo",
    months: "mo",
    year: "y",
    years: "y",
  };

  return `${value}${unitMap[unit] || unit}`;
}

const COLLAPSED_COUNT = 5;
const EXPANDED_COUNT = 12;

// ---------------------------------------------------------------------------
// Type config
// ---------------------------------------------------------------------------

const typeConfig = {
  scheduled: { label: "Scheduled", badgeClass: "bg-primary/15 text-primary" },
  approval: { label: "Approval", badgeClass: "bg-warning/15 text-warning" },
  draft: { label: "Draft", badgeClass: "bg-muted text-muted-foreground" },
} as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ActivityTimeline() {
  const navigate = useNavigate();
  const { data: company } = useCompany();
  const companyId = company?.id;
  const [expanded, setExpanded] = useState(false);

  // ---- Data fetching ----

  const { data: scheduledPosts, isLoading: postsLoading } = usePosts({
    status: "scheduled",
  });

  const { data: drafts, isLoading: draftsLoading } = usePostDrafts();

  const { data: pendingApprovals, isLoading: approvalsLoading } = useQuery({
    queryKey: ["pending-approvals-activity", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("post_approvals")
        .select(
          "id, created_at, platform_contents, selected_account_ids, status, expires_at, token"
        )
        .eq("company_id", companyId)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) return [];
      return data || [];
    },
    enabled: !!companyId,
  });

  const isLoading = postsLoading || draftsLoading || approvalsLoading;

  // ---- Merge & sort ----

  const allItems = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];

    for (const post of scheduledPosts || []) {
      if (post.scheduledFor) {
        items.push({
          id: `sched-${post.id}`,
          rawId: post.id,
          type: "scheduled",
          time: new Date(post.scheduledFor),
          content: post.text?.slice(0, 120) || "Scheduled post",
          platforms: post.platformResults?.map((p) => p.platform) || [],
          thumbnailUrl: post.mediaItems?.[0]?.url || null,
        });
      }
    }

    for (const approval of pendingApprovals || []) {
      const contents = approval.platform_contents as Record<string, { content?: string; text?: string }> | Array<{ content?: string }>;
      let preview = "Post awaiting approval";
      if (Array.isArray(contents) && contents.length > 0) {
        preview = contents[0]?.content?.slice(0, 120) || preview;
      } else if (
        contents &&
        typeof contents === "object" &&
        !Array.isArray(contents)
      ) {
        const firstKey = Object.keys(contents)[0];
        if (firstKey) {
          preview =
            (contents[firstKey]?.content || contents[firstKey]?.text)?.slice(
              0,
              120
            ) || preview;
        }
      }
      items.push({
        id: `approval-${approval.id}`,
        rawId: approval.id,
        type: "approval",
        time: new Date(approval.created_at),
        content: preview,
        platforms: [],
        approvalToken: approval.token,
      });
    }

    for (const draft of (drafts || []).slice(0, 5)) {
      items.push({
        id: `draft-${draft.id}`,
        rawId: draft.id,
        type: "draft",
        time: new Date(draft.updated_at || draft.created_at),
        content: draft.title || "Untitled draft",
        platforms:
          (draft.selected_account_ids || []).length > 0 ? ["multiple"] : [],
        thumbnailUrl: draft.image_url || null,
      });
    }

    items.sort((a, b) => a.time.getTime() - b.time.getTime());
    return items;
  }, [scheduledPosts, pendingApprovals, drafts]);

  const limit = expanded ? EXPANDED_COUNT : COLLAPSED_COUNT;
  const displayItems = allItems.slice(0, limit);
  const hasMore = allItems.length > COLLAPSED_COUNT && !expanded;

  // ---- Navigation ----

  const handleItemClick = (item: TimelineItem) => {
    switch (item.type) {
      case "scheduled":
        navigate("/app/content?tab=calendar");
        break;
      case "draft":
        navigate(`/app/content?tab=posts&draft=${item.rawId}`);
        break;
      case "approval":
        if (item.approvalToken) {
          navigate(`/approve/${item.approvalToken}`);
        }
        break;
    }
  };

  // ---- Accent colors ----

  const series = getPremiumSeries();
  const accent1 = series[2]; // teal
  const accent2 = series[3]; // amber

  // ---- Render ----

  return (
    <ChartCard
      accentColor={accent1}
      accentColorEnd={accent2}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3
          className="font-semibold text-sm tracking-tight text-card-foreground"
          style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
        >
          Activity Timeline
        </h3>
        {allItems.length > 0 && (
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {allItems.length} item{allItems.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="w-10 h-3 rounded" />
              <Skeleton className="w-2 h-2 rounded-full mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : displayItems.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-3">
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Nothing scheduled
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Time to plan some content!
          </p>
        </div>
      ) : (
        /* Timeline */
        <div className="space-y-0">
          {displayItems.map((item, idx) => {
            const config = typeConfig[item.type];
            const isLast = idx === displayItems.length - 1 && !hasMore;

            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => handleItemClick(item)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleItemClick(item);
                  }
                }}
                className="group flex items-start gap-0 cursor-pointer rounded-lg transition-colors -mx-1 px-1"
              >
                {/* Time label */}
                <span className="w-10 flex-shrink-0 text-[11px] tabular-nums text-muted-foreground pt-[3px] text-right pr-3 select-none">
                  {relativeTime(item.time)}
                </span>

                {/* Rail: dot + line */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full mt-[5px] transition-transform duration-150 group-hover:scale-125",
                      item.type === "scheduled" && "bg-primary",
                      item.type === "approval" && "bg-warning",
                      item.type === "draft" &&
                        "bg-transparent border-[1.5px] border-muted-foreground/60"
                    )}
                  />
                  {!isLast && (
                    <div className="w-px flex-1 bg-border/60 min-h-[32px]" />
                  )}
                </div>

                {/* Content */}
                <div
                  className={cn(
                    "flex-1 min-w-0 pl-3 pb-4 rounded-md transition-colors",
                    "group-hover:bg-muted/40",
                    isLast && !hasMore && "pb-1"
                  )}
                >
                  <div className="flex gap-2.5">
                    {/* Thumbnail */}
                    {item.thumbnailUrl && (
                      <img
                        src={item.thumbnailUrl}
                        alt=""
                        className="w-10 h-10 rounded-md object-cover flex-shrink-0 mt-0.5"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] border-0 py-0 h-4 font-medium",
                            config.badgeClass
                          )}
                        >
                          {config.label}
                        </Badge>
                        {item.platforms
                          .filter((p) => p !== "multiple")
                          .slice(0, 3)
                          .map((p, pi) => {
                            const PIcon = platformIcons[p];
                            return PIcon ? (
                              <PIcon
                                key={pi}
                                className="w-3 h-3 text-muted-foreground/70"
                              />
                            ) : null;
                          })}
                      </div>
                      <p className="text-sm text-card-foreground/90 line-clamp-2 leading-snug">
                        {item.content}
                      </p>
                    </div>
                    {/* Action button — right aligned */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleItemClick(item);
                      }}
                      className={cn(
                        "flex-shrink-0 self-center inline-flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-1.5 transition-colors",
                        item.type === "scheduled" && "bg-primary/10 text-primary hover:bg-primary/20",
                        item.type === "approval" && "bg-warning/10 text-warning hover:bg-warning/20",
                        item.type === "draft" && "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {item.type === "scheduled" && (
                        <>
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Analytics</span>
                        </>
                      )}
                      {item.type === "approval" && (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Approve</span>
                        </>
                      )}
                      {item.type === "draft" && (
                        <>
                          <FileEdit className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Edit</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Load more */}
          {hasMore && (
            <div className="flex items-start gap-0">
              {/* Spacer for time column */}
              <span className="w-10 flex-shrink-0" />

              {/* Dotted rail */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="flex flex-col items-center gap-1 py-1">
                  <div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                  <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                  <div className="w-1 h-1 rounded-full bg-muted-foreground/20" />
                </div>
              </div>

              {/* Load more button */}
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="flex items-center gap-1.5 pl-3 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>
                  Load more ({Math.min(allItems.length, EXPANDED_COUNT) - COLLAPSED_COUNT})
                </span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </ChartCard>
  );
}
