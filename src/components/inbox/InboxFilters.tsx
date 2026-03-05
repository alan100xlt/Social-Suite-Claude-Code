import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, X } from 'lucide-react';
import { FaInstagram, FaTwitter, FaFacebook, FaLinkedin, FaTiktok, FaYoutube } from 'react-icons/fa';
import { SiBluesky, SiThreads } from 'react-icons/si';
import type { ConversationStatus, ConversationType } from '@/lib/api/inbox';

const platforms = [
  { value: 'instagram', label: 'Instagram', icon: FaInstagram },
  { value: 'twitter', label: 'Twitter/X', icon: FaTwitter },
  { value: 'facebook', label: 'Facebook', icon: FaFacebook },
  { value: 'linkedin', label: 'LinkedIn', icon: FaLinkedin },
  { value: 'tiktok', label: 'TikTok', icon: FaTiktok },
  { value: 'youtube', label: 'YouTube', icon: FaYoutube },
  { value: 'bluesky', label: 'Bluesky', icon: SiBluesky },
  { value: 'threads', label: 'Threads', icon: SiThreads },
];

const statuses: { value: ConversationStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'pending', label: 'Pending' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'snoozed', label: 'Snoozed' },
];

const types: { value: ConversationType; label: string }[] = [
  { value: 'comment', label: 'Comments' },
  { value: 'dm', label: 'DMs' },
  { value: 'review', label: 'Reviews' },
  { value: 'mention', label: 'Mentions' },
];

interface InboxFiltersProps {
  filters: {
    status?: ConversationStatus;
    platform?: string;
    type?: ConversationType;
    search?: string;
  };
  onFilterChange: (filters: InboxFiltersProps['filters']) => void;
}

export function InboxFilters({ filters, onFilterChange }: InboxFiltersProps) {
  const hasActiveFilters = filters.status || filters.platform || filters.type;

  return (
    <div className="space-y-3 p-3 border-b">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search conversations..."
          value={filters.search || ''}
          onChange={(e) => onFilterChange({ ...filters, search: e.target.value || undefined })}
          className="pl-8 h-8 text-sm"
        />
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />

        <Select
          value={filters.status || 'all'}
          onValueChange={(v) => onFilterChange({ ...filters, status: v === 'all' ? undefined : v as ConversationStatus })}
        >
          <SelectTrigger className="h-7 text-xs w-[100px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.platform || 'all'}
          onValueChange={(v) => onFilterChange({ ...filters, platform: v === 'all' ? undefined : v })}
        >
          <SelectTrigger className="h-7 text-xs w-[110px]">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platforms</SelectItem>
            {platforms.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.type || 'all'}
          onValueChange={(v) => onFilterChange({ ...filters, type: v === 'all' ? undefined : v as ConversationType })}
        >
          <SelectTrigger className="h-7 text-xs w-[100px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {types.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => onFilterChange({ search: filters.search })}
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
