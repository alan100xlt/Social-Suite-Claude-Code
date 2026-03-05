import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { GetLatePost } from "@/lib/api/getlate";
import { format, parseISO, differenceInHours } from "date-fns";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { FaInstagram, FaTwitter, FaFacebook, FaLinkedin, FaTiktok, FaYoutube } from "react-icons/fa";
import { SiBluesky, SiThreads } from "react-icons/si";

const platformConfig: Record<string, { icon: React.ElementType; color: string; bg: string; border: string; dot: string }> = {
  instagram: { icon: FaInstagram, color: "text-pink-500", bg: "bg-pink-50 dark:bg-pink-950/30", border: "border-l-pink-500", dot: "bg-pink-500" },
  twitter: { icon: FaTwitter, color: "text-sky-500", bg: "bg-sky-50 dark:bg-sky-950/30", border: "border-l-sky-500", dot: "bg-sky-500" },
  facebook: { icon: FaFacebook, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-l-blue-600", dot: "bg-blue-600" },
  linkedin: { icon: FaLinkedin, color: "text-blue-700", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-l-blue-700", dot: "bg-blue-700" },
  tiktok: { icon: FaTiktok, color: "text-foreground", bg: "bg-gray-50 dark:bg-gray-900/30", border: "border-l-gray-500", dot: "bg-gray-500" },
  youtube: { icon: FaYoutube, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/30", border: "border-l-red-500", dot: "bg-red-500" },
  bluesky: { icon: SiBluesky, color: "text-sky-400", bg: "bg-sky-50 dark:bg-sky-950/30", border: "border-l-sky-400", dot: "bg-sky-400" },
  threads: { icon: SiThreads, color: "text-foreground", bg: "bg-gray-50 dark:bg-gray-900/30", border: "border-l-gray-500", dot: "bg-gray-500" },
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30" },
  scheduled: { label: "Scheduled", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
  published: { label: "Published", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  failed: { label: "Failed", color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30" },
  partial: { label: "Partial", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30" },
};

export function isTimeSensitive(post: GetLatePost): boolean {
  if (post.status === "failed") return true;
  if (post.status === "published") return false;
  if (!post.scheduledFor) return false;
  const hoursUntil = differenceInHours(parseISO(post.scheduledFor), new Date());
  if (post.status === "draft" && hoursUntil <= 48 && hoursUntil > 0) return true;
  if (post.status === "draft" && hoursUntil < 0) return true;
  if (hoursUntil <= 24 && hoursUntil > 0) return true;
  return false;
}

interface CalendarCardProps {
  post: GetLatePost;
  platform?: string;
  onClick: (post: GetLatePost) => void;
  isDragOverlay?: boolean;
  dimmed?: boolean;
}

export function CalendarCard({ post, platform, onClick, isDragOverlay, dimmed }: CalendarCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: post.id, disabled: isDragOverlay });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  const resolvedPlatform = platform || post.platformResults?.[0]?.platform || "twitter";
  const pConfig = platformConfig[resolvedPlatform] || platformConfig.twitter;
  const PlatformIcon = pConfig.icon;
  const sConfig = statusConfig[post.status] || statusConfig.draft;
  const thumbnail = post.mediaItems?.[0]?.thumbnailUrl || post.mediaItems?.[0]?.url;
  const priority = isTimeSensitive(post);

  const timeStr = post.scheduledFor
    ? format(parseISO(post.scheduledFor), "h:mm a")
    : post.publishedAt
    ? format(parseISO(post.publishedAt), "h:mm a")
    : null;

  const cardContent = (
    <div className="space-y-1">
      {/* Row 1: Platform icon + time + status dot */}
      <div className="flex items-center gap-1.5">
        <PlatformIcon className={cn("h-3.5 w-3.5 shrink-0", pConfig.color)} />
        {timeStr && (
          <span className="text-[11px] font-semibold text-foreground/70">{timeStr}</span>
        )}
        <span className={cn("ml-auto h-2 w-2 shrink-0 rounded-full", sConfig.bg.replace(/\s.*/, ""), pConfig.dot)} />
      </div>
      {/* Row 2-3: Text snippet */}
      <p className="text-[11px] leading-snug text-foreground/80 line-clamp-2 font-medium">
        {post.text?.slice(0, 120) || "Untitled post"}
      </p>
    </div>
  );

  const cardClasses = cn(
    "cursor-grab rounded-md border-l-[3px] bg-card px-2 py-1.5 text-[11px] shadow-sm transition-all",
    pConfig.border,
    "hover:shadow-md hover:ring-1 hover:ring-border/50",
    isDragging && "opacity-40",
    isDragOverlay && "cursor-grabbing shadow-lg ring-2 ring-primary/30",
    post.status === "failed" && "bg-red-50/50 dark:bg-red-950/20",
    priority && !dimmed && "animate-priority-pulse",
    dimmed && "opacity-40 grayscale",
  );

  // Drag overlay mode — plain div, no hover card
  if (isDragOverlay) {
    return (
      <div className={cardClasses}>
        {cardContent}
      </div>
    );
  }

  return (
    <HoverCard openDelay={400} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div
          ref={setNodeRef}
          style={style}
          {...attributes}
          {...listeners}
          onClick={(e) => {
            e.stopPropagation();
            onClick(post);
          }}
          className={cardClasses}
        >
          {cardContent}
        </div>
      </HoverCardTrigger>
      <HoverCardContent side="right" align="start" className="w-72 p-0 overflow-hidden pointer-events-none">
        {thumbnail && (
          <img src={thumbnail} alt="" className="h-36 w-full object-cover" />
        )}
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <PlatformIcon className={cn("h-4 w-4", pConfig.color)} />
            {timeStr && (
              <span className="text-xs font-semibold text-foreground/70">{timeStr}</span>
            )}
            <span className={cn("ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium", sConfig.bg, sConfig.color)}>
              {sConfig.label}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-foreground/90 line-clamp-4">
            {post.text || "Untitled post"}
          </p>
          {post.platformResults && post.platformResults.length > 1 && (
            <div className="flex items-center gap-1 pt-1 border-t">
              <span className="text-[10px] text-muted-foreground">Platforms:</span>
              {post.platformResults.map((r) => {
                const rConfig = platformConfig[r.platform] || platformConfig.twitter;
                const RIcon = rConfig.icon;
                return (
                  <RIcon
                    key={r.accountId}
                    className={cn("h-3 w-3", r.status === "failed" ? "text-red-400" : rConfig.color)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export { platformConfig };
