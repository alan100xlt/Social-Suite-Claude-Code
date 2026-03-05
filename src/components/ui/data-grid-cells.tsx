import type { ICellRendererParams } from "ag-grid-community";
import type { ComponentType } from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  Eye,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Star,
} from "lucide-react";
import { FaXTwitter, FaFacebookF, FaInstagram, FaLinkedinIn, FaTiktok } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";

// ---------- Helpers ----------

export function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

// ---------- Platform ----------

export const platformMeta: Record<string, { icon: ComponentType<{ className?: string }>; color: string; bg: string; label: string }> = {
  twitter: { icon: FaXTwitter, color: "text-gray-900", bg: "bg-gray-100", label: "X" },
  facebook: { icon: FaFacebookF, color: "text-blue-600", bg: "bg-blue-50", label: "Facebook" },
  instagram: { icon: FaInstagram, color: "text-pink-600", bg: "bg-pink-50", label: "Instagram" },
  linkedin: { icon: FaLinkedinIn, color: "text-indigo-600", bg: "bg-indigo-50", label: "LinkedIn" },
  tiktok: { icon: FaTiktok, color: "text-gray-900", bg: "bg-gray-50", label: "TikTok" },
};

export function PlatformIconsRenderer<T extends { platform?: string[] }>(
  params: ICellRendererParams<T>
) {
  const platforms: string[] = params.value || [];
  return (
    <div className="flex items-center gap-1.5">
      {platforms.map((p) => {
        const m = platformMeta[p];
        if (!m) return null;
        const Icon = m.icon;
        return (
          <span
            key={p}
            className={`inline-flex items-center justify-center h-7 w-7 rounded-full ${m.bg}`}
            title={m.label}
          >
            <Icon className={`h-3.5 w-3.5 ${m.color}`} />
          </span>
        );
      })}
    </div>
  );
}

// ---------- Status (dot-prefixed) ----------

const statusStyles: Record<string, { dot: string; text: string }> = {
  published: { dot: "bg-emerald-500", text: "text-emerald-700" },
  draft: { dot: "bg-gray-400", text: "text-gray-600" },
  scheduled: { dot: "bg-blue-500", text: "text-blue-700" },
  failed: { dot: "bg-red-500", text: "text-red-700" },
};

export function DotStatusRenderer<T>(params: ICellRendererParams<T>) {
  const status = params.value as string;
  const s = statusStyles[status] || statusStyles.draft;
  return (
    <span className={`inline-flex items-center gap-2 text-sm font-medium capitalize ${s.text}`}>
      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

// ---------- Source (soft pill) ----------

const sourceStyles: Record<string, string> = {
  manual: "bg-gray-50 text-gray-600",
  ai: "bg-purple-50 text-purple-700",
  rss: "bg-amber-50 text-amber-700",
  automation: "bg-emerald-50 text-emerald-700",
};

const sourceLabels: Record<string, string> = {
  manual: "Manual",
  ai: "AI",
  rss: "RSS",
  automation: "Automation",
};

export function SourcePillRenderer<T>(params: ICellRendererParams<T>) {
  const source = params.value as string;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${sourceStyles[source] || "bg-gray-50 text-gray-600"}`}
    >
      {sourceLabels[source] || source}
    </span>
  );
}

// ---------- Two-line Post/Title cell ----------

export function TwoLineTitleRenderer<
  T extends { title?: string; company?: string; platform?: string[]; status?: string; publishedAt?: string }
>(params: ICellRendererParams<T>) {
  const data = params.data;
  if (!data) return null;
  const initials = (data.company || "?").slice(0, 2).toUpperCase();
  const hue = (data.company || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const bgColor = `hsl(${hue}, 55%, 50%)`;

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div className="flex items-center gap-3 py-1 min-w-0 cursor-default">
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
            style={{ backgroundColor: bgColor }}
          >
            {initials}
          </div>
          <div className="flex flex-col min-w-0 leading-tight">
            <span className="truncate text-sm font-medium text-[#1a1a2e]">
              {data.title}
            </span>
            <span className="truncate text-xs text-gray-400">{data.company}</span>
          </div>
        </div>
      </HoverCardTrigger>
      <HoverCardContent side="bottom" align="start" className="w-80 p-0 overflow-hidden">
        {/* Preview image */}
        <div
          className="h-36 w-full flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${bgColor}22, ${bgColor}44)` }}
        >
          <div
            className="h-16 w-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg"
            style={{ backgroundColor: bgColor }}
          >
            {initials}
          </div>
        </div>
        {/* Content */}
        <div className="p-3 space-y-2">
          <p className="text-sm font-semibold text-[#1a1a2e] leading-snug">
            {data.title}
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-medium text-gray-700">{data.company}</span>
            <span>&middot;</span>
            <span className="capitalize">{data.status}</span>
            {data.publishedAt && (
              <>
                <span>&middot;</span>
                <span>{new Date(data.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              </>
            )}
          </div>
          {data.platform && data.platform.length > 0 && (
            <div className="flex items-center gap-1.5 pt-1">
              {data.platform.map((p) => {
                const m = platformMeta[p];
                if (!m) return null;
                const Icon = m.icon;
                return (
                  <span
                    key={p}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${m.bg} ${m.color}`}
                  >
                    <Icon className="h-3 w-3" />
                    {m.label}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

// ---------- Two-line Date cell ----------

export function TwoLineDateRenderer<T extends { publishedAt?: string }>(
  params: ICellRendererParams<T>
) {
  const dateStr = params.value as string;
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const formatted = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const dayOfWeek = d.toLocaleDateString("en-US", { weekday: "long" });
  return (
    <div className="flex flex-col leading-tight py-1">
      <span className="text-sm font-medium text-[#1a1a2e]">{formatted}</span>
      <span className="text-xs text-gray-400">{dayOfWeek}</span>
    </div>
  );
}

// ---------- Engagement (lighter icons) ----------

export function EngagementRenderer<
  T extends { likes?: number; comments?: number; shares?: number }
>(params: ICellRendererParams<T>) {
  const data = params.data;
  if (!data) return null;
  return (
    <div className="flex items-center gap-3 text-sm text-gray-500">
      <span className="flex items-center gap-1" title="Likes">
        <Heart className="h-3.5 w-3.5 text-rose-400" />
        {formatNumber(data.likes || 0)}
      </span>
      <span className="flex items-center gap-1" title="Comments">
        <MessageCircle className="h-3.5 w-3.5 text-blue-400" />
        {formatNumber(data.comments || 0)}
      </span>
      <span className="flex items-center gap-1" title="Shares">
        <Share2 className="h-3.5 w-3.5 text-green-400" />
        {formatNumber(data.shares || 0)}
      </span>
    </div>
  );
}

// ---------- Rate badge ----------

export function RateBadgeRenderer<T>(params: ICellRendererParams<T>) {
  const rate = params.value as number;
  const color =
    rate >= 5
      ? "text-emerald-700 bg-emerald-50"
      : rate >= 2
        ? "text-amber-700 bg-amber-50"
        : "text-red-700 bg-red-50";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}
    >
      {rate.toFixed(1)}%
    </span>
  );
}

// ---------- Actions (hover reveal) ----------

export function ActionsRenderer<T>(params: ICellRendererParams<T>) {
  return (
    <div className="flex items-center gap-0.5">
      <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-gray-700" title="View">
        <Eye className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-gray-700" title="Edit">
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-600" title="Delete">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ---------- Expand toggle ----------

export function ExpandToggleRenderer<T extends { type?: string; isExpanded?: boolean; id?: number }>(
  params: ICellRendererParams<T>
) {
  const data = params.data;
  if (!data || data.type === "detail") return null;
  return (
    <button
      className="flex items-center justify-center w-full h-full"
      onClick={() => {
        const event = new CustomEvent("toggle-expand", {
          detail: { id: data.id },
        });
        document.dispatchEvent(event);
      }}
    >
      {data.isExpanded ? (
        <ChevronDown className="h-4 w-4 text-gray-400" />
      ) : (
        <ChevronRight className="h-4 w-4 text-gray-400" />
      )}
    </button>
  );
}

// ---------- Detail row (full-width) ----------

export function DetailRowRenderer<
  T extends {
    detailPlatform?: string;
    detailLikes?: number;
    detailComments?: number;
    detailShares?: number;
    detailViews?: number;
  }
>(params: ICellRendererParams<T>) {
  const data = params.data;
  if (!data) return null;

  const metrics = [
    { icon: Heart, label: "Likes", value: data.detailLikes || 0, color: "text-rose-400", bg: "bg-rose-50" },
    { icon: MessageCircle, label: "Comments", value: data.detailComments || 0, color: "text-blue-400", bg: "bg-blue-50" },
    { icon: Share2, label: "Shares", value: data.detailShares || 0, color: "text-green-400", bg: "bg-green-50" },
    { icon: Eye, label: "Views", value: data.detailViews || 0, color: "text-violet-400", bg: "bg-violet-50" },
  ];

  const pm = platformMeta[data.detailPlatform || ""];
  const PlatIcon = pm?.icon;

  return (
    <div className="pl-[90px] pr-6 py-3 bg-gray-50/60 border-l-2 border-l-emerald-200">
      <div className="flex items-center gap-4">
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 ${pm?.bg || "bg-gray-50"}`}
        >
          {PlatIcon && <PlatIcon className={`h-3.5 w-3.5 ${pm?.color || "text-gray-700"}`} />}
          <span className="text-sm font-semibold">
            {pm?.label || data.detailPlatform}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-1">
          {metrics.map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${bg}`}>
              <Icon className={`h-3.5 w-3.5 ${color}`} />
              <div className="flex flex-col leading-none">
                <span className="text-[11px] text-gray-400">{label}</span>
                <span className="text-sm font-semibold text-gray-700">
                  {formatNumber(value)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5 shrink-0 border-gray-200"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View on {data.detailPlatform}
        </Button>
      </div>
    </div>
  );
}

// ---------- Star Rating ----------

export function StarRatingRenderer<T>(params: ICellRendererParams<T>) {
  const rating = (params.value as number) || 0;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3.5 w-3.5 ${
            star <= rating
              ? "fill-amber-400 text-amber-400"
              : "fill-none text-gray-300"
          }`}
        />
      ))}
    </div>
  );
}

// ---------- Progress Bar ----------

export function ProgressBarRenderer<T>(params: ICellRendererParams<T>) {
  const value = Math.min(100, Math.max(0, (params.value as number) || 0));
  const barColor =
    value >= 75 ? "#22c55e" : value >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "calc(100% - 4px)",
      }}
    >
      <div
        style={{
          flex: 1,
          height: 8,
          borderRadius: 4,
          backgroundColor: "#f3f4f6",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${value}%`,
            borderRadius: 4,
            backgroundColor: barColor,
          }}
        />
      </div>
      <span style={{ fontSize: 12, fontWeight: 500, color: "#6b7280", flexShrink: 0 }}>
        {Math.round(value)}%
      </span>
    </div>
  );
}

// ---------- Sparkline (pure SVG) ----------

export function SparklineRenderer<T>(params: ICellRendererParams<T>) {
  const points: number[] = params.value as number[];
  if (!points || points.length < 2) return null;

  const w = 80;
  const h = 24;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;

  const coords = points.map((v, i) => ({
    x: (i / (points.length - 1)) * w,
    y: h - ((v - min) / range) * (h - 4) - 2,
  }));

  const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const trending = points[points.length - 1] >= points[0];
  const strokeColor = trending ? "#22c55e" : "#ef4444";
  const fillColor = trending ? "#22c55e10" : "#ef444410";

  // Build area path (fill under the line)
  const areaPath = `M${coords[0].x},${h} ${coords.map((c) => `L${c.x},${c.y}`).join(" ")} L${coords[coords.length - 1].x},${h} Z`;

  return (
    <svg width={w} height={h} className="shrink-0">
      <path d={areaPath} fill={fillColor} />
      <polyline
        points={polyline}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      <circle
        cx={coords[coords.length - 1].x}
        cy={coords[coords.length - 1].y}
        r={2.5}
        fill={strokeColor}
      />
    </svg>
  );
}

// ---------- Avatar Stack ----------

const AVATAR_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#22c55e", "#3b82f6",
  "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#06b6d4",
];

export function AvatarStackRenderer<T>(params: ICellRendererParams<T>) {
  const names: string[] = params.value as string[];
  if (!names || names.length === 0) return null;

  const maxShow = 3;
  const shown = names.slice(0, maxShow);
  const overflow = names.length - maxShow;

  return (
    <div className="flex items-center">
      {shown.map((name, i) => {
        const initial = name.charAt(0).toUpperCase();
        const colorIdx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
        return (
          <div
            key={name}
            className="h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold border-2 border-white"
            style={{
              backgroundColor: AVATAR_COLORS[colorIdx],
              marginLeft: i > 0 ? -8 : 0,
              zIndex: maxShow - i,
            }}
            title={name}
          >
            {initial}
          </div>
        );
      })}
      {overflow > 0 && (
        <div
          className="h-7 w-7 rounded-full flex items-center justify-center text-gray-600 text-[10px] font-bold border-2 border-white bg-gray-100"
          style={{ marginLeft: -8, zIndex: 0 }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}

// ---------- Toggle / Switch ----------

export function ToggleRenderer<T>(params: ICellRendererParams<T>) {
  const checked = params.value as boolean;
  return (
    <Switch
      checked={checked}
      className="data-[state=checked]:bg-emerald-500"
      onCheckedChange={() => {
        // In a real grid, this would update the data via API
      }}
    />
  );
}

// ---------- Tag List ----------

const TAG_COLORS: Record<string, string> = {
  tech: "bg-blue-50 text-blue-700",
  business: "bg-emerald-50 text-emerald-700",
  social: "bg-pink-50 text-pink-700",
  marketing: "bg-purple-50 text-purple-700",
  news: "bg-red-50 text-red-700",
  opinion: "bg-amber-50 text-amber-700",
  tutorial: "bg-indigo-50 text-indigo-700",
  research: "bg-cyan-50 text-cyan-700",
};

export function TagListRenderer<T>(params: ICellRendererParams<T>) {
  const tags: string[] = params.value as string[];
  if (!tags || tags.length === 0) return null;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {tags.slice(0, 3).map((tag) => (
        <span
          key={tag}
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${TAG_COLORS[tag] || "bg-gray-50 text-gray-600"}`}
        >
          {tag}
        </span>
      ))}
      {tags.length > 3 && (
        <span className="text-[11px] text-gray-400">+{tags.length - 3}</span>
      )}
    </div>
  );
}

// ---------- Thumbnail ----------

export function ThumbnailRenderer<T>(params: ICellRendererParams<T>) {
  const src = params.value as string;
  if (!src) return null;

  return (
    <div className="flex items-center justify-center py-1">
      <img
        src={src}
        alt=""
        className="h-10 w-14 rounded object-cover bg-gray-100"
        loading="lazy"
      />
    </div>
  );
}
