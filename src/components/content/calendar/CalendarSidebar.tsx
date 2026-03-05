import { useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { GetLatePost } from "@/lib/api/getlate";
import { parseISO, differenceInHours, formatDistanceToNowStrict } from "date-fns";
import { AlertTriangle, Clock, GripVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { platformConfig, isTimeSensitive } from "./CalendarCard";

function SidebarDraggableCard({ post }: { post: GetLatePost }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: post.id });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  const resolvedPlatform = post.platformResults?.[0]?.platform || "twitter";
  const pConfig = platformConfig[resolvedPlatform] || platformConfig.twitter;
  const PlatformIcon = pConfig.icon;
  const thumbnail = post.mediaItems?.[0]?.thumbnailUrl || post.mediaItems?.[0]?.url;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group flex items-center gap-2 rounded-lg border bg-card p-2 text-xs cursor-grab transition-all",
        "hover:shadow-sm hover:border-border/80",
        isDragging && "opacity-40",
      )}
    >
      <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground" />
      {thumbnail ? (
        <img src={thumbnail} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted">
          <PlatformIcon className={cn("h-3.5 w-3.5", pConfig.color)} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 font-medium leading-tight">{post.text?.slice(0, 60) || "Untitled"}</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">Drag to schedule</p>
      </div>
    </div>
  );
}

interface UrgentCardProps {
  post: GetLatePost;
  onClick: (post: GetLatePost) => void;
}

function UrgentCard({ post, onClick }: UrgentCardProps) {
  const resolvedPlatform = post.platformResults?.[0]?.platform || "twitter";
  const pConfig = platformConfig[resolvedPlatform] || platformConfig.twitter;
  const PlatformIcon = pConfig.icon;
  const thumbnail = post.mediaItems?.[0]?.thumbnailUrl || post.mediaItems?.[0]?.url;

  let urgencyLabel = "";
  let urgencyColor = "text-amber-600 dark:text-amber-400";

  if (post.status === "failed") {
    urgencyLabel = "Failed";
    urgencyColor = "text-red-600 dark:text-red-400";
  } else if (post.scheduledFor) {
    const hoursUntil = differenceInHours(parseISO(post.scheduledFor), new Date());
    if (hoursUntil < 0) {
      urgencyLabel = "Overdue";
      urgencyColor = "text-red-600 dark:text-red-400";
    } else {
      urgencyLabel = `in ${formatDistanceToNowStrict(parseISO(post.scheduledFor))}`;
    }
  }

  return (
    <button
      onClick={() => onClick(post)}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg border p-2 text-left text-xs transition-all",
        "hover:shadow-sm hover:border-border/80",
        post.status === "failed"
          ? "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20"
          : "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20",
      )}
    >
      {thumbnail ? (
        <img src={thumbnail} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted">
          <PlatformIcon className={cn("h-3.5 w-3.5", pConfig.color)} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 font-medium leading-tight">{post.text?.slice(0, 60) || "Untitled"}</p>
        <div className="mt-0.5 flex items-center gap-1">
          <span className={cn("text-[10px] font-semibold", urgencyColor)}>{urgencyLabel}</span>
          {post.status !== "failed" && (
            <>
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className="text-[10px] capitalize text-muted-foreground">{post.status}</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}

interface CalendarSidebarProps {
  posts: GetLatePost[];
  onPostClick: (post: GetLatePost) => void;
  open?: boolean;
  onClose?: () => void;
}

export function CalendarSidebar({ posts, onPostClick, open, onClose }: CalendarSidebarProps) {
  const needsAttention = useMemo(() => {
    return posts
      .filter((p) => isTimeSensitive(p))
      .sort((a, b) => {
        // Failed first, then by urgency
        if (a.status === "failed" && b.status !== "failed") return -1;
        if (b.status === "failed" && a.status !== "failed") return 1;
        const aTime = a.scheduledFor ? parseISO(a.scheduledFor).getTime() : Infinity;
        const bTime = b.scheduledFor ? parseISO(b.scheduledFor).getTime() : Infinity;
        return aTime - bTime;
      });
  }, [posts]);

  const unscheduledDrafts = useMemo(() => {
    return posts.filter((p) => p.status === "draft" && !p.scheduledFor);
  }, [posts]);

  return (
    <div
      className={cn(
        "absolute right-0 top-0 bottom-0 z-30 flex w-[300px] flex-col border-l bg-background shadow-xl transition-transform duration-200",
        open ? "translate-x-0" : "translate-x-full",
      )}
    >
      {/* Header with close button */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h3 className="text-sm font-semibold">Sidebar</h3>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {/* Needs Attention */}
      <div className="border-b p-3">
        <div className="mb-2 flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          <h4 className="text-xs font-semibold">Needs Attention</h4>
          {needsAttention.length > 0 && (
            <span className="ml-auto rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
              {needsAttention.length}
            </span>
          )}
        </div>
        {needsAttention.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">All clear — no urgent posts.</p>
        ) : (
          <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
            {needsAttention.map((post) => (
              <UrgentCard key={post.id} post={post} onClick={onPostClick} />
            ))}
          </div>
        )}
      </div>

      {/* Unscheduled Drafts */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="mb-2 flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <h4 className="text-xs font-semibold">Unscheduled Drafts</h4>
          {unscheduledDrafts.length > 0 && (
            <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {unscheduledDrafts.length}
            </span>
          )}
        </div>
        {unscheduledDrafts.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No unscheduled drafts.</p>
        ) : (
          <div className="space-y-1.5">
            {unscheduledDrafts.map((post) => (
              <SidebarDraggableCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
