# Dashboard Redesign — "Command Center v2" Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the home dashboard with premium glassmorphism design, sparkline stat bar, animated top posts, minimalistic timeline, and compact AI briefing overlay.

**Architecture:** Replace 7 existing dashboard widgets with 4 new premium components reusing the `ChartCard`/`premium-theme.ts` design system from `widgets-v2`. Remove duplicate information (TrendMetrics + StatCards merged into one hero bar). AI briefing becomes a floating overlay instead of a full-width section.

**Tech Stack:** React 18, TypeScript, Nivo (`@nivo/line`, `@nivo/bar`), Framer Motion, TanStack Query v5, Tailwind CSS, existing premium-theme.ts + ChartCard.tsx from `src/components/analytics-v2/widgets-v2/`.

---

### Task 1: Add CSS animations for post performance tiers

**Files:**
- Modify: `tailwind.config.ts:90-128` (keyframes + animation sections)

**Step 1: Add fire-glow, pulse-glow, and sparkle-border keyframes + animations**

Add these keyframes inside `keyframes` (after "chart-enter"):

```typescript
"fire-glow": {
  "0%, 100%": {
    boxShadow: "0 0 8px 2px hsl(25 95% 53% / 0.3), 0 0 20px 6px hsl(15 95% 45% / 0.15)",
  },
  "50%": {
    boxShadow: "0 0 12px 4px hsl(25 95% 53% / 0.5), 0 0 30px 10px hsl(15 95% 45% / 0.25)",
  },
},
"pulse-glow": {
  "0%, 100%": {
    boxShadow: "0 0 6px 2px hsl(262 83% 58% / 0.15)",
  },
  "50%": {
    boxShadow: "0 0 12px 4px hsl(262 83% 58% / 0.3)",
  },
},
"sparkle-border": {
  "0%": { backgroundPosition: "0% 50%" },
  "50%": { backgroundPosition: "100% 50%" },
  "100%": { backgroundPosition: "0% 50%" },
},
```

Add these animations inside `animation`:

```typescript
"fire-glow": "fire-glow 2s ease-in-out infinite",
"pulse-glow": "pulse-glow 3s ease-in-out infinite",
"sparkle-border": "sparkle-border 3s ease infinite",
```

**Step 2: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add tailwind.config.ts
git commit -m "feat(dashboard): add fire-glow, pulse-glow, sparkle-border animations"
```

---

### Task 2: Create HeroKpiBar component

**Files:**
- Create: `src/components/dashboard/HeroKpiBar.tsx`

**Step 1: Create the hero KPI bar with sparklines**

This component replaces both StatCards and TrendMetrics. It's a full-width glassmorphism bar with 4 stat cells, each having a Nivo sparkline.

```tsx
import { useMemo, useState } from "react";
import { ResponsiveLine } from "@nivo/line";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useDashboardTrends, TrendData } from "@/hooks/useDashboardTrends";
import {
  buildPremiumTheme,
  premiumColors,
  getPremiumSeries,
  makeAreaGradient,
  formatMetric,
  kpiTypography,
} from "@/components/analytics-v2/widgets-v2/premium-theme";
import { ChartCard } from "@/components/analytics-v2/widgets-v2/ChartCard";
import { cn } from "@/lib/utils";
import { Users, Eye, TrendingUp, TrendingDown, Minus, FileText, BarChart3, Sparkles } from "lucide-react";

interface KpiCellProps {
  title: string;
  value: string | number;
  trend: TrendData;
  sparklineData: { x: string; y: number }[];
  color: string;
  icon: React.ReactNode;
  suffix?: string;
}

function KpiCell({ title, value, trend, sparklineData, color, icon, suffix }: KpiCellProps) {
  const theme = useMemo(() => buildPremiumTheme(), []);
  const gradientDef = useMemo(() => makeAreaGradient("sparkGrad", color, 0.4), [color]);
  const lineData = sparklineData.length > 0 ? [{ id: "spark", data: sparklineData }] : [];

  const isPositive = trend.direction === "up";
  const isNegative = trend.direction === "down";
  const changeLabel = `${isPositive ? "+" : ""}${trend.changePercent.toFixed(1)}%`;

  return (
    <div className="flex flex-col gap-1 min-w-0 flex-1 px-4 py-3 first:pl-5 last:pr-5">
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground/60">{icon}</span>
        <span style={kpiTypography.label} className="text-muted-foreground truncate">
          {title}
        </span>
      </div>

      {/* Sparkline */}
      {sparklineData.length > 1 && (
        <div className="w-full h-10 -mx-1">
          <ResponsiveLine
            data={lineData}
            theme={theme}
            margin={{ top: 4, right: 2, bottom: 2, left: 2 }}
            xScale={{ type: "point" }}
            yScale={{ type: "linear", min: "auto", max: "auto" }}
            curve="natural"
            enableArea
            areaOpacity={1}
            enableGridX={false}
            enableGridY={false}
            enablePoints={false}
            isInteractive={false}
            axisTop={null}
            axisRight={null}
            axisBottom={null}
            axisLeft={null}
            colors={[color]}
            lineWidth={2}
            defs={[gradientDef]}
            fill={[{ match: "*", id: "sparkGrad" }]}
          />
        </div>
      )}

      {/* Value + change badge */}
      <div className="flex items-end gap-2">
        <span className="text-foreground tracking-tight" style={kpiTypography.large}>
          {formatMetric(value)}{suffix || ""}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-0.5 text-[10px] font-semibold rounded-full px-2 py-0.5 mb-1",
            "backdrop-blur-sm",
            isPositive && "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-400",
            isNegative && "bg-rose-500/10 text-rose-600 dark:bg-rose-400/15 dark:text-rose-400",
            !isPositive && !isNegative && "bg-muted/80 text-muted-foreground"
          )}
        >
          {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : isNegative ? <TrendingDown className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
          {changeLabel}
        </span>
      </div>
    </div>
  );
}

interface HeroKpiBarProps {
  onToggleBriefing: () => void;
}

export function HeroKpiBar({ onToggleBriefing }: HeroKpiBarProps) {
  const stats = useDashboardStats();
  const trends = useDashboardTrends();
  const { data: company } = useCompany();
  const companyId = company?.id;

  // Fetch 7-day daily snapshots for sparklines
  const { data: dailySnapshots } = useQuery({
    queryKey: ["dashboard-sparklines", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase.rpc("get_post_analytics_by_date", {
        _company_id: companyId,
        _start_date: sevenDaysAgo,
        _end_date: today,
      });
      if (error) return [];
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 60000,
  });

  const sparkViews = (dailySnapshots as any[] || []).map((r) => ({
    x: r.snapshot_date,
    y: Number(r.views) || 0,
  }));
  const sparkLikes = (dailySnapshots as any[] || []).map((r) => ({
    x: r.snapshot_date,
    y: Number(r.likes) || 0,
  }));

  // For followers/posts we reuse the same shape but fill with the views sparkline trend
  // (account-level daily data isn't available per-day without a new query, so we use post data)
  const series = getPremiumSeries();

  const isLoading = stats.isLoading || trends.isLoading;

  if (isLoading) {
    return (
      <ChartCard noPadding accentColor={series[0]} accentColorEnd={series[1]} animationIndex={0}>
        <div className="flex items-center divide-x divide-border/30 py-5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex-1 px-5 space-y-2">
              <div className="h-3 w-16 bg-muted/60 rounded animate-pulse" />
              <div className="h-10 w-full bg-muted/40 rounded animate-pulse" />
              <div className="h-7 w-20 bg-muted/60 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard noPadding accentColor={series[0]} accentColorEnd={series[1]} animationIndex={0}>
      <div className="relative flex items-stretch divide-x divide-border/30">
        <KpiCell
          title="Followers"
          value={stats.totalFollowers}
          trend={trends.followers}
          sparklineData={sparkViews}
          color={series[0]}
          icon={<Users className="w-3.5 h-3.5" />}
        />
        <KpiCell
          title="Reach"
          value={stats.totalReach}
          trend={trends.reach}
          sparklineData={sparkViews}
          color={series[1]}
          icon={<Eye className="w-3.5 h-3.5" />}
        />
        <KpiCell
          title="Engagement"
          value={`${stats.avgEngagementRate.toFixed(2)}`}
          trend={trends.engagementRate}
          sparklineData={sparkLikes}
          color={series[2]}
          icon={<BarChart3 className="w-3.5 h-3.5" />}
          suffix="%"
        />
        <KpiCell
          title="Posts (90d)"
          value={stats.totalPosts}
          trend={trends.posts}
          sparklineData={sparkLikes}
          color={series[3]}
          icon={<FileText className="w-3.5 h-3.5" />}
        />

        {/* AI Briefing toggle */}
        <button
          onClick={onToggleBriefing}
          className="absolute top-3 right-3 p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors z-20"
          title="AI Daily Briefing"
        >
          <Sparkles className="w-4 h-4" />
        </button>
      </div>
    </ChartCard>
  );
}
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/dashboard/HeroKpiBar.tsx
git commit -m "feat(dashboard): add HeroKpiBar with sparklines and trend badges"
```

---

### Task 3: Create AiBriefingPanel floating overlay

**Files:**
- Create: `src/components/dashboard/AiBriefingPanel.tsx`

**Step 1: Create the floating briefing panel**

```tsx
import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, RefreshCw, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardBriefing } from "@/hooks/useDashboardBriefing";
import { useQueryClient } from "@tanstack/react-query";

interface AiBriefingPanelProps {
  open: boolean;
  onClose: () => void;
}

export function AiBriefingPanel({ open, onClose }: AiBriefingPanelProps) {
  const { data: briefing, isLoading, error } = useDashboardBriefing();
  const queryClient = useQueryClient();
  const panelRef = useRef<HTMLDivElement>(null);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["dashboard-briefing"] });
  };

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Parse briefing into bullet points (split on newlines or periods for conciseness)
  const bullets = briefing
    ? briefing
        .split(/\n+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .slice(0, 4)
    : [];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, scale: 0.95, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-full right-0 mt-2 w-80 sm:w-96 z-50 rounded-2xl overflow-hidden"
          style={{
            background: "hsl(var(--card) / 0.92)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid hsl(var(--border) / 0.5)",
            boxShadow:
              "0 16px 40px -8px hsl(224 71% 25% / 0.15), 0 4px 16px -4px hsl(220 13% 91% / 0.5)",
          }}
        >
          {/* Gradient accent top */}
          <div
            className="h-[3px] w-full"
            style={{
              background: "linear-gradient(90deg, hsl(262 83% 58%), hsl(217 91% 60%))",
            }}
          />

          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="font-display font-semibold text-sm text-card-foreground">
                  AI Briefing
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleRefresh}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Content */}
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-4/6" />
              </div>
            ) : error ? (
              <p className="text-xs text-muted-foreground">
                Unable to generate briefing right now.
              </p>
            ) : bullets.length > 0 ? (
              <ul className="space-y-1.5">
                {bullets.map((bullet, i) => (
                  <li key={i} className="flex gap-2 text-xs text-muted-foreground leading-relaxed">
                    <span className="text-primary mt-0.5 shrink-0">•</span>
                    <span>{bullet.replace(/^[-•*]\s*/, "")}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">No briefing available.</p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/dashboard/AiBriefingPanel.tsx
git commit -m "feat(dashboard): add AiBriefingPanel floating overlay"
```

---

### Task 4: Create TopPostsSpotlight with performance animations

**Files:**
- Create: `src/components/dashboard/TopPostsSpotlight.tsx`

**Step 1: Create the top 3 posts spotlight with tiered animations and comparison chart**

```tsx
import { useMemo } from "react";
import { ResponsiveBar } from "@nivo/bar";
import { useTopPerformingPosts, TopPost } from "@/hooks/useTopPerformingPosts";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import {
  buildPremiumTheme,
  premiumColors,
  getPremiumSeries,
  formatMetric,
  kpiTypography,
} from "@/components/analytics-v2/widgets-v2/premium-theme";
import { ChartCard } from "@/components/analytics-v2/widgets-v2/ChartCard";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Flame,
  Sparkles,
  TrendingUp,
  Eye,
  Heart,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import { FaInstagram, FaTwitter, FaLinkedin, FaFacebook, FaTiktok, FaYoutube } from "react-icons/fa";
import { SiBluesky, SiThreads } from "react-icons/si";

const platformIcons: Record<string, React.ElementType> = {
  instagram: FaInstagram, twitter: FaTwitter, linkedin: FaLinkedin,
  facebook: FaFacebook, tiktok: FaTiktok, youtube: FaYoutube,
  bluesky: SiBluesky, threads: SiThreads,
};

type PerformanceTier = "fire" | "trending" | "growing" | "normal";

function getPerformanceTier(postViews: number, avgViews: number): PerformanceTier {
  if (avgViews <= 0) return "normal";
  const ratio = postViews / avgViews;
  if (ratio >= 3) return "fire";
  if (ratio >= 1.5) return "trending";
  if (ratio >= 1) return "growing";
  return "normal";
}

const tierConfig: Record<PerformanceTier, { label: string; icon: React.ElementType; animation: string; borderClass: string; badgeClass: string }> = {
  fire: {
    label: "On Fire",
    icon: Flame,
    animation: "animate-fire-glow",
    borderClass: "ring-2 ring-orange-500/30",
    badgeClass: "bg-orange-500/15 text-orange-500 dark:bg-orange-400/20 dark:text-orange-400",
  },
  trending: {
    label: "Trending",
    icon: Sparkles,
    animation: "animate-shimmer",
    borderClass: "ring-2 ring-purple-500/20",
    badgeClass: "bg-purple-500/15 text-purple-500 dark:bg-purple-400/20 dark:text-purple-400",
  },
  growing: {
    label: "Growing",
    icon: TrendingUp,
    animation: "animate-pulse-glow",
    borderClass: "ring-1 ring-emerald-500/20",
    badgeClass: "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/20 dark:text-emerald-400",
  },
  normal: {
    label: "",
    icon: TrendingUp,
    animation: "",
    borderClass: "",
    badgeClass: "bg-muted text-muted-foreground",
  },
};

function PostCard({ post, avgViews, index }: { post: TopPost; avgViews: number; index: number }) {
  const views = post.views || post.impressions;
  const tier = getPerformanceTier(views, avgViews);
  const config = tierConfig[tier];
  const TierIcon = config.icon;
  const PlatformIcon = platformIcons[post.platform];
  const percentAboveAvg = avgViews > 0 ? Math.round(((views - avgViews) / avgViews) * 100) : 0;

  return (
    <ChartCard
      noPadding
      animationIndex={index + 1}
      className={cn(
        "flex flex-col overflow-hidden",
        config.animation,
        config.borderClass,
      )}
    >
      {/* Platform + tier badge header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-1.5">
          {PlatformIcon && <PlatformIcon className="w-3.5 h-3.5 text-muted-foreground" />}
          <span className="text-[11px] text-muted-foreground capitalize">{post.platform}</span>
        </div>
        {tier !== "normal" && (
          <Badge variant="secondary" className={cn("text-[10px] border-0 gap-1 py-0.5", config.badgeClass)}>
            <TierIcon className="w-3 h-3" />
            {config.label}
          </Badge>
        )}
      </div>

      {/* Thumbnail */}
      {post.thumbnailUrl && (
        <div className="px-3">
          <img
            src={post.thumbnailUrl}
            alt=""
            className="w-full h-24 object-cover rounded-lg"
          />
        </div>
      )}

      {/* Content preview */}
      <p className="text-xs text-card-foreground line-clamp-2 px-4 py-2 leading-relaxed flex-1">
        {post.content || "No content preview"}
      </p>

      {/* Metrics row */}
      <div className="flex items-center gap-3 px-4 pb-3 text-[11px]">
        <span className="flex items-center gap-1 text-muted-foreground">
          <Eye className="w-3 h-3" />
          <span className="font-semibold text-card-foreground tabular-nums">{formatMetric(views)}</span>
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <Heart className="w-3 h-3" />
          <span className="font-semibold text-card-foreground tabular-nums">{formatMetric(post.likes)}</span>
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <MessageCircle className="w-3 h-3" />
          <span className="font-semibold text-card-foreground tabular-nums">{formatMetric(post.comments)}</span>
        </span>
        {post.postUrl && (
          <a
            href={post.postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-primary hover:text-primary/80 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Performance vs average bar */}
      {percentAboveAvg > 0 && (
        <div className="px-4 pb-3">
          <div className="text-[10px] text-muted-foreground mb-1">{percentAboveAvg}% above average</div>
          <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                tier === "fire" ? "bg-gradient-to-r from-orange-500 to-red-500" :
                tier === "trending" ? "bg-gradient-to-r from-purple-500 to-indigo-500" :
                "bg-gradient-to-r from-emerald-500 to-teal-500"
              )}
              style={{ width: `${Math.min(100, (percentAboveAvg / 400) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </ChartCard>
  );
}

export function TopPostsSpotlight() {
  const { data: topPosts, isLoading } = useTopPerformingPosts({ days: 7, limit: 3, metric: "impressions" });
  const stats = useDashboardStats();

  const theme = useMemo(() => buildPremiumTheme(), []);
  const series = getPremiumSeries();

  // Calculate average views per post
  const avgViewsPerPost = stats.totalPosts > 0
    ? (stats.totalReach || stats.totalViews) / stats.totalPosts
    : 0;

  // Comparison bar data
  const barData = (topPosts || []).slice(0, 3).map((post, i) => ({
    post: `#${i + 1}`,
    Views: post.views || post.impressions,
    Average: Math.round(avgViewsPerPost),
  }));

  if (isLoading) {
    return (
      <ChartCard animationIndex={1} accentColor={series[4]} accentColorEnd={series[5]}>
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </ChartCard>
    );
  }

  if (!topPosts || topPosts.length === 0) {
    return (
      <ChartCard animationIndex={1} accentColor={series[4]} accentColorEnd={series[5]}>
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-4 h-4 text-warning" />
          <h3 className="font-display font-semibold text-sm">Top Posts This Week</h3>
        </div>
        <p className="text-sm text-muted-foreground">No posts published this week yet.</p>
      </ChartCard>
    );
  }

  return (
    <ChartCard noPadding animationIndex={1} accentColor={series[4]} accentColorEnd={series[5]}>
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-warning" />
            <h3 className="font-display font-semibold text-sm text-card-foreground">
              Top Posts This Week
            </h3>
          </div>
          <span style={kpiTypography.label} className="text-muted-foreground">
            vs average
          </span>
        </div>
      </div>

      {/* Post cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-4">
        {(topPosts || []).slice(0, 3).map((post, i) => (
          <PostCard key={post.postId} post={post} avgViews={avgViewsPerPost} index={i} />
        ))}
      </div>

      {/* Comparison chart */}
      {barData.length > 0 && avgViewsPerPost > 0 && (
        <div className="h-24 px-4 pb-4 pt-2">
          <ResponsiveBar
            data={barData}
            theme={theme}
            keys={["Views", "Average"]}
            indexBy="post"
            colors={[series[0], "hsl(220 9% 70%)"]}
            margin={{ top: 4, right: 8, bottom: 20, left: 40 }}
            padding={0.3}
            groupMode="grouped"
            borderRadius={4}
            axisBottom={{ tickSize: 0, tickPadding: 4 }}
            axisLeft={{
              tickSize: 0,
              tickPadding: 4,
              format: (v) => formatMetric(Number(v)),
            }}
            enableGridX={false}
            enableGridY={false}
            enableLabel={false}
            isInteractive={false}
          />
        </div>
      )}
    </ChartCard>
  );
}
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/dashboard/TopPostsSpotlight.tsx
git commit -m "feat(dashboard): add TopPostsSpotlight with performance tier animations"
```

---

### Task 5: Create ActivityTimeline with minimalistic Dribbble-inspired design

**Files:**
- Create: `src/components/dashboard/ActivityTimeline.tsx`

**Step 1: Create the minimalistic timeline component**

Inspired by the Dribbble reference: thin vertical rail, relative time labels, floating detail cards on hover, dotted "load more" section.

```tsx
import { useState } from "react";
import { usePosts } from "@/hooks/useGetLatePosts";
import { usePostDrafts } from "@/hooks/usePostDrafts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { ChartCard } from "@/components/analytics-v2/widgets-v2/ChartCard";
import { getPremiumSeries, kpiTypography } from "@/components/analytics-v2/widgets-v2/premium-theme";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Calendar, Clock, FileEdit, CheckCircle, ChevronDown } from "lucide-react";
import { FaInstagram, FaTwitter, FaLinkedin, FaFacebook, FaTiktok } from "react-icons/fa";
import { SiBluesky } from "react-icons/si";
import { formatDistanceToNowStrict } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

const platformIcons: Record<string, React.ElementType> = {
  instagram: FaInstagram, twitter: FaTwitter, linkedin: FaLinkedin,
  facebook: FaFacebook, tiktok: FaTiktok, bluesky: SiBluesky,
};

interface TimelineItem {
  id: string;
  rawId: string;
  type: "scheduled" | "approval" | "draft";
  time: Date;
  content: string;
  platforms: string[];
  approvalToken?: string;
}

function relativeTime(date: Date): string {
  try {
    return formatDistanceToNowStrict(date, { addSuffix: false })
      .replace(" seconds", "s")
      .replace(" second", "s")
      .replace(" minutes", "m")
      .replace(" minute", "m")
      .replace(" hours", "h")
      .replace(" hour", "h")
      .replace(" days", "d")
      .replace(" day", "d")
      .replace(" months", "mo")
      .replace(" month", "mo");
  } catch {
    return "";
  }
}

const typeConfig = {
  scheduled: {
    icon: Clock,
    label: "Scheduled",
    dotClass: "bg-primary",
    badgeClass: "bg-primary/10 text-primary",
  },
  approval: {
    icon: CheckCircle,
    label: "Approval",
    dotClass: "bg-warning",
    badgeClass: "bg-warning/10 text-warning",
  },
  draft: {
    icon: FileEdit,
    label: "Draft",
    dotClass: "bg-muted-foreground/40",
    badgeClass: "bg-muted text-muted-foreground",
  },
};

export function ActivityTimeline() {
  const navigate = useNavigate();
  const { data: company } = useCompany();
  const companyId = company?.id;
  const [expanded, setExpanded] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const { data: scheduledPosts, isLoading: postsLoading } = usePosts({ status: "scheduled" });
  const { data: drafts, isLoading: draftsLoading } = usePostDrafts();

  const { data: pendingApprovals, isLoading: approvalsLoading } = useQuery({
    queryKey: ["pending-approvals-timeline", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("post_approvals")
        .select("id, created_at, platform_contents, selected_account_ids, status, expires_at, token")
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

  // Build items
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
      });
    }
  }

  for (const approval of pendingApprovals || []) {
    const contents = approval.platform_contents as any;
    let preview = "Post awaiting approval";
    if (Array.isArray(contents) && contents.length > 0) {
      preview = contents[0]?.content?.slice(0, 120) || preview;
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
      platforms: (draft.selected_account_ids || []).length > 0 ? ["multiple"] : [],
    });
  }

  items.sort((a, b) => a.time.getTime() - b.time.getTime());
  const displayItems = expanded ? items.slice(0, 12) : items.slice(0, 5);
  const hasMore = items.length > 5;

  const handleItemClick = (item: TimelineItem) => {
    switch (item.type) {
      case "scheduled":
        navigate("/app/content?tab=calendar");
        break;
      case "draft":
        navigate(`/app/content?tab=compose&draft=${item.rawId}`);
        break;
      case "approval":
        if (item.approvalToken) {
          navigate(`/approve/${item.approvalToken}`);
        }
        break;
    }
  };

  const series = getPremiumSeries();

  return (
    <ChartCard animationIndex={3} accentColor={series[2]} accentColorEnd={series[3]}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-display font-semibold text-sm text-card-foreground">
            Activity Timeline
          </h3>
        </div>
        {items.length > 0 && (
          <span style={kpiTypography.label} className="text-muted-foreground">
            {items.length} item{items.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4 pl-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-8 h-3 rounded" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : displayItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center mb-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">Nothing scheduled</p>
          <p className="text-xs text-muted-foreground mt-0.5">Time to plan some content!</p>
        </div>
      ) : (
        <div className="relative">
          {displayItems.map((item, idx) => {
            const config = typeConfig[item.type];
            const isLast = idx === displayItems.length - 1 && !hasMore;
            const isHovered = hoveredId === item.id;

            return (
              <div
                key={item.id}
                className="flex gap-0 cursor-pointer group"
                onClick={() => handleItemClick(item)}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Time label */}
                <div className="w-10 shrink-0 text-right pr-3 pt-0.5">
                  <span className="text-[11px] text-muted-foreground tabular-nums font-medium">
                    {relativeTime(item.time)}
                  </span>
                </div>

                {/* Rail */}
                <div className="flex flex-col items-center shrink-0">
                  <div
                    className={cn(
                      "w-2.5 h-2.5 rounded-full shrink-0 transition-transform duration-200",
                      config.dotClass,
                      item.type === "draft" && "ring-2 ring-background bg-transparent border-2 border-muted-foreground/40",
                      isHovered && "scale-125",
                    )}
                  />
                  {!isLast && (
                    <div className="w-px flex-1 bg-border/60 min-h-[32px]" />
                  )}
                </div>

                {/* Content */}
                <div className={cn(
                  "ml-3 pb-5 min-w-0 flex-1 rounded-lg transition-colors duration-150 -mt-0.5 px-2 py-1",
                  isHovered && "bg-muted/40",
                )}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge variant="secondary" className={cn("text-[10px] border-0 py-0 h-4", config.badgeClass)}>
                      {config.label}
                    </Badge>
                    {item.platforms.slice(0, 3).map((p, pi) => {
                      const PIcon = platformIcons[p];
                      return PIcon ? <PIcon key={pi} className="w-3 h-3 text-muted-foreground" /> : null;
                    })}
                  </div>
                  <p className="text-sm text-card-foreground line-clamp-2 leading-relaxed">
                    {item.content}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Load more */}
          {hasMore && !expanded && (
            <div className="flex gap-0">
              <div className="w-10 shrink-0" />
              <div className="flex flex-col items-center shrink-0">
                <div className="flex flex-col items-center gap-1 py-1">
                  <div className="w-1 h-1 rounded-full bg-border" />
                  <div className="w-1 h-1 rounded-full bg-border" />
                  <div className="w-1 h-1 rounded-full bg-border" />
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
                className="ml-3 text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
              >
                Load more <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </ChartCard>
  );
}
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/dashboard/ActivityTimeline.tsx
git commit -m "feat(dashboard): add ActivityTimeline with minimalistic Dribbble-inspired design"
```

---

### Task 6: Update EngagementChart to use premium design system

**Files:**
- Modify: `src/components/dashboard/EngagementChart.tsx`

**Step 1: Refactor EngagementChart to use ChartCard, premium theme, and fix dark mode tooltip**

Replace the component to use `ChartCard` wrapper, `buildPremiumTheme()` instead of `nivoTheme`, fix tooltip colors for dark mode using CSS variables, and fix the empty state spinner icon.

Key changes:
- Wrap in `ChartCard` instead of plain `div.rounded-xl`
- Use `buildPremiumTheme()` from premium-theme.ts
- Use `getPremiumSeries()` for chart colors
- Fix tooltip background: use `hsl(var(--card))` instead of hardcoded white
- Fix empty state: use `BarChart3` icon instead of `Loader2` spinner
- Add `animationIndex={4}` for stagger

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/dashboard/EngagementChart.tsx
git commit -m "feat(dashboard): upgrade EngagementChart to premium design + fix dark mode tooltip"
```

---

### Task 7: Rewrite Index.tsx with new layout composition

**Files:**
- Modify: `src/pages/Index.tsx`

**Step 1: Replace the Index page with the new dashboard layout**

```tsx
import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { HeroKpiBar } from "@/components/dashboard/HeroKpiBar";
import { AiBriefingPanel } from "@/components/dashboard/AiBriefingPanel";
import { TopPostsSpotlight } from "@/components/dashboard/TopPostsSpotlight";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";
import { EngagementChart } from "@/components/dashboard/EngagementChart";
import { OnboardingProgressWidget } from "@/components/dashboard/OnboardingProgressWidget";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0, 0, 0.2, 1] as const } },
};

const Index = () => {
  const navigate = useNavigate();
  const [briefingOpen, setBriefingOpen] = useState(false);

  return (
    <DashboardLayout>
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="space-y-5"
      >
        {/* Header */}
        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1 text-sm">Your social media command center.</p>
          </div>
          <Button className="gradient-accent shadow-glow hover:shadow-lg transition-shadow" onClick={() => navigate('/app/content?tab=posts')}>
            <Plus size={18} className="mr-2" />Create Post
          </Button>
        </motion.div>

        {/* Onboarding — conditional */}
        <motion.div variants={fadeUp}>
          <OnboardingProgressWidget />
        </motion.div>

        {/* Hero KPI Bar + AI Briefing overlay */}
        <motion.div variants={fadeUp} className="relative">
          <HeroKpiBar onToggleBriefing={() => setBriefingOpen(!briefingOpen)} />
          <AiBriefingPanel open={briefingOpen} onClose={() => setBriefingOpen(false)} />
        </motion.div>

        {/* Top Posts Spotlight */}
        <motion.div variants={fadeUp}>
          <TopPostsSpotlight />
        </motion.div>

        {/* Timeline + Engagement Chart */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          <ActivityTimeline />
          <EngagementChart />
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
};

export default Index;
```

**Step 2: Type-check and verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Visual check**

Run: `npm run dev`
Open browser to `http://localhost:8080/app` and verify:
- Hero KPI bar renders with 4 cells + sparklines
- Sparkles button opens/closes the briefing panel
- Top 3 posts display with appropriate tier animations
- Timeline shows items with vertical rail design
- Engagement chart uses glassmorphism styling
- All animations play on page load

**Step 4: Commit**

```bash
git add src/pages/Index.tsx
git commit -m "feat(dashboard): rewrite Index with Command Center v2 layout"
```

---

### Task 8: Final cleanup and verification

**Files:**
- Verify: All new/modified files compile and render

**Step 1: Full type-check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 2: Lint check**

Run: `npm run lint`
Expected: No errors (or only pre-existing warnings)

**Step 3: Run existing tests**

Run: `npm run test -- --run`
Expected: All tests pass

**Step 4: Visual verification**

Open the dev server and check:
1. Hero bar: 4 sparkline cells with trend badges, loading states
2. AI briefing: opens on Sparkles click, closes on outside click or Escape
3. Top posts: 3 cards with correct tier animations (fire glow, shimmer, pulse)
4. Timeline: vertical rail, relative time, hover states, dotted load more
5. Engagement chart: glassmorphism card, dark-mode-safe tooltips
6. Responsive: check on mobile viewport (hero cells stack well, timeline stays clean)
7. Dark mode: switch theme and verify all cards/tooltips/animations render correctly

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat(dashboard): complete Command Center v2 redesign

- Hero KPI bar with inline Nivo sparklines and trend badges
- AI briefing as compact floating overlay panel
- Top 3 posts spotlight with fire/trending/growing animations
- Minimalistic activity timeline inspired by Dribbble reference
- Engagement chart upgraded to premium glassmorphism design
- Removed duplicate TrendMetrics and RecentPostsTable widgets"
```
