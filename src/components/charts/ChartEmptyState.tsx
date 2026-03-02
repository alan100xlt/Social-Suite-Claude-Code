import { BarChart3, Loader2, AlertCircle } from 'lucide-react';

interface ChartEmptyStateProps {
  isLoading?: boolean;
  isEmpty?: boolean;
  isError?: boolean;
  message?: string;
  height?: number;
}

export function ChartEmptyState({ isLoading, isEmpty, isError, message, height = 200 }: ChartEmptyStateProps) {
  const Icon = isLoading ? Loader2 : isError ? AlertCircle : BarChart3;
  const defaultMessage = isLoading
    ? 'Loading chart data...'
    : isError
      ? 'Failed to load data'
      : 'No data available';

  return (
    <div
      className="flex flex-col items-center justify-center text-muted-foreground gap-2"
      style={{ height }}
    >
      <Icon className={`h-8 w-8 opacity-40 ${isLoading ? 'animate-spin' : ''}`} />
      <p className="text-sm">{message ?? defaultMessage}</p>
    </div>
  );
}
