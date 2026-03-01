import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Clock, 
  Calendar, 
  CheckCircle, 
  AlertCircle,
  Eye,
  Timer,
  FileText,
  Send
} from 'lucide-react';

export type PostStatus = 'review' | 'scheduled' | 'published' | 'issue' | 'draft' | 'processing' | 'pending';

interface StatusBadgeProps {
  status: PostStatus;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig = {
  review: {
    label: 'Review',
    variant: 'secondary' as const,
    icon: Eye,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    iconColor: 'text-blue-600',
  },
  scheduled: {
    label: 'Scheduled',
    variant: 'outline' as const,
    icon: Calendar,
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    iconColor: 'text-purple-600',
  },
  published: {
    label: 'Published',
    variant: 'default' as const,
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800 border-green-200',
    iconColor: 'text-green-600',
  },
  issue: {
    label: 'Issue',
    variant: 'destructive' as const,
    icon: AlertCircle,
    color: 'bg-red-100 text-red-800 border-red-200',
    iconColor: 'text-red-600',
  },
  draft: {
    label: 'Draft',
    variant: 'secondary' as const,
    icon: FileText,
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    iconColor: 'text-gray-600',
  },
  processing: {
    label: 'Processing',
    variant: 'outline' as const,
    icon: Timer,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    iconColor: 'text-yellow-600',
  },
  pending: {
    label: 'Pending',
    variant: 'outline' as const,
    icon: Clock,
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    iconColor: 'text-orange-600',
  },
};

const sizeConfig = {
  sm: 'text-[10px] h-5 px-2',
  md: 'text-xs h-6 px-3',
  lg: 'text-sm h-7 px-4',
};

export function StatusBadge({ 
  status, 
  className, 
  showIcon = true, 
  size = 'sm' 
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={cn(
        sizeConfig[size],
        config.color,
        'font-medium gap-1.5 transition-colors',
        className
      )}
    >
      {showIcon && (
        <Icon className={cn('w-3 h-3', config.iconColor)} />
      )}
      {config.label}
    </Badge>
  );
}

// Helper function to determine status from RSS feed item
export function getStatusFromItem(item: any): PostStatus {
  if (item.status === 'posted') return 'published';
  if (item.status === 'failed') return 'issue';
  if (item.status === 'pending') return 'pending';
  
  // Check for draft status (would need to check against drafts)
  // For now, default to review
  return 'review';
}

export default StatusBadge;
