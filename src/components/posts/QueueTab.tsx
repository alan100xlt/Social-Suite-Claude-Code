import { useState, useMemo } from "react";
import { format, parseISO, isToday, isFuture, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { usePosts, useUpdatePost } from "@/hooks/useGetLatePosts";
import { useAccounts } from "@/hooks/useGetLateAccounts";
import { GetLatePost, Platform } from "@/lib/api/getlate";
import {
  FaInstagram, FaTwitter, FaLinkedin, FaFacebook, FaTiktok, FaYoutube,
} from "react-icons/fa";
import { SiBluesky, SiThreads } from "react-icons/si";
import {
  Search, Bell, ChevronDown, X, CalendarDays, Loader2,
  Eye, Clock, CheckCircle, AlertCircle, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

// ── Platform helpers ─────────────────────────────────────────────────────────

const platformIcons: Record<Platform, React.ElementType> = {
  instagram: FaInstagram, twitter: FaTwitter, facebook: FaFacebook,
  linkedin: FaLinkedin, tiktok: FaTiktok, youtube: FaYoutube,
  pinterest: FaYoutube, reddit: FaYoutube, bluesky: SiBluesky,
  threads: SiThreads, "google-business": FaFacebook, telegram: FaFacebook, snapchat: FaFacebook,
};

const platformLabel: Record<Platform, string> = {
  instagram: "IG", twitter: "TW", facebook: "FB", linkedin: "LI",
  tiktok: "TK", youtube: "YT", pinterest: "PT", reddit: "RD",
  bluesky: "BS", threads: "TH", "google-business": "GB", telegram: "TG", snapchat: "SC",
};

const platformCharLimit: Record<string, number> = {
  twitter: 280, linkedin: 3000, instagram: 2200,
};

// ── Status helpers ───────────────────────────────────────────────────────────

const statusConfig: Record<
  string,
  { label: string; icon: React.ElementType; className: string }
> = {
  draft:     { label: "Draft",     icon: FileText,     className: "bg-slate-100 text-slate-600 border-slate-200" },
  scheduled: { label: "Scheduled", icon: Clock,        className: "bg-blue-50 text-blue-600 border-blue-200" },
  published: { label: "Published", icon: CheckCircle,  className: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  failed:    { label: "Issue",     icon: AlertCircle,  className: "bg-red-50 text-red-600 border-red-200" },
};

// ── Toolbar ──────────────────────────────────────────────────────────────────

interface ToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusFilter: (v: string) => void;
  platformFilter: string;
  onPlatformFilter: (v: string) => void;
}

function QueueToolbar({
  search, onSearchChange,
  statusFilter, onStatusFilter,
  platformFilter, onPlatformFilter,
}: ToolbarProps) {
  const statusOptions = ["All", "Draft", "Scheduled", "Published", "Issue"];
  const platformOptions = ["All Platforms", "LinkedIn", "Instagram", "Facebook", "Twitter/X", "YouTube"];

  return (
    <div className="sticky top-0 z-20 bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center gap-3 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search posts, captions…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Status filter */}
      <FilterDropdown
        label="Status"
        value={statusFilter}
        options={statusOptions}
        onChange={onStatusFilter}
      />

      {/* Platform filter */}
      <FilterDropdown
        label="Platform"
        value={platformFilter}
        options={platformOptions}
        onChange={onPlatformFilter}
      />

      {/* Spacer + right icons */}
      <div className="ml-auto flex items-center gap-3">
        <Bell className="w-5 h-5 text-slate-400 cursor-pointer hover:text-slate-200" />
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-semibold text-white">
          A
        </div>
      </div>
    </div>
  );
}

function FilterDropdown({
  label, value, options, onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const isActive = value !== options[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors",
          isActive
            ? "bg-blue-600 text-white border-blue-600"
            : "bg-slate-800 border-slate-700 text-slate-200 hover:border-slate-600"
        )}
      >
        {value}
        <ChevronDown className="w-3.5 h-3.5 opacity-70" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 z-40 bg-slate-900 border border-slate-700 shadow-xl rounded-xl py-1 min-w-[160px]">
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm transition-colors",
                  opt === value
                    ? "text-blue-400 bg-slate-800"
                    : "text-slate-300 hover:bg-slate-800"
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Progress bars (SOC-24) ───────────────────────────────────────────────────

interface ProcessingStep {
  label: string;
  percent: number;
}

function SubTaskProgressBars({ steps }: { steps: ProcessingStep[] }) {
  return (
    <div className="mt-2 space-y-1">
      {steps.map((step) => (
        <div key={step.label} className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 w-28 shrink-0">{step.label}</span>
          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                step.percent === 100 ? "bg-emerald-400" : step.percent > 0 ? "bg-blue-400" : "bg-slate-200"
              )}
              style={{ width: `${step.percent}%` }}
            />
          </div>
          <span className="text-[10px] font-semibold text-slate-600 w-8 text-right">{step.percent}%</span>
        </div>
      ))}
    </div>
  );
}

// ── Article card (SOC-22) ────────────────────────────────────────────────────

function PostCard({
  post,
  platform,
  onClick,
}: {
  post: GetLatePost;
  platform: Platform;
  onClick: () => void;
}) {
  const Icon = platformIcons[platform];
  const cfg = statusConfig[post.status] ?? statusConfig.draft;
  const StatusIcon = cfg.icon;
  const isError = post.status === "failed";
  const thumbnail = post.mediaItems?.[0]?.thumbnailUrl ?? post.mediaItems?.[0]?.url;

  // Simulate processing steps for draft posts (real data would come from post fields)
  const processingSteps: ProcessingStep[] | null =
    post.status === "draft"
      ? [
          { label: "Copywriting", percent: 100 },
          { label: "Media Rendering", percent: 0 },
          { label: "Approval", percent: 0 },
        ]
      : null;

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-start gap-4 p-4 bg-white rounded-xl border shadow-sm cursor-pointer transition-shadow hover:shadow-md",
        isError ? "border-red-200 ring-1 ring-red-100" : "border-slate-200"
      )}
    >
      {/* Thumbnail */}
      <div
        className={cn(
          "w-16 h-16 rounded-xl flex-shrink-0 bg-slate-100 flex items-center justify-center overflow-hidden",
          isError && "grayscale"
        )}
      >
        {thumbnail ? (
          <img src={thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <Icon className="w-6 h-6 text-slate-400" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 line-clamp-2">{post.text}</p>
        <div className="flex items-center gap-1 mt-1">
          <Icon className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[10px] font-bold uppercase text-slate-500">
            {platformLabel[platform]}
            {post.scheduledFor && (
              <> &bull; {format(parseISO(post.scheduledFor), "h:mm a")}</>
            )}
          </span>
        </div>
        {processingSteps && <SubTaskProgressBars steps={processingSteps} />}
      </div>

      {/* Status badge */}
      <div className="flex-shrink-0 flex flex-col items-end gap-2">
        <Badge
          variant="outline"
          className={cn("flex items-center gap-1 text-xs", cfg.className)}
        >
          <StatusIcon className="w-3 h-3" />
          {cfg.label}
        </Badge>
      </div>
    </div>
  );
}

// ── Flyout editor (SOC-26) ────────────────────────────────────────────────────

function FlyoutEditor({
  post,
  platform,
  onClose,
}: {
  post: GetLatePost;
  platform: Platform;
  onClose: () => void;
}) {
  const [caption, setCaption] = useState(post.text);
  const updatePost = useUpdatePost();
  const Icon = platformIcons[platform];
  const charLimit = platformCharLimit[platform] ?? 2200;
  const hasChanges = caption !== post.text;

  const handleSave = () => {
    updatePost.mutate({ postId: post.id, text: caption }, { onSuccess: onClose });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-screen w-[480px] z-50 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate flex-1">
            {post.text.slice(0, 60)}{post.text.length > 60 && "…"}
          </p>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            aria-label="Close editor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Caption editor */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
              Caption
            </label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={8}
              className="resize-none bg-slate-50 border-slate-200 focus:ring-2 focus:ring-blue-500/20 text-sm"
              onKeyDown={(e) => e.key === "Escape" && onClose()}
            />
            <p
              className={cn(
                "text-[11px] text-right mt-1",
                caption.length > charLimit ? "text-red-500" : "text-slate-400"
              )}
            >
              {caption.length} / {charLimit}
            </p>
          </div>

          {/* Media preview */}
          {post.mediaItems && post.mediaItems.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
                Media
              </label>
              <div className="rounded-xl overflow-hidden bg-slate-100 aspect-video flex items-center justify-center">
                {post.mediaItems[0].type === "image" ? (
                  <img
                    src={post.mediaItems[0].url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Eye className="w-8 h-8 text-slate-400" />
                )}
              </div>
            </div>
          )}

          {/* Schedule info */}
          {post.scheduledFor && (
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
                Scheduled
              </label>
              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <Clock className="w-4 h-4 text-slate-400" />
                {format(parseISO(post.scheduledFor), "MMM d, yyyy 'at' h:mm a")}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-700">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updatePost.isPending || caption.length > charLimit}
            className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
          >
            {updatePost.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-slate-500 hover:text-red-500"
          >
            Discard
          </Button>
        </div>
      </div>
    </>
  );
}

// ── Date group / timeline section (SOC-20) ────────────────────────────────────

function DateSection({
  date,
  posts,
  onCardClick,
  getPlatform,
}: {
  date: Date;
  posts: GetLatePost[];
  onCardClick: (post: GetLatePost) => void;
  getPlatform: (post: GetLatePost) => Platform;
}) {
  const isCurrentDay = isToday(date);
  const isFutureDay = isFuture(startOfDay(date));
  const showTasksBadge = isCurrentDay || isFutureDay;
  const pendingCount = posts.filter(
    (p) => p.status === "draft" || p.status === "scheduled"
  ).length;

  return (
    <div className="relative flex gap-6">
      {/* Timeline column */}
      <div className="flex flex-col items-center w-16 flex-shrink-0">
        {/* Node */}
        <div className="w-3 h-3 rounded-full bg-slate-800 dark:bg-white ring-4 ring-white dark:ring-slate-950 z-10 mt-5" />
        {/* Connector line — hidden, the parent draws the continuous line */}
      </div>

      {/* Date header + cards */}
      <div className="flex-1 pb-8">
        {/* Date header */}
        <div className="flex items-baseline gap-3 mb-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400">
              {format(date, "MMM yyyy")}
            </p>
            <p className="text-4xl font-bold text-slate-800 dark:text-slate-100 leading-none">
              {format(date, "d")}
            </p>
            <p className="text-xs font-semibold text-slate-500">{format(date, "EEEE")}</p>
          </div>
          {showTasksBadge && pendingCount > 0 && (
            <span className="bg-blue-50 text-blue-600 text-xs font-semibold px-2 py-0.5 rounded-full border border-blue-200">
              {pendingCount} Task{pendingCount !== 1 && "s"} Remaining
            </span>
          )}
        </div>

        {/* Cards */}
        {posts.length === 0 ? (
          <div className="flex items-center gap-2 py-4 text-slate-400">
            <CalendarDays className="w-5 h-5 opacity-50" />
            <span className="text-sm">No publications scheduled</span>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                platform={getPlatform(post)}
                onClick={() => onCardClick(post)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main QueueTab ─────────────────────────────────────────────────────────────

export function QueueTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [platformFilter, setPlatformFilter] = useState("All Platforms");
  const [selectedPost, setSelectedPost] = useState<GetLatePost | null>(null);

  const { data: posts = [], isLoading } = usePosts();
  const { data: accounts } = useAccounts();

  const getPlatform = (post: GetLatePost): Platform => {
    if (post.platformResults?.length) return post.platformResults[0].platform;
    if (post.accountIds?.length && accounts) {
      const account = accounts.find((a) => a.id === post.accountIds[0]);
      return (account?.platform as Platform) || "twitter";
    }
    return "twitter";
  };

  // Filter posts
  const filtered = useMemo(() => {
    return posts.filter((post) => {
      if (search && !post.text.toLowerCase().includes(search.toLowerCase())) return false;

      if (statusFilter !== "All") {
        const map: Record<string, string> = {
          Draft: "draft", Scheduled: "scheduled", Published: "published", Issue: "failed",
        };
        if (post.status !== map[statusFilter]) return false;
      }

      if (platformFilter !== "All Platforms") {
        const platform = getPlatform(post);
        const map: Record<string, Platform> = {
          LinkedIn: "linkedin", Instagram: "instagram", Facebook: "facebook",
          "Twitter/X": "twitter", YouTube: "youtube",
        };
        if (platform !== map[platformFilter]) return false;
      }

      return true;
    });
  }, [posts, search, statusFilter, platformFilter, accounts]);

  // Group by date (descending — most recent / upcoming first)
  const grouped = useMemo(() => {
    const map = new Map<string, GetLatePost[]>();
    const sorted = [...filtered].sort((a, b) => {
      const da = a.scheduledFor ?? a.publishedAt ?? "";
      const db = b.scheduledFor ?? b.publishedAt ?? "";
      return new Date(db).getTime() - new Date(da).getTime();
    });

    for (const post of sorted) {
      const dateStr = post.scheduledFor ?? post.publishedAt;
      if (!dateStr) continue;
      const key = format(parseISO(dateStr), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(post);
    }

    return Array.from(map.entries()).map(([key, datePosts]) => ({
      date: parseISO(key),
      posts: datePosts,
    }));
  }, [filtered]);

  const selectedPlatform = selectedPost ? getPlatform(selectedPost) : "twitter" as Platform;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
      {/* Dark toolbar (SOC-21) */}
      <QueueToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        platformFilter={platformFilter}
        onPlatformFilter={setPlatformFilter}
      />

      {/* Timeline (SOC-20) */}
      <div className="relative bg-slate-50 dark:bg-slate-950 px-6 py-6">
        {/* Continuous vertical line */}
        {grouped.length > 0 && (
          <div className="absolute left-[3.25rem] top-6 bottom-6 w-0.5 bg-slate-200 dark:bg-slate-700" />
        )}

        {grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <CalendarDays className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-sm font-medium">No posts found</p>
            <p className="text-xs mt-1">Try adjusting your filters or compose a new post</p>
          </div>
        ) : (
          <div className="space-y-0">
            {grouped.map(({ date, posts: datePosts }) => (
              <DateSection
                key={date.toISOString()}
                date={date}
                posts={datePosts}
                onCardClick={setSelectedPost}
                getPlatform={getPlatform}
              />
            ))}
          </div>
        )}
      </div>

      {/* Flyout editor (SOC-26) */}
      {selectedPost && (
        <FlyoutEditor
          post={selectedPost}
          platform={selectedPlatform}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </div>
  );
}
