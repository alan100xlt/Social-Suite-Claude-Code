import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Focus, X, Sparkles } from "lucide-react";
import { FaInstagram, FaTwitter, FaFacebook, FaLinkedin, FaTiktok, FaYoutube } from "react-icons/fa";
import { SiBluesky, SiThreads } from "react-icons/si";

type PostStatus = "all" | "draft" | "scheduled" | "published" | "failed";

const platforms = [
  { key: "twitter", icon: FaTwitter, label: "Twitter", activeColor: "bg-sky-500 text-white border-sky-500" },
  { key: "linkedin", icon: FaLinkedin, label: "LinkedIn", activeColor: "bg-blue-700 text-white border-blue-700" },
  { key: "instagram", icon: FaInstagram, label: "Instagram", activeColor: "bg-pink-500 text-white border-pink-500" },
  { key: "facebook", icon: FaFacebook, label: "Facebook", activeColor: "bg-blue-600 text-white border-blue-600" },
  { key: "tiktok", icon: FaTiktok, label: "TikTok", activeColor: "bg-foreground text-background border-foreground" },
  { key: "youtube", icon: FaYoutube, label: "YouTube", activeColor: "bg-red-500 text-white border-red-500" },
  { key: "bluesky", icon: SiBluesky, label: "Bluesky", activeColor: "bg-sky-400 text-white border-sky-400" },
  { key: "threads", icon: SiThreads, label: "Threads", activeColor: "bg-foreground text-background border-foreground" },
] as const;

const statuses: { key: PostStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "scheduled", label: "Scheduled" },
  { key: "published", label: "Published" },
  { key: "failed", label: "Failed" },
];

export interface CalendarFilterState {
  platforms: Set<string>;
  status: PostStatus;
  search: string;
  focusMode: boolean;
  showBestTimes: boolean;
}

interface CalendarFiltersProps {
  filters: CalendarFilterState;
  onChange: (filters: CalendarFilterState) => void;
}

export function CalendarFilters({ filters, onChange }: CalendarFiltersProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  const togglePlatform = (key: string) => {
    const next = new Set(filters.platforms);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange({ ...filters, platforms: next });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Platform pills */}
      <div className="flex items-center gap-1">
        {platforms.map((p) => {
          const active = filters.platforms.size === 0 || filters.platforms.has(p.key);
          const Icon = p.icon;
          return (
            <button
              key={p.key}
              onClick={() => togglePlatform(p.key)}
              className={cn(
                "flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
                active
                  ? p.activeColor
                  : "border-border bg-background text-muted-foreground opacity-50 hover:opacity-75"
              )}
            >
              <Icon className="h-3 w-3" />
              <span className="hidden sm:inline">{p.label}</span>
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="h-5 w-px bg-border" />

      {/* Status chips */}
      <div className="flex items-center gap-1">
        {statuses.map((s) => (
          <button
            key={s.key}
            onClick={() => onChange({ ...filters, status: s.key })}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium transition-all",
              filters.status === s.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="h-5 w-px bg-border" />

      {/* Focus mode toggle */}
      <Button
        variant={filters.focusMode ? "default" : "outline"}
        size="sm"
        className={cn("h-7 gap-1 text-xs", filters.focusMode && "bg-amber-500 hover:bg-amber-600 text-white border-amber-500")}
        onClick={() => onChange({ ...filters, focusMode: !filters.focusMode })}
      >
        <Focus className="h-3 w-3" />
        Focus
      </Button>

      {/* Best times toggle */}
      <Button
        variant={filters.showBestTimes ? "default" : "outline"}
        size="sm"
        className={cn("h-7 gap-1 text-xs", filters.showBestTimes && "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500")}
        onClick={() => onChange({ ...filters, showBestTimes: !filters.showBestTimes })}
      >
        <Sparkles className="h-3 w-3" />
        Best times
      </Button>

      {/* Search */}
      {searchOpen ? (
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder="Search posts…"
            className="h-7 w-48 pl-7 pr-7 text-xs"
          />
          <button
            onClick={() => { onChange({ ...filters, search: "" }); setSearchOpen(false); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setSearchOpen(true)}>
          <Search className="h-3 w-3" />
          Search
        </Button>
      )}
    </div>
  );
}

export function createDefaultFilters(): CalendarFilterState {
  return { platforms: new Set(), status: "all", search: "", focusMode: false, showBestTimes: true };
}
