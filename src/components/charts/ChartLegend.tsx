interface ChartLegendItem {
  id: string;
  label: string;
  color: string;
  value?: string | number;
}

interface ChartLegendProps {
  items: ChartLegendItem[];
  position?: 'top' | 'bottom' | 'right';
}

export function ChartLegend({ items, position = 'bottom' }: ChartLegendProps) {
  const isVertical = position === 'right';

  return (
    <div className={`flex ${isVertical ? 'flex-col gap-2' : 'items-center gap-4 flex-wrap justify-center'}`}>
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full ring-2 ring-background shadow-sm flex-shrink-0"
            style={{ background: item.color }}
          />
          <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
          {item.value !== undefined && (
            <span className="text-sm font-bold text-foreground tabular-nums">{item.value}</span>
          )}
        </div>
      ))}
    </div>
  );
}
