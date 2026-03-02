interface ChartTooltipItem {
  label: string;
  value: string | number;
  color: string;
}

interface ChartTooltipProps {
  title?: string;
  items: ChartTooltipItem[];
}

export function ChartTooltip({ title, items }: ChartTooltipProps) {
  return (
    <div className="bg-card border border-border rounded-xl shadow-xl px-4 py-2.5 text-sm">
      {title && <p className="text-xs text-muted-foreground mb-1">{title}</p>}
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: item.color }}
            />
            <span className="text-xs text-muted-foreground">{item.label}</span>
            <span className="font-bold text-foreground ml-auto tabular-nums">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
