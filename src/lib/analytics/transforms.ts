import type { Platform } from '@/lib/api/getlate';

interface PublishDateMetrics {
  date: string;
  impressions: number;
  reach: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  postCount: number;
  engagementRate: number;
}

interface PlatformMetrics {
  platform: Platform;
  followers: number;
  following: number;
  postsCount: number;
  impressions: number;
  reach: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  engagementRate: number;
  totalEngagement: number;
}

interface ContentDecayBucket {
  timeWindow: string;
  engagementPercentage: number;
}

const PLATFORM_COLORS: Record<string, string> = {
  facebook: '#4267B2',
  instagram: '#E1306C',
  twitter: '#1DA1F2',
  linkedin: '#0077B5',
  tiktok: '#000000',
  youtube: '#FF0000',
  bluesky: '#0085FF',
  threads: '#000000',
};

const PLATFORM_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  twitter: 'Twitter',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  bluesky: 'Bluesky',
  threads: 'Threads',
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function buildKpiSparklines(pdm: PublishDateMetrics[]) {
  return {
    views: pdm.map(d => ({ x: d.date, y: d.views })),
    impressions: pdm.map(d => ({ x: d.date, y: d.impressions })),
    clicks: pdm.map(d => ({ x: d.date, y: d.clicks })),
    engagement: pdm.map(d => ({ x: d.date, y: d.engagementRate })),
  };
}

/** Converts flat PDM to Nivo line format: [{ id, data: [{x, y}] }] */
export function buildAreaTrend(pdm: PublishDateMetrics[]) {
  return [
    {
      id: 'views',
      data: pdm.map(d => ({ x: d.date, y: d.views })),
    },
    {
      id: 'engagement',
      data: pdm.map(d => ({ x: d.date, y: d.engagementRate })),
    },
  ];
}

export function buildDonutData(platforms: PlatformMetrics[]) {
  return platforms.map(p => ({
    id: p.platform,
    label: PLATFORM_LABELS[p.platform] || p.platform,
    value: p.followers,
    color: PLATFORM_COLORS[p.platform] || '#888',
  }));
}

export function buildHeatmapData(slots: { day_of_week: number; hour: number; avg_engagement: number; post_count: number }[]) {
  const lookup = new Map<string, number>();
  for (const s of slots) {
    lookup.set(`${s.day_of_week}-${s.hour}`, s.avg_engagement);
  }

  return DAY_NAMES.map((name, dayIdx) => ({
    id: name,
    data: Array.from({ length: 24 }, (_, hour) => ({
      x: `${hour}:00`,
      y: lookup.get(`${dayIdx}-${hour}`) ?? 0,
    })),
  }));
}

export function buildFunnelData(totals: { impressions: number; views: number; clicks: number; engagement: number }) {
  return [
    { id: 'Impressions', label: 'Impressions', value: totals.impressions },
    { id: 'Views', label: 'Views', value: totals.views },
    { id: 'Clicks', label: 'Clicks', value: totals.clicks },
    { id: 'Engagement', label: 'Engagement', value: totals.engagement },
  ];
}

/** Converts platform metrics to Nivo radial bar format: [{ id, data: [{x, y}] }] */
export function buildGaugeData(platforms: PlatformMetrics[]) {
  return platforms.map(p => ({
    id: PLATFORM_LABELS[p.platform] || p.platform,
    data: [{ x: 'rate', y: Math.min(p.engagementRate, 100) }],
  }));
}

/** Converts platform metrics to Nivo treemap format: { name: 'root', children: [{name, value}] } */
export function buildTreemapData(platforms: PlatformMetrics[]) {
  return {
    name: 'platforms',
    children: platforms.map(p => ({
      name: PLATFORM_LABELS[p.platform] || p.platform,
      value: p.totalEngagement,
      color: PLATFORM_COLORS[p.platform] || '#888',
    })),
  };
}

export function buildDecayBarData(buckets: ContentDecayBucket[]) {
  return buckets.map(b => ({
    bucket: b.timeWindow,
    count: b.engagementPercentage,
  }));
}

/** Converts aggregated follower data to Nivo line format */
export function buildFollowerTrend(data: { date: string; followers: number }[]) {
  return [
    {
      id: 'followers',
      data: data.map(d => ({ x: d.date, y: d.followers })),
    },
  ];
}

export function computeChangePercent(pdm: PublishDateMetrics[]) {
  if (pdm.length < 2) {
    return { views: 0, impressions: 0, clicks: 0, engagement: 0 };
  }

  const first = pdm[0];
  const last = pdm[pdm.length - 1];

  const pct = (a: number, b: number) => (a > 0 ? ((b - a) / a) * 100 : 0);

  return {
    views: pct(first.views, last.views),
    impressions: pct(first.impressions, last.impressions),
    clicks: pct(first.clicks, last.clicks),
    engagement: pct(first.engagementRate, last.engagementRate),
  };
}
