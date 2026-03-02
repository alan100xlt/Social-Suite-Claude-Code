import { Card, CardHeader, CardContent } from '@/components/ui/card';
import type { ReactNode } from 'react';

interface ChartCardProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  compact?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function ChartCard({ title, subtitle, action, compact, children, footer, className }: ChartCardProps) {
  return (
    <Card className={className}>
      {(title || subtitle || action) && (
        <CardHeader className={compact ? 'pb-1' : 'pb-2'}>
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
      <CardContent className={compact ? 'pt-0' : ''}>
        {children}
      </CardContent>
      {footer && (
        <div className="px-6 pb-4">
          {footer}
        </div>
      )}
    </Card>
  );
}
