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

  // Close on click outside
  useEffect(() => {
    if (!open) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open, onClose]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["dashboard-briefing"] });
  };

  // Parse briefing into bullet points (split on newlines, max 4)
  const bullets = briefing
    ? briefing
        .split("\n")
        .map((line) => line.replace(/^[-*•]\s*/, "").trim())
        .filter(Boolean)
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
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="absolute top-full right-0 mt-2 w-80 sm:w-96 z-50 rounded-xl overflow-hidden"
          style={{
            background: "hsl(var(--card) / 0.92)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid hsl(var(--border) / 0.5)",
            boxShadow:
              "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.05)",
          }}
        >
          {/* Gradient accent top border */}
          <div
            className="h-[3px] w-full"
            style={{
              background: "linear-gradient(to right, hsl(var(--primary)), #3b82f6)",
            }}
          />

          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 pt-3 pb-2">
            <div className="flex-shrink-0 w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-semibold text-sm text-card-foreground flex-1">
              AI Briefing
            </span>
            <button
              onClick={handleRefresh}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50"
              title="Refresh briefing"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-4 pb-4 pt-1">
            {isLoading ? (
              <div className="space-y-2.5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-4/6" />
              </div>
            ) : error ? (
              <p className="text-xs text-muted-foreground">
                Unable to generate briefing right now.
              </p>
            ) : bullets.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No briefing available.
              </p>
            ) : (
              <ul className="space-y-2">
                {bullets.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                    <span
                      className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-primary"
                      aria-hidden="true"
                    />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
