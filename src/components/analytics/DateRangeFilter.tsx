import { useState } from "react";
import { format, differenceInDays, subDays } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { DateRange } from "react-day-picker";

export type Granularity = "day" | "week" | "month";

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onRangeChange: (start: string, end: string) => void;
  companyCreatedAt?: string;
}

const PRESETS = [
  { label: "7D", days: 7 },
  { label: "14D", days: 14 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
] as const;

export function computeGranularity(startDate: string, endDate: string): Granularity {
  const days = differenceInDays(new Date(endDate), new Date(startDate));
  if (days <= 14) return "day";
  if (days <= 90) return "week";
  return "month";
}

export function DateRangeFilter({
  startDate,
  endDate,
  onRangeChange,
  companyCreatedAt,
}: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const today = new Date();

  const activeDays = differenceInDays(new Date(endDate), new Date(startDate));

  const selected: DateRange = {
    from: new Date(startDate),
    to: new Date(endDate),
  };

  const handlePreset = (days: number) => {
    const end = today.toISOString().split("T")[0];
    const start = subDays(today, days).toISOString().split("T")[0];
    onRangeChange(start, end);
  };

  const handleSinceSignup = () => {
    if (!companyCreatedAt) return;
    const start = new Date(companyCreatedAt).toISOString().split("T")[0];
    const end = today.toISOString().split("T")[0];
    onRangeChange(start, end);
  };

  const handleAllTime = () => {
    // Go back 2 years as "all time"
    const start = subDays(today, 730).toISOString().split("T")[0];
    const end = today.toISOString().split("T")[0];
    onRangeChange(start, end);
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      onRangeChange(
        range.from.toISOString().split("T")[0],
        range.to.toISOString().split("T")[0]
      );
      setOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Quick presets */}
      <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
        {PRESETS.map(({ label, days }) => (
          <Button
            key={label}
            variant={activeDays === days ? "default" : "ghost"}
            size="sm"
            onClick={() => handlePreset(days)}
            className="h-7 px-2.5 text-xs"
          >
            {label}
          </Button>
        ))}
        {companyCreatedAt && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSinceSignup}
            className="h-7 px-2.5 text-xs"
          >
            Since Signup
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAllTime}
          className="h-7 px-2.5 text-xs"
        >
          All Time
        </Button>
      </div>

      {/* Calendar picker */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn("h-7 px-2.5 text-xs gap-1.5 font-normal")}
          >
            <CalendarIcon className="w-3 h-3" />
            {format(new Date(startDate), "MMM d")} – {format(new Date(endDate), "MMM d, yyyy")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={selected}
            onSelect={handleCalendarSelect}
            numberOfMonths={2}
            disabled={{ after: today }}
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
