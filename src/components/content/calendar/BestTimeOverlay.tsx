import type { BestTimeSlot } from "@/hooks/useBestTimeToPost";

interface BestTimeTintProps {
  slots: BestTimeSlot[];
  dayOfWeek: number;
  hour: number;
  visible: boolean;
}

/**
 * Returns a background tint class if this cell matches a best-time slot.
 * Used inline in the cell className — no DOM element rendered.
 */
export function getBestTimeTint({ slots, dayOfWeek, hour, visible }: BestTimeTintProps): string {
  if (!visible) return "";
  const match = slots.find((s) => s.day_of_week === dayOfWeek && s.hour === hour);
  if (!match) return "";
  // Stronger tint for higher engagement
  if (match.avg_engagement > 5) return "bg-emerald-100/70 dark:bg-emerald-900/25";
  return "bg-emerald-100/50 dark:bg-emerald-950/15";
}

/** Returns true if this cell is a best-time slot */
export function isBestTimeSlot(slots: BestTimeSlot[], dayOfWeek: number, hour: number): boolean {
  return slots.some((s) => s.day_of_week === dayOfWeek && s.hour === hour);
}

/**
 * Legacy component kept for backward compatibility.
 * The new approach uses getBestTimeTint() as a className utility instead.
 */
export function BestTimeMarker() {
  return null;
}
