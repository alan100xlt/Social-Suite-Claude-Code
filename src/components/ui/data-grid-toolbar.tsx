import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, X } from "lucide-react";

interface FilterChip {
  id: string;
  label: string;
  active: boolean;
  color?: string;
  bgColor?: string;
}

interface DataGridToolbarProps {
  quickFilter: string;
  onQuickFilterChange: (text: string) => void;
  onExport?: () => void;
  filterChips?: FilterChip[];
  onFilterChipToggle?: (id: string) => void;
  quickFilterPlaceholder?: string;
}

export function DataGridToolbar({
  quickFilter,
  onQuickFilterChange,
  onExport,
  filterChips,
  onFilterChipToggle,
  quickFilterPlaceholder = "Search...",
}: DataGridToolbarProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {filterChips?.map((chip) => (
        <button
          key={chip.id}
          onClick={() => onFilterChipToggle?.(chip.id)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            chip.active
              ? `${chip.bgColor || "bg-primary/10 border-primary/30"} ${chip.color || "text-primary"} shadow-sm`
              : "bg-white border-gray-200 text-gray-500 hover:border-gray-300 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-400"
          }`}
        >
          {chip.active && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
          {chip.label}
          {chip.active && <X className="h-3 w-3 ml-0.5" />}
        </button>
      ))}

      <div className="flex-1" />

      <div className="relative min-w-[200px] max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder={quickFilterPlaceholder}
          value={quickFilter}
          onChange={(e) => onQuickFilterChange(e.target.value)}
          className="pl-9 h-9 bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-700"
        />
      </div>

      {onExport && (
        <Button variant="outline" size="sm" onClick={onExport} className="h-9 border-gray-200 dark:border-gray-700">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      )}
    </div>
  );
}
