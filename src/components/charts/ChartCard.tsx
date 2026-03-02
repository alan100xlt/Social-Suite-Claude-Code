import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { getChartPreset } from '@/lib/charts/theme';
import type { ReactNode } from 'react';
import type { ChartPresetId } from '@/lib/charts/types';

interface ChartCardProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  compact?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  preset?: ChartPresetId;
}

export function ChartCard({ title, subtitle, action, compact, children, footer, className, preset }: ChartCardProps) {
  const cardPadding = getChartPreset(preset).card.padding;

  return (
    <Card className={className}>
      {(title || subtitle || action) && (
        <CardHeader className={compact ? 'pb-1' : 'pb-2'} style={{ padding: cardPadding, paddingBottom: compact ? '4px' : '8px' }}>
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <h3
                  className="text-base font-bold text-foreground tracking-tight"
                  style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
                >
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
            {action}
          </div>
        </CardHeader>
      )}
      <CardContent style={{ padding: cardPadding, paddingTop: (title || subtitle || action) ? '0' : cardPadding }}>
        {children}
        {footer && (
          <div className="mt-3">
            {footer}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
