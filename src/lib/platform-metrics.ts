import type { Platform } from '@/lib/api/getlate';

export type MetricType = 'impressions' | 'reach' | 'likes' | 'comments' | 'shares' | 'saves' | 'clicks' | 'views';

export type MetricAvailability = 'available' | 'unavailable' | 'partial';

export interface MetricNote {
  availability: MetricAvailability;
  note?: string;
}

export const METRIC_LABELS: Record<MetricType, string> = {
  impressions: 'Impressions',
  reach: 'Reach',
  likes: 'Likes',
  comments: 'Comments',
  shares: 'Shares',
  saves: 'Saves',
  clicks: 'Clicks',
  views: 'Views',
};

const a = (note?: string): MetricNote => ({ availability: 'available', note });
const u = (note?: string): MetricNote => ({ availability: 'unavailable', note });
const p = (note?: string): MetricNote => ({ availability: 'partial', note });

export const PLATFORM_METRICS: Record<Platform, Record<MetricType, MetricNote>> = {
  twitter: {
    impressions: a(), reach: a(), likes: a(), comments: a('Replies'),
    shares: a('Retweets + Quotes'), saves: a('Bookmarks'), clicks: a('Link clicks'), views: a('Video views only'),
  },
  instagram: {
    impressions: a(), reach: a(), likes: a(), comments: a(),
    shares: a('Sends'), saves: a(), clicks: p('Link in bio only'), views: a('Reels/Stories'),
  },
  facebook: {
    impressions: a(), reach: a(), likes: a('Reactions'), comments: a(),
    shares: a(), saves: u(), clicks: a(), views: a('Video views'),
  },
  linkedin: {
    impressions: a(), reach: u('Not provided by API'), likes: a('Reactions'), comments: a(),
    shares: a('Reposts'), saves: u(), clicks: a(), views: a('Video views'),
  },
  tiktok: {
    impressions: u(), reach: a(), likes: a(), comments: a(),
    shares: a(), saves: a('Favorites'), clicks: u(), views: a(),
  },
  youtube: {
    impressions: a('Thumbnail impressions'), reach: u(), likes: a(), comments: a(),
    shares: a(), saves: u(), clicks: a('Card clicks'), views: a(),
  },
  pinterest: {
    impressions: a(), reach: u(), likes: u(), comments: a(),
    shares: u(), saves: a('Pin saves'), clicks: a('Outbound clicks'), views: p('Video pins only'),
  },
  reddit: {
    impressions: u(), reach: u(), likes: a('Upvotes'), comments: a(),
    shares: a('Crossposts'), saves: a(), clicks: u(), views: p('Some subreddits'),
  },
  bluesky: {
    impressions: u(), reach: u(), likes: a(), comments: a('Replies'),
    shares: a('Reposts'), saves: u(), clicks: u(), views: u(),
  },
  threads: {
    impressions: a(), reach: a(), likes: a(), comments: a('Replies'),
    shares: a('Reposts'), saves: u(), clicks: u(), views: a(),
  },
  'google-business': {
    impressions: a('Search impressions'), reach: u(), likes: u(), comments: u(),
    shares: u(), saves: u(), clicks: a('Website/directions/calls'), views: a('Maps + Search views'),
  },
  telegram: {
    impressions: u(), reach: u(), likes: u(), comments: u(),
    shares: a('Forwards'), saves: u(), clicks: u(), views: a('Message views'),
  },
  snapchat: {
    impressions: u(), reach: a('Unique viewers'), likes: u(), comments: u(),
    shares: a('Screenshots + shares'), saves: u(), clicks: p('Swipe-ups on ads'), views: a('Story views'),
  },
};

export type CellDisplayState = 'value' | 'dash' | 'available' | 'partial' | 'unavailable';

export interface SnapshotRow {
  platform: string;
  snapshot_date: string;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number | null;
  clicks: number;
  views: number;
}

export function transformSnapshotsToMatrix(
  rows: SnapshotRow[],
): Record<string, Record<MetricType, number | null>> {
  // Group by platform, keep most recent snapshot per platform
  const byPlatform = new Map<string, SnapshotRow>();

  for (const row of rows) {
    const existing = byPlatform.get(row.platform);
    if (!existing || row.snapshot_date > existing.snapshot_date) {
      byPlatform.set(row.platform, row);
    }
  }

  const result: Record<string, Record<MetricType, number | null>> = {};
  for (const [platform, row] of byPlatform) {
    result[platform] = {
      impressions: row.impressions,
      reach: row.reach,
      likes: row.likes,
      comments: row.comments,
      shares: row.shares,
      saves: row.saves,
      clicks: row.clicks,
      views: row.views,
    };
  }

  return result;
}

export function transformSnapshotsToSparklines(
  rows: SnapshotRow[],
): Record<MetricType, number[]> {
  // Sort by date ascending
  const sorted = [...rows].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));

  const result: Record<MetricType, number[]> = {
    impressions: [], reach: [], likes: [], comments: [],
    shares: [], saves: [], clicks: [], views: [],
  };

  for (const row of sorted) {
    result.impressions.push(row.impressions);
    result.reach.push(row.reach);
    result.likes.push(row.likes);
    result.comments.push(row.comments);
    result.shares.push(row.shares);
    result.saves.push(row.saves ?? 0);
    result.clicks.push(row.clicks);
    result.views.push(row.views);
  }

  return result;
}

export function getAvailableMetrics(platform: Platform): MetricType[] {
  const entry = PLATFORM_METRICS[platform];
  if (!entry) return [];
  return (Object.keys(entry) as MetricType[]).filter(
    (m) => entry[m].availability !== 'unavailable',
  );
}

export function getCellDisplayState(
  platform: Platform,
  metric: MetricType,
  connectedPlatforms: Platform[],
  value: number | null,
): CellDisplayState {
  const isConnected = connectedPlatforms.includes(platform);

  if (isConnected) {
    return value != null ? 'value' : 'dash';
  }

  const note = PLATFORM_METRICS[platform]?.[metric];
  if (!note) return 'unavailable';

  return note.availability;
}
