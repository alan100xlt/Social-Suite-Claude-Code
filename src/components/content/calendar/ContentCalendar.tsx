import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import {
  format,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
  isToday,
  getDay,
  getHours,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, LayoutGrid, List, PanelRightOpen, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GetLatePost } from "@/lib/api/getlate";
import { useUpdatePost } from "@/hooks/useGetLatePosts";
import { CalendarCard, isTimeSensitive } from "./CalendarCard";
import { getBestTimeTint, isBestTimeSlot } from "./BestTimeOverlay";
import { CalendarFilters, createDefaultFilters, type CalendarFilterState } from "./CalendarFilters";
import { CalendarSidebar } from "./CalendarSidebar";
import type { BestTimeSlot } from "@/hooks/useBestTimeToPost";

// 6AM–10PM = 16 hours
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6);
const DEFAULT_SCROLL_HOUR = 8; // Auto-scroll to 8AM

type WeekMode = "sun-sat" | "rolling";
type ViewMode = "grid" | "stacking";

interface DroppableCellProps {
  id: string;
  className?: string;
  children: React.ReactNode;
}

function DroppableCell({ id, className, children }: DroppableCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative min-h-[60px] p-0.5 transition-colors",
        isOver && "bg-primary/10 ring-1 ring-inset ring-primary/30",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface ContentCalendarProps {
  posts: GetLatePost[];
  bestTimeSlots: BestTimeSlot[];
  onPostClick: (post: GetLatePost) => void;
  onNewPost?: () => void;
}

export function ContentCalendar({ posts, bestTimeSlots, onPostClick, onNewPost }: ContentCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filters, setFilters] = useState<CalendarFilterState>(createDefaultFilters);
  const [weekMode, setWeekMode] = useState<WeekMode>("sun-sat");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const updatePost = useUpdatePost();

  const weekStart = useMemo(() => {
    if (weekMode === "rolling") return new Date();
    return startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday
  }, [currentDate, weekMode]);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  // Auto-scroll to 8AM on mount
  useEffect(() => {
    if (scrollRef.current && viewMode === "grid") {
      const rowHeight = 60; // min-h-[60px]
      const scrollTo = (DEFAULT_SCROLL_HOUR - 6) * rowHeight;
      scrollRef.current.scrollTop = scrollTo;
    }
  }, [viewMode]);

  // Apply filters to posts
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (filters.platforms.size > 0) {
        const postPlatforms = post.platformResults?.map((r) => r.platform) || [];
        if (!postPlatforms.some((p) => filters.platforms.has(p))) return false;
      }
      if (filters.status !== "all" && post.status !== filters.status) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!post.text?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [posts, filters]);

  // Grid view: posts by cell slot
  const postsBySlot = useMemo(() => {
    const map = new Map<string, GetLatePost[]>();
    filteredPosts.forEach((post) => {
      const dateStr = post.scheduledFor || post.publishedAt;
      if (!dateStr) return;
      const date = parseISO(dateStr);
      const day = days.findIndex((d) => isSameDay(d, date));
      if (day === -1) return;
      const hour = getHours(date);
      if (hour < 6 || hour > 22) return;
      const key = `${day}-${hour}`;
      const existing = map.get(key) || [];
      existing.push(post);
      map.set(key, existing);
    });
    return map;
  }, [filteredPosts, days]);

  // Stacking view: posts grouped by day, sorted by time
  const postsByDay = useMemo(() => {
    const map = new Map<number, GetLatePost[]>();
    filteredPosts.forEach((post) => {
      const dateStr = post.scheduledFor || post.publishedAt;
      if (!dateStr) return;
      const date = parseISO(dateStr);
      const dayIdx = days.findIndex((d) => isSameDay(d, date));
      if (dayIdx === -1) return;
      const existing = map.get(dayIdx) || [];
      existing.push(post);
      map.set(dayIdx, existing);
    });
    // Sort each day's posts by time
    map.forEach((dayPosts) => {
      dayPosts.sort((a, b) => {
        const aTime = a.scheduledFor || a.publishedAt || "";
        const bTime = b.scheduledFor || b.publishedAt || "";
        return aTime.localeCompare(bTime);
      });
    });
    return map;
  }, [filteredPosts, days]);

  // Sidebar awareness counts
  const failedCount = useMemo(
    () => posts.filter((p) => p.status === "failed").length,
    [posts],
  );
  const needsAttentionCount = useMemo(
    () => posts.filter((p) => isTimeSensitive(p)).length,
    [posts],
  );
  const unscheduledDrafts = useMemo(
    () => posts.filter((p) => p.status === "draft" && !p.scheduledFor).length,
    [posts],
  );
  const sidebarBadgeCount = needsAttentionCount + unscheduledDrafts;

  // Auto-open sidebar when there are failed/overdue posts
  const hasAutoOpened = useRef(false);
  useEffect(() => {
    if (!hasAutoOpened.current && needsAttentionCount > 0) {
      hasAutoOpened.current = true;
      setSidebarOpen(true);
    }
  }, [needsAttentionCount]);

  const [draggedPost, setDraggedPost] = useState<GetLatePost | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const post = posts.find((p) => p.id === event.active.id);
      if (post) setDraggedPost(post);
    },
    [posts]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDraggedPost(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const overId = over.id as string;

      if (viewMode === "stacking") {
        // Stacking: drop target is just day index
        const dayIndex = parseInt(overId.replace("day-", ""), 10);
        if (isNaN(dayIndex)) return;
        const targetDate = new Date(days[dayIndex]);
        targetDate.setHours(10, 0, 0, 0); // Default to 10AM
        updatePost.mutate({
          postId: active.id as string,
          scheduledFor: targetDate.toISOString(),
        });
      } else {
        // Grid: drop target is dayIdx-hour
        const [dayIdx, hourStr] = overId.split("-");
        const dayIndex = parseInt(dayIdx, 10);
        const hour = parseInt(hourStr, 10);
        if (isNaN(dayIndex) || isNaN(hour)) return;
        const targetDate = new Date(days[dayIndex]);
        targetDate.setHours(hour, 0, 0, 0);
        updatePost.mutate({
          postId: active.id as string,
          scheduledFor: targetDate.toISOString(),
        });
      }
    },
    [days, updatePost, viewMode]
  );

  const formatHour = (h: number) => {
    if (h === 0) return "12 AM";
    if (h < 12) return `${h} AM`;
    if (h === 12) return "12 PM";
    return `${h - 12} PM`;
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate((d) => subWeeks(d, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate((d) => addWeeks(d, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h3 className="ml-2 text-sm font-semibold">
            {format(days[0], "MMM d")} – {format(days[6], "MMM d, yyyy")}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center rounded-md border">
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-7 rounded-r-none px-2", viewMode === "grid" && "bg-muted")}
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-7 rounded-l-none px-2", viewMode === "stacking" && "bg-muted")}
              onClick={() => setViewMode("stacking")}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Week mode toggle */}
          <div className="flex items-center rounded-md border">
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-7 rounded-r-none px-2 text-xs", weekMode === "sun-sat" && "bg-muted")}
              onClick={() => setWeekMode("sun-sat")}
            >
              Sun–Sat
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-7 rounded-l-none px-2 text-xs", weekMode === "rolling" && "bg-muted")}
              onClick={() => setWeekMode("rolling")}
            >
              Next 7
            </Button>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="relative h-8 w-8"
            onClick={() => setSidebarOpen((o) => !o)}
            title="Toggle sidebar"
          >
            <PanelRightOpen className={cn("h-4 w-4 transition-transform", sidebarOpen && "rotate-180")} />
            {!sidebarOpen && sidebarBadgeCount > 0 && (
              <span
                className={cn(
                  "absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[10px] font-bold text-white",
                  failedCount > 0 ? "bg-red-500" : "bg-amber-500",
                )}
              >
                {sidebarBadgeCount}
              </span>
            )}
          </Button>

          {onNewPost && (
            <Button size="sm" className="h-8 gap-1" onClick={onNewPost}>
              <Plus className="h-3.5 w-3.5" />
              New Post
            </Button>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="border-b px-4 py-2">
        <CalendarFilters filters={filters} onChange={setFilters} />
      </div>

      {/* Notification strip — right-aligned, red for errors, amber for attention */}
      {!sidebarOpen && sidebarBadgeCount > 0 && (
        <div className="flex justify-end border-b">
          <button
            onClick={() => setSidebarOpen(true)}
            className={cn(
              "flex items-center gap-2 rounded-bl-lg px-3 py-1.5 text-xs transition-colors",
              failedCount > 0
                ? "bg-red-50 text-red-800 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
                : "bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/60",
            )}
          >
            {failedCount > 0 && (
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-red-500" />
                <span className="font-semibold">{failedCount} failed</span>
              </span>
            )}
            {failedCount > 0 && (needsAttentionCount - failedCount > 0 || unscheduledDrafts > 0) && (
              <span className="opacity-40">·</span>
            )}
            {needsAttentionCount - failedCount > 0 && (
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                <span className="font-medium">{needsAttentionCount - failedCount} need attention</span>
              </span>
            )}
            {(needsAttentionCount - failedCount > 0) && unscheduledDrafts > 0 && (
              <span className="opacity-40">·</span>
            )}
            {unscheduledDrafts > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span className="font-medium">{unscheduledDrafts} draft{unscheduledDrafts !== 1 ? "s" : ""} to schedule</span>
              </span>
            )}
            <ChevronLeft className="ml-1 h-3 w-3 opacity-50" />
          </button>
        </div>
      )}

      {/* Main area: calendar + sidebar */}
      <div className="relative flex flex-1 overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {viewMode === "grid" ? (
            /* ── Grid View ── */
            <div ref={scrollRef} className="flex-1 overflow-auto">
              <div className="grid min-w-[800px]" style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}>
                {/* Header row */}
                <div className="sticky top-0 z-10 border-b bg-background p-2" />
                {days.map((day, i) => (
                  <div
                    key={i}
                    className={cn(
                      "sticky top-0 z-10 border-b border-l bg-background p-2 text-center",
                      isToday(day) && "bg-primary/5"
                    )}
                  >
                    <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                      {format(day, "EEE")}
                    </div>
                    <div
                      className={cn(
                        "mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                        isToday(day) && "bg-primary text-primary-foreground"
                      )}
                    >
                      {format(day, "d")}
                    </div>
                  </div>
                ))}

                {/* Time rows */}
                {HOURS.map((hour) => (
                  <>
                    <div
                      key={`label-${hour}`}
                      className="border-t border-border/40 px-1.5 py-1 text-right text-[10px] font-medium text-muted-foreground"
                    >
                      {formatHour(hour)}
                    </div>
                    {days.map((day, dayIdx) => {
                      const cellId = `${dayIdx}-${hour}`;
                      const cellPosts = postsBySlot.get(cellId) || [];
                      const dayOfWeek = getDay(day);
                      const tintClass = getBestTimeTint({
                        slots: bestTimeSlots,
                        dayOfWeek,
                        hour,
                        visible: filters.showBestTimes,
                      });

                      const isBestTime = filters.showBestTimes && isBestTimeSlot(bestTimeSlots, dayOfWeek, hour);

                      return (
                        <DroppableCell
                          key={cellId}
                          id={cellId}
                          className={cn(
                            "border-t border-l border-border/30",
                            isToday(day) && "bg-primary/[0.02]",
                            tintClass,
                          )}
                        >
                          {cellPosts.length === 0 && isBestTime && (
                            <span className="absolute right-1 top-0.5 text-[9px] font-medium text-emerald-600/70 dark:text-emerald-400/70 select-none">
                              Best time
                            </span>
                          )}
                          {cellPosts.map((post) => (
                            <CalendarCard
                              key={post.id}
                              post={post}
                              platform={post.platformResults?.[0]?.platform}
                              onClick={onPostClick}
                              dimmed={filters.focusMode && !isTimeSensitive(post)}
                            />
                          ))}
                        </DroppableCell>
                      );
                    })}
                  </>
                ))}
              </div>
            </div>
          ) : (
            /* ── Stacking View ── */
            <div className="flex-1 overflow-auto">
              <div className="grid min-w-[700px] h-full" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
                {days.map((day, dayIdx) => {
                  const dayPosts = postsByDay.get(dayIdx) || [];
                  return (
                    <DroppableCell
                      key={dayIdx}
                      id={`day-${dayIdx}`}
                      className={cn(
                        "flex flex-col border-l first:border-l-0",
                        isToday(day) && "bg-primary/[0.03]",
                      )}
                    >
                      {/* Day header */}
                      <div className={cn(
                        "sticky top-0 z-10 bg-background border-b p-2 text-center",
                        isToday(day) && "bg-primary/5",
                      )}>
                        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                          {format(day, "EEE")}
                        </div>
                        <div
                          className={cn(
                            "mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                            isToday(day) && "bg-primary text-primary-foreground"
                          )}
                        >
                          {format(day, "d")}
                        </div>
                        {dayPosts.length > 0 && (
                          <div className="mt-1 text-[10px] text-muted-foreground">
                            {dayPosts.length} post{dayPosts.length !== 1 ? "s" : ""}
                          </div>
                        )}
                      </div>
                      {/* Posts */}
                      <div className="flex-1 space-y-0.5 p-1">
                        {dayPosts.map((post) => (
                          <CalendarCard
                            key={post.id}
                            post={post}
                            platform={post.platformResults?.[0]?.platform}
                            onClick={onPostClick}
                            dimmed={filters.focusMode && !isTimeSensitive(post)}
                          />
                        ))}
                      </div>
                    </DroppableCell>
                  );
                })}
              </div>
            </div>
          )}

          {/* Edge tab — visible when sidebar closed, animated peek every 10s */}
          {!sidebarOpen && sidebarBadgeCount > 0 && (
            <button
              onClick={() => setSidebarOpen(true)}
              className={cn(
                "absolute right-0 top-1/3 z-20 flex items-center gap-1 rounded-l-lg py-3 pl-1.5 pr-1 shadow-md animate-drawer-peek",
                failedCount > 0
                  ? "bg-red-500 text-white"
                  : "bg-amber-500 text-white",
              )}
              title="Open sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs font-bold">{sidebarBadgeCount}</span>
            </button>
          )}

          {/* Sidebar overlay */}
          {sidebarOpen && (
            <div
              className="absolute inset-0 z-20 bg-black/10"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          <CalendarSidebar
            posts={posts}
            onPostClick={onPostClick}
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />

          <DragOverlay>
            {draggedPost && (
              <CalendarCard
                post={draggedPost}
                platform={draggedPost.platformResults?.[0]?.platform}
                onClick={() => {}}
                isDragOverlay
              />
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
