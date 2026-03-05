import { cn } from "@/lib/utils";

interface ChartCardProps {
  children: React.ReactNode;
  className?: string;
  /** Remove default padding */
  noPadding?: boolean;
  /** Accent gradient border on top */
  accentColor?: string;
  /** Secondary accent for gradient */
  accentColorEnd?: string;
  /** Stagger index for enter animation (0-based) */
  animationIndex?: number;
  /** Small muted label showing the active date range (e.g. "Last 14 days") */
  timeframeLabel?: string;
}

/**
 * Glassmorphism card wrapper for premium chart widgets.
 *
 * Features:
 * - Semi-transparent background with backdrop blur
 * - Multi-layered shadows for depth
 * - Optional gradient accent top border
 * - Smooth hover lift animation
 * - CSS enter animation with stagger support
 */
export function ChartCard({
  children,
  className,
  noPadding = false,
  accentColor,
  accentColorEnd,
  animationIndex,
  timeframeLabel,
}: ChartCardProps) {
  const animationDelay = animationIndex !== undefined ? `${animationIndex * 80}ms` : undefined;

  return (
    <div
      className={cn(
        // Base glassmorphism
        "relative overflow-hidden rounded-2xl",
        "bg-card/80 dark:bg-card/60",
        "backdrop-blur-xl",
        "border border-border/50 dark:border-white/[0.08]",
        // Multi-layered shadow
        "shadow-[0_1px_2px_hsl(220_13%_91%/0.3),0_4px_16px_-2px_hsl(224_71%_25%/0.06),0_12px_40px_-8px_hsl(224_71%_25%/0.08)]",
        "dark:shadow-[0_1px_2px_hsl(0_0%_0%/0.3),0_4px_16px_-2px_hsl(0_0%_0%/0.2),0_12px_40px_-8px_hsl(0_0%_0%/0.25)]",
        // Hover lift
        "transition-all duration-300 ease-out",
        "hover:shadow-[0_1px_2px_hsl(220_13%_91%/0.3),0_8px_24px_-4px_hsl(224_71%_25%/0.1),0_20px_50px_-12px_hsl(224_71%_25%/0.12)]",
        "dark:hover:shadow-[0_1px_2px_hsl(0_0%_0%/0.3),0_8px_24px_-4px_hsl(0_0%_0%/0.3),0_20px_50px_-12px_hsl(0_0%_0%/0.35)]",
        "hover:-translate-y-0.5",
        // Enter animation
        animationIndex !== undefined && "animate-chart-enter",
        // Content
        !noPadding && "p-6",
        className
      )}
      style={animationDelay ? { animationDelay } : undefined}
    >
      {/* Gradient accent top border */}
      {accentColor && (
        <div
          className="absolute top-0 left-0 right-0 h-[3px]"
          style={{
            background: accentColorEnd
              ? `linear-gradient(90deg, ${accentColor}, ${accentColorEnd})`
              : accentColor,
          }}
        />
      )}

      {/* Timeframe badge */}
      {timeframeLabel && (
        <div className="absolute top-3 right-4 z-20">
          <span className="text-[10px] font-medium text-muted-foreground/70 bg-muted/50 backdrop-blur-sm rounded-full px-2 py-0.5">
            {timeframeLabel}
          </span>
        </div>
      )}

      {/* Subtle inner glow */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none bg-gradient-to-b from-white/40 to-transparent dark:from-white/[0.03] dark:to-transparent" />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
