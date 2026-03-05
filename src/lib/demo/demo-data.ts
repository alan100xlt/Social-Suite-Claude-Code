import type { GetLatePost, GetLateAccount, Platform } from '@/lib/api/getlate';
import type { RssFeed, RssFeedItem } from '@/hooks/useRssFeeds';
import type { FeedItemWithFeedName } from '@/hooks/useAllFeedItems';
import type { PostDraft } from '@/hooks/usePostDrafts';
import type { BestTimeSlot } from '@/hooks/useBestTimeToPost';
import type { TopPost } from '@/hooks/useTopPerformingPosts';
import type { TrendData } from '@/hooks/useDashboardTrends';
import type { PostWithPlatforms, PlatformAnalytics } from '@/hooks/useAllPostsWithAnalytics';
import type { InboxConversation, InboxMessage, InboxContact, InboxLabel, InboxCannedReply, InboxAutoRule } from '@/lib/api/inbox';
import { DEMO_COMPANY_ID } from './demo-constants';
import { format, subDays, addDays, addHours, setHours, setMinutes } from 'date-fns';

// ─── Deterministic date helpers ───────────────────────────
const NOW = new Date();
const TODAY = format(NOW, 'yyyy-MM-dd');
const daysAgo = (n: number) => subDays(NOW, n).toISOString();
const daysFromNow = (n: number, hour = 10) =>
  setMinutes(setHours(addDays(NOW, n), hour), 0).toISOString();

// ─── Accounts (5) ─────────────────────────────────────────
export const DEMO_ACCOUNTS: GetLateAccount[] = [
  {
    id: 'demo-acc-twitter',
    platform: 'twitter',
    username: 'longtale_ai',
    displayName: 'Longtale AI',
    profilePictureUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=LT',
    followers: 4200,
    isConnected: true,
    connectedAt: '2025-06-10T08:00:00Z',
  },
  {
    id: 'demo-acc-linkedin',
    platform: 'linkedin',
    username: 'longtale-ai',
    displayName: 'Longtale AI',
    profilePictureUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=LI',
    followers: 3100,
    isConnected: true,
    connectedAt: '2025-06-10T08:00:00Z',
  },
  {
    id: 'demo-acc-instagram',
    platform: 'instagram',
    username: 'longtale.ai',
    displayName: 'Longtale AI',
    profilePictureUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=IG',
    followers: 2800,
    isConnected: true,
    connectedAt: '2025-07-01T12:00:00Z',
  },
  {
    id: 'demo-acc-facebook',
    platform: 'facebook',
    username: 'LongtaleAI',
    displayName: 'Longtale AI Page',
    profilePictureUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=FB',
    followers: 1800,
    isConnected: true,
    connectedAt: '2025-08-15T10:00:00Z',
  },
  {
    id: 'demo-acc-tiktok',
    platform: 'tiktok',
    username: 'longtale_ai',
    displayName: 'Longtale AI',
    profilePictureUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=TK',
    followers: 500,
    isConnected: true,
    connectedAt: '2025-09-20T14:00:00Z',
  },
];

// ─── Posts (12) ───────────────────────────────────────────
export const DEMO_POSTS: GetLatePost[] = [
  // 3 Published
  {
    id: 'demo-post-pub-1',
    text: 'Thrilled to share our latest case study: how one media company grew organic reach by 340% using AI-powered content scheduling. The secret? Posting at the right time, on the right platform, with the right message.\n\n#ContentStrategy #AI #MediaTech',
    status: 'published',
    publishedAt: daysAgo(2),
    accountIds: ['demo-acc-linkedin'],
    platformResults: [
      { accountId: 'demo-acc-linkedin', platform: 'linkedin', status: 'success', postUrl: 'https://linkedin.com/posts/longtale-ai-123' },
    ],
  },
  {
    id: 'demo-post-pub-2',
    text: 'Content creation tip: Repurpose your best-performing blog posts into bite-sized social media threads. We saw a 2.5x increase in engagement when we started doing this consistently. What\'s your favorite repurposing strategy? 🧵',
    status: 'published',
    publishedAt: daysAgo(4),
    accountIds: ['demo-acc-twitter'],
    platformResults: [
      { accountId: 'demo-acc-twitter', platform: 'twitter', status: 'success', postUrl: 'https://x.com/longtale_ai/status/123' },
    ],
  },
  {
    id: 'demo-post-pub-3',
    text: 'Behind the scenes of our content workflow ✨ From RSS feed to published post in under 5 minutes. Automation doesn\'t replace creativity — it amplifies it.',
    status: 'published',
    publishedAt: daysAgo(6),
    accountIds: ['demo-acc-instagram'],
    mediaItems: [{ url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800', type: 'image' }],
    platformResults: [
      { accountId: 'demo-acc-instagram', platform: 'instagram', status: 'success', postUrl: 'https://instagram.com/p/demo123' },
    ],
  },

  // 3 Scheduled (mix of near and far future for priority testing)
  {
    id: 'demo-post-sched-1',
    text: 'Monday Motivation: "The best content strategy is the one you actually execute." We\'re launching our new analytics dashboard this week — stay tuned for the reveal! 🚀',
    status: 'scheduled',
    scheduledFor: daysFromNow(1, 9),
    accountIds: ['demo-acc-twitter', 'demo-acc-linkedin'],
    mediaItems: [{ url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800', type: 'image' }],
  },
  {
    id: 'demo-post-sched-2',
    text: '5 AI tools every content marketer should be using in 2026:\n\n1. Longtale for scheduling & analytics\n2. Claude for content ideation\n3. Midjourney for visuals\n4. Descript for video editing\n5. Otter for meeting notes\n\nWhat would you add? 👇',
    status: 'scheduled',
    scheduledFor: daysFromNow(2, 14),
    accountIds: ['demo-acc-twitter', 'demo-acc-linkedin', 'demo-acc-facebook'],
    mediaItems: [{ url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800', type: 'image' }],
  },
  {
    id: 'demo-post-sched-3',
    text: 'New feature alert: Smart Content Decay Detection 📉\n\nOur analytics now show you when your top posts start losing traction, so you can reshare or update them at the perfect moment.',
    status: 'scheduled',
    scheduledFor: daysFromNow(4, 11),
    accountIds: ['demo-acc-instagram', 'demo-acc-linkedin'],
    mediaItems: [{ url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800', type: 'image' }],
  },

  // Near-future draft (will trigger "Needs Attention" in sidebar)
  {
    id: 'demo-post-draft-urgent',
    text: 'URGENT: Partner announcement going live tomorrow — need final copy review before scheduling. Tagging @marketing for sign-off.',
    status: 'draft',
    scheduledFor: daysFromNow(0, 16), // today, a few hours from now
    accountIds: ['demo-acc-twitter', 'demo-acc-linkedin'],
    mediaItems: [{ url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800', type: 'image' }],
  },

  // 3 Drafts (unscheduled — show in sidebar "Unscheduled Drafts")
  {
    id: 'demo-post-draft-1',
    text: 'Thread idea: The evolution of social media management — from Hootsuite to AI-first platforms. Draft notes...',
    status: 'draft',
    scheduledFor: daysFromNow(1, 14),
    accountIds: ['demo-acc-twitter'],
    mediaItems: [{ url: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800', type: 'image' }],
  },
  {
    id: 'demo-post-draft-2',
    text: 'Case study draft: How [Company Name] used Longtale to reduce content production time by 60% while increasing engagement across all platforms.',
    status: 'draft',
    scheduledFor: daysFromNow(3, 10),
    accountIds: ['demo-acc-linkedin'],
  },
  {
    id: 'demo-post-draft-3',
    text: 'Weekly roundup template: Top stories in media tech this week...',
    status: 'draft',
    scheduledFor: daysFromNow(5, 15),
    accountIds: ['demo-acc-twitter', 'demo-acc-linkedin'],
  },

  // 2 Failed (with scheduledFor so they appear on the calendar grid)
  {
    id: 'demo-post-fail-1',
    text: 'Exciting partnership announcement coming soon! We\'re teaming up with a major media company to redefine content distribution.',
    status: 'failed',
    scheduledFor: daysAgo(1),
    accountIds: ['demo-acc-twitter'],
    platformResults: [
      {
        accountId: 'demo-acc-twitter',
        platform: 'twitter',
        status: 'failed',
        error: 'Authentication token expired',
        errorMessage: 'Your Twitter/X connection needs to be refreshed. Please reconnect in Settings.',
        errorCategory: 'auth_expired',
        errorSource: 'platform',
      },
    ],
  },
  {
    id: 'demo-post-fail-2',
    text: 'Big news in the content automation space — our new RSS-to-social pipeline just hit 10,000 automated posts delivered for our clients!',
    status: 'failed',
    scheduledFor: daysFromNow(1, 11),
    accountIds: ['demo-acc-linkedin'],
    platformResults: [
      {
        accountId: 'demo-acc-linkedin',
        platform: 'linkedin',
        status: 'failed',
        error: 'Rate limit exceeded',
        errorMessage: 'LinkedIn API rate limit reached. Post will be retried in 1 hour.',
        errorCategory: 'rate_limit',
        errorSource: 'platform',
      },
    ],
  },

  // 1 Partial
  {
    id: 'demo-post-partial-1',
    text: 'The future of content marketing is personalized, automated, and data-driven. We\'re building the tools to make it happen. What\'s on your content wishlist for 2026?',
    status: 'partial',
    publishedAt: daysAgo(1),
    accountIds: ['demo-acc-linkedin', 'demo-acc-twitter'],
    platformResults: [
      { accountId: 'demo-acc-linkedin', platform: 'linkedin', status: 'success', postUrl: 'https://linkedin.com/posts/longtale-ai-456' },
      {
        accountId: 'demo-acc-twitter',
        platform: 'twitter',
        status: 'failed',
        error: 'Connection expired',
        errorMessage: 'Twitter/X token needs refresh.',
        errorCategory: 'auth_expired',
        errorSource: 'platform',
      },
    ],
  },
];

// ─── RSS Feeds (2) ────────────────────────────────────────
const FEED_TECHCRUNCH_ID = 'demo-feed-tc';
const FEED_CMI_ID = 'demo-feed-cmi';

export const DEMO_RSS_FEEDS: RssFeed[] = [
  {
    id: FEED_TECHCRUNCH_ID,
    company_id: DEMO_COMPANY_ID,
    name: 'TechCrunch AI',
    url: 'https://techcrunch.com/category/artificial-intelligence/feed/',
    is_active: true,
    auto_publish: false,
    enable_scraping: true,
    poll_interval_minutes: 30,
    last_polled_at: daysAgo(0),
    created_at: '2025-06-01T10:00:00Z',
    updated_at: daysAgo(0),
  },
  {
    id: FEED_CMI_ID,
    company_id: DEMO_COMPANY_ID,
    name: 'Content Marketing Institute',
    url: 'https://contentmarketinginstitute.com/feed/',
    is_active: true,
    auto_publish: true,
    enable_scraping: false,
    poll_interval_minutes: 60,
    last_polled_at: daysAgo(0),
    created_at: '2025-07-15T14:00:00Z',
    updated_at: daysAgo(0),
  },
];

// ─── Feed Items (8) ──────────────────────────────────────
const baseFeedItems: RssFeedItem[] = [
  {
    id: 'demo-fi-1',
    feed_id: FEED_TECHCRUNCH_ID,
    guid: 'tc-article-001',
    title: 'AI-Powered Content Tools Are Reshaping How Media Companies Operate',
    link: 'https://techcrunch.com/2026/02/28/ai-content-tools',
    description: 'A deep dive into how artificial intelligence is transforming content creation workflows for digital publishers.',
    full_content: null,
    image_url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400',
    published_at: daysAgo(3),
    processed_at: daysAgo(2),
    post_id: 'demo-post-pub-1',
    status: 'posted',
    created_at: daysAgo(3),
  },
  {
    id: 'demo-fi-2',
    feed_id: FEED_TECHCRUNCH_ID,
    guid: 'tc-article-002',
    title: 'Social Media Scheduling Platforms See 200% Growth in Enterprise Adoption',
    link: 'https://techcrunch.com/2026/02/25/social-scheduling-growth',
    description: 'Enterprise companies are increasingly adopting automated social media management platforms.',
    full_content: null,
    image_url: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400',
    published_at: daysAgo(5),
    processed_at: daysAgo(4),
    post_id: null,
    status: 'pending',
    created_at: daysAgo(5),
  },
  {
    id: 'demo-fi-3',
    feed_id: FEED_TECHCRUNCH_ID,
    guid: 'tc-article-003',
    title: 'The Rise of Multi-Platform Content Distribution Networks',
    link: 'https://techcrunch.com/2026/02/20/multi-platform-cdn',
    description: 'How modern publishers manage content across dozens of platforms simultaneously.',
    full_content: null,
    image_url: null,
    published_at: daysAgo(8),
    processed_at: daysAgo(7),
    post_id: null,
    status: 'failed',
    created_at: daysAgo(8),
  },
  {
    id: 'demo-fi-4',
    feed_id: FEED_TECHCRUNCH_ID,
    guid: 'tc-article-004',
    title: 'Report: TikTok Business API Improvements Boost Brand Content',
    link: 'https://techcrunch.com/2026/02/18/tiktok-api-improvements',
    description: 'New TikTok API features make it easier for brands to automate video content publishing.',
    full_content: null,
    image_url: 'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=400',
    published_at: daysAgo(10),
    processed_at: daysAgo(9),
    post_id: null,
    status: 'skipped',
    created_at: daysAgo(10),
  },
  {
    id: 'demo-fi-5',
    feed_id: FEED_CMI_ID,
    guid: 'cmi-article-001',
    title: '7 Content Repurposing Strategies That Actually Work in 2026',
    link: 'https://contentmarketinginstitute.com/articles/repurposing-strategies-2026',
    description: 'Learn how to maximize the value of every piece of content you create.',
    full_content: null,
    image_url: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400',
    published_at: daysAgo(2),
    processed_at: daysAgo(1),
    post_id: 'demo-post-pub-2',
    status: 'posted',
    created_at: daysAgo(2),
  },
  {
    id: 'demo-fi-6',
    feed_id: FEED_CMI_ID,
    guid: 'cmi-article-002',
    title: 'Why Your Content Calendar Needs AI-Driven Optimization',
    link: 'https://contentmarketinginstitute.com/articles/ai-content-calendar',
    description: 'Stop guessing when to post — use data to determine the best publishing windows.',
    full_content: null,
    image_url: null,
    published_at: daysAgo(4),
    processed_at: daysAgo(3),
    post_id: null,
    status: 'pending',
    created_at: daysAgo(4),
  },
  {
    id: 'demo-fi-7',
    feed_id: FEED_CMI_ID,
    guid: 'cmi-article-003',
    title: 'The Complete Guide to Social Media Analytics for Publishers',
    link: 'https://contentmarketinginstitute.com/articles/social-analytics-guide',
    description: 'Everything you need to know about measuring and improving your social media performance.',
    full_content: null,
    image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400',
    published_at: daysAgo(7),
    processed_at: daysAgo(6),
    post_id: null,
    status: 'posted',
    created_at: daysAgo(7),
  },
  {
    id: 'demo-fi-8',
    feed_id: FEED_CMI_ID,
    guid: 'cmi-article-004',
    title: 'Building a Brand Voice That Scales Across Platforms',
    link: 'https://contentmarketinginstitute.com/articles/brand-voice-scale',
    description: 'How to maintain a consistent brand voice when publishing to 5+ social platforms.',
    full_content: null,
    image_url: null,
    published_at: daysAgo(12),
    processed_at: daysAgo(11),
    post_id: null,
    status: 'skipped',
    created_at: daysAgo(12),
  },
];

const feedNameMap: Record<string, string> = {
  [FEED_TECHCRUNCH_ID]: 'TechCrunch AI',
  [FEED_CMI_ID]: 'Content Marketing Institute',
};

export const DEMO_FEED_ITEMS: FeedItemWithFeedName[] = baseFeedItems.map((item) => ({
  ...item,
  feed_name: feedNameMap[item.feed_id] || 'Unknown Feed',
}));

// ─── Dashboard Stats ─────────────────────────────────────
export const DEMO_DASHBOARD_STATS = {
  totalFollowers: 12400,
  totalReach: 89000,
  totalViews: 156000,
  avgEngagementRate: 4.2,
  totalPosts: 48,
};

// ─── Dashboard Trends ────────────────────────────────────
const trend = (current: number, previous: number): TrendData => ({
  current,
  previous,
  changePercent: previous > 0 ? ((current - previous) / previous) * 100 : 100,
  direction: current > previous ? 'up' : current < previous ? 'down' : 'flat',
});

export const DEMO_DASHBOARD_TRENDS = {
  followers: trend(12400, 11800),
  engagementRate: trend(4.2, 3.8),
  reach: trend(89000, 72000),
  posts: trend(48, 41),
};

// ─── Engagement Chart (30 days) ──────────────────────────
function generateChartData() {
  const dailyData: Array<{ snapshot_date: string; views: number; likes: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const date = format(subDays(NOW, i), 'yyyy-MM-dd');
    // Deterministic pseudo-random using day index
    const seed = (i * 7 + 13) % 20;
    const weekday = subDays(NOW, i).getDay();
    const isWeekend = weekday === 0 || weekday === 6;
    const baseViews = isWeekend ? 3000 : 5000;
    const baseLikes = isWeekend ? 80 : 150;
    dailyData.push({
      snapshot_date: date,
      views: baseViews + seed * 200 + (29 - i) * 30, // upward trend
      likes: baseLikes + seed * 8 + (29 - i) * 2,
    });
  }
  return dailyData;
}

export const DEMO_CHART_DATA = generateChartData();

// Platform breakdown bar chart data
export const DEMO_PLATFORM_CHART = [
  { platform: 'linkedin', impressions: 45000, reach: 32000, engagement: 2100 },
  { platform: 'twitter', impressions: 38000, reach: 28000, engagement: 1800 },
  { platform: 'instagram', impressions: 28000, reach: 18000, engagement: 2400 },
  { platform: 'facebook', impressions: 22000, reach: 15000, engagement: 900 },
  { platform: 'tiktok', impressions: 8000, reach: 6000, engagement: 600 },
];

// ─── Best Time Slots (6) ─────────────────────────────────
export const DEMO_BEST_TIMES: BestTimeSlot[] = [
  { day_of_week: 1, hour: 9, avg_engagement: 6.8, post_count: 12 },  // Mon 9AM
  { day_of_week: 2, hour: 11, avg_engagement: 5.9, post_count: 10 }, // Tue 11AM
  { day_of_week: 3, hour: 14, avg_engagement: 5.4, post_count: 8 },  // Wed 2PM
  { day_of_week: 4, hour: 10, avg_engagement: 5.1, post_count: 9 },  // Thu 10AM
  { day_of_week: 5, hour: 13, avg_engagement: 4.8, post_count: 11 }, // Fri 1PM
  { day_of_week: 1, hour: 14, avg_engagement: 4.5, post_count: 7 },  // Mon 2PM
];

// ─── Top Performing Posts ─────────────────────────────────
export const DEMO_TOP_POSTS: TopPost[] = [
  {
    postId: 'demo-post-pub-1',
    platform: 'linkedin',
    impressions: 12400,
    reach: 8900,
    likes: 342,
    comments: 47,
    shares: 89,
    clicks: 234,
    engagementRate: 5.8,
    engagement: 478,
    snapshotDate: daysAgo(1),
    content: 'Thrilled to share our latest case study: how one media company grew organic reach by 340%...',
    postUrl: 'https://linkedin.com/posts/longtale-ai-123',
    publishedAt: daysAgo(2),
    thumbnailUrl: null,
    views: 15600,
    source: 'manual',
    objective: 'engagement',
  },
  {
    postId: 'demo-post-pub-2',
    platform: 'twitter',
    impressions: 8700,
    reach: 6200,
    likes: 218,
    comments: 34,
    shares: 67,
    clicks: 156,
    engagementRate: 4.9,
    engagement: 319,
    snapshotDate: daysAgo(3),
    content: 'Content creation tip: Repurpose your best-performing blog posts into bite-sized social media threads...',
    postUrl: 'https://x.com/longtale_ai/status/123',
    publishedAt: daysAgo(4),
    thumbnailUrl: null,
    views: 11200,
    source: 'rss',
    objective: 'awareness',
  },
  {
    postId: 'demo-post-pub-3',
    platform: 'instagram',
    impressions: 6300,
    reach: 4100,
    likes: 412,
    comments: 28,
    shares: 15,
    clicks: 89,
    engagementRate: 7.2,
    engagement: 455,
    snapshotDate: daysAgo(5),
    content: 'Behind the scenes of our content workflow ✨ From RSS feed to published post in under 5 minutes...',
    postUrl: 'https://instagram.com/p/demo123',
    publishedAt: daysAgo(6),
    thumbnailUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=200',
    views: 9400,
    source: 'manual',
    objective: 'engagement',
  },
];

// ─── AI Briefing ─────────────────────────────────────────
export const DEMO_BRIEFING = `**Your Week at a Glance**

- **Followers** are up 5.1% to 12,400 — LinkedIn drove most of the growth (+180 new followers)
- **Engagement rate** climbed to 4.2% (up from 3.8% last week), led by strong Instagram performance
- **3 posts scheduled** for this week — consider adding a Thursday slot based on your optimal posting windows
- **2 posts failed** due to expired tokens — reconnect Twitter/X in Settings to resume publishing
- **Top performer**: Your LinkedIn case study post reached 12.4K impressions with 5.8% engagement
- **Content pipeline**: 2 pending articles from TechCrunch AI ready for review

💡 **Tip**: Your best engagement window is Monday at 9 AM — schedule your highest-value content there.`;

// ─── Post Drafts ─────────────────────────────────────────
export const DEMO_POST_DRAFTS: PostDraft[] = [
  {
    id: 'demo-draft-1',
    company_id: DEMO_COMPANY_ID,
    created_by: 'demo-user',
    updated_by: null,
    title: 'Product Hunt Launch Announcement',
    post_source: 'manual',
    selected_article_id: null,
    objective: 'awareness',
    selected_account_ids: ['demo-acc-twitter', 'demo-acc-linkedin'],
    platform_contents: {
      twitter: { text: "We're live on @ProductHunt! 🚀 Longtale helps media companies automate social media with AI. Would love your support!" },
      linkedin: { text: "Excited to announce that Longtale is now live on Product Hunt! We've been building an AI-powered social media management platform specifically designed for media companies." },
    },
    strategy: 'launch',
    image_url: null,
    current_step: 2,
    compose_phase: 'edit',
    status: 'draft',
    created_at: daysAgo(1),
    updated_at: daysAgo(0),
  },
  {
    id: 'demo-draft-2',
    company_id: DEMO_COMPANY_ID,
    created_by: 'demo-user',
    updated_by: null,
    title: 'Weekly Industry Roundup',
    post_source: 'rss',
    selected_article_id: 'demo-fi-2',
    objective: 'engagement',
    selected_account_ids: ['demo-acc-twitter'],
    platform_contents: {
      twitter: { text: 'This week in media tech: Enterprise social scheduling adoption up 200%, new AI content tools reshaping workflows. Thread 🧵' },
    },
    strategy: 'curate',
    image_url: null,
    current_step: 1,
    compose_phase: 'generate',
    status: 'draft',
    created_at: daysAgo(3),
    updated_at: daysAgo(2),
  },
  {
    id: 'demo-draft-3',
    company_id: DEMO_COMPANY_ID,
    created_by: 'demo-user',
    updated_by: null,
    title: 'Customer Success Story',
    post_source: 'manual',
    selected_article_id: null,
    objective: 'conversion',
    selected_account_ids: ['demo-acc-linkedin', 'demo-acc-facebook'],
    platform_contents: {},
    strategy: 'storytelling',
    image_url: null,
    current_step: 0,
    compose_phase: 'source',
    status: 'draft',
    created_at: daysAgo(5),
    updated_at: daysAgo(4),
  },
];

// ─── Activity Timeline ───────────────────────────────────
export const DEMO_ACTIVITY_TIMELINE = [
  {
    id: 'demo-activity-1',
    type: 'post_published',
    title: 'Post published on LinkedIn',
    description: 'Case study post reached 12.4K impressions',
    created_at: daysAgo(2),
    metadata: { postId: 'demo-post-pub-1', platform: 'linkedin' },
  },
  {
    id: 'demo-activity-2',
    type: 'post_scheduled',
    title: 'Post scheduled for Monday',
    description: 'Monday Motivation post queued for Twitter & LinkedIn',
    created_at: daysAgo(1),
    metadata: { postId: 'demo-post-sched-1', platforms: ['twitter', 'linkedin'] },
  },
  {
    id: 'demo-activity-3',
    type: 'draft_created',
    title: 'New draft: Product Hunt Launch',
    description: 'Draft created for Twitter & LinkedIn',
    created_at: daysAgo(1),
    metadata: { draftId: 'demo-draft-1' },
  },
  {
    id: 'demo-activity-4',
    type: 'post_failed',
    title: 'Post failed on Twitter',
    description: 'Authentication token expired — reconnect required',
    created_at: daysAgo(1),
    metadata: { postId: 'demo-post-fail-1', platform: 'twitter' },
  },
  {
    id: 'demo-activity-5',
    type: 'article_ingested',
    title: 'New article from TechCrunch AI',
    description: '"AI-Powered Content Tools Are Reshaping How Media Companies Operate"',
    created_at: daysAgo(3),
    metadata: { articleId: 'demo-fi-1', feedName: 'TechCrunch AI' },
  },
  {
    id: 'demo-activity-6',
    type: 'post_published',
    title: 'Post published on Instagram',
    description: 'Behind the scenes post — 412 likes, 7.2% engagement',
    created_at: daysAgo(6),
    metadata: { postId: 'demo-post-pub-3', platform: 'instagram' },
  },
];

// ─── Pending Approvals (for activity widget) ─────────────
export const DEMO_PENDING_APPROVALS = [
  {
    id: 'demo-approval-1',
    company_id: DEMO_COMPANY_ID,
    post_text: '5 AI tools every content marketer should be using in 2026...',
    status: 'pending',
    created_at: daysAgo(1),
    expires_at: daysFromNow(2),
    requested_by: 'demo-user',
    platform_contents: { twitter: { text: '5 AI tools every content marketer should be using in 2026...' } },
    selected_account_ids: ['demo-acc-twitter'],
    token: 'demo-token-1',
  },
];

// ─── Dashboard Sparklines (7 days) ───────────────────────
export const DEMO_SPARKLINE_DATA = (() => {
  const viewsSpark: Array<{ x: string; y: number }> = [];
  const likesSpark: Array<{ x: string; y: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const date = format(subDays(NOW, i), 'yyyy-MM-dd');
    const seed = (i * 7 + 13) % 10;
    viewsSpark.push({ x: date, y: 4000 + seed * 300 + (6 - i) * 100 });
    likesSpark.push({ x: date, y: 120 + seed * 10 + (6 - i) * 5 });
  }
  return { viewsSpark, likesSpark };
})();

// ─── All Posts With Analytics (for RecentPostsTable + TopPostsTable) ──
export const DEMO_POSTS_WITH_ANALYTICS: PostWithPlatforms[] = [
  {
    postId: 'demo-post-pub-1',
    platform: 'linkedin',
    impressions: 12400,
    reach: 8900,
    likes: 342,
    comments: 47,
    shares: 89,
    clicks: 234,
    engagementRate: 5.8,
    engagement: 478,
    snapshotDate: daysAgo(1),
    content: 'Thrilled to share our latest case study: how one media company grew organic reach by 340% using AI-powered content scheduling.',
    postUrl: 'https://linkedin.com/posts/longtale-ai-123',
    publishedAt: daysAgo(2),
    thumbnailUrl: null,
    views: 15600,
    source: 'manual',
    objective: 'engagement',
    _status: 'published',
    _platformCount: 1,
    _publishedCount: 1,
    _failedCount: 0,
    _platforms: [
      {
        platform: 'linkedin',
        accountName: 'Longtale AI',
        status: 'published',
        postUrl: 'https://linkedin.com/posts/longtale-ai-123',
        impressions: 12400,
        reach: 8900,
        views: 15600,
        likes: 342,
        comments: 47,
        shares: 89,
        clicks: 234,
        engagementRate: 5.8,
      },
    ],
  },
  {
    postId: 'demo-post-pub-2',
    platform: 'twitter',
    impressions: 8700,
    reach: 6200,
    likes: 218,
    comments: 34,
    shares: 67,
    clicks: 156,
    engagementRate: 4.9,
    engagement: 319,
    snapshotDate: daysAgo(3),
    content: 'Content creation tip: Repurpose your best-performing blog posts into bite-sized social media threads. We saw a 2.5x increase in engagement.',
    postUrl: 'https://x.com/longtale_ai/status/123',
    publishedAt: daysAgo(4),
    thumbnailUrl: null,
    views: 11200,
    source: 'rss',
    objective: 'awareness',
    _status: 'published',
    _platformCount: 1,
    _publishedCount: 1,
    _failedCount: 0,
    _platforms: [
      {
        platform: 'twitter',
        accountName: '@longtale_ai',
        status: 'published',
        postUrl: 'https://x.com/longtale_ai/status/123',
        impressions: 8700,
        reach: 6200,
        views: 11200,
        likes: 218,
        comments: 34,
        shares: 67,
        clicks: 156,
        engagementRate: 4.9,
      },
    ],
  },
  {
    postId: 'demo-post-pub-3',
    platform: 'instagram',
    impressions: 6300,
    reach: 4100,
    likes: 412,
    comments: 28,
    shares: 15,
    clicks: 89,
    engagementRate: 7.2,
    engagement: 455,
    snapshotDate: daysAgo(5),
    content: 'Behind the scenes of our content workflow. From RSS feed to published post in under 5 minutes.',
    postUrl: 'https://instagram.com/p/demo123',
    publishedAt: daysAgo(6),
    thumbnailUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=200',
    views: 9400,
    source: 'manual',
    objective: 'engagement',
    _status: 'published',
    _platformCount: 1,
    _publishedCount: 1,
    _failedCount: 0,
    _platforms: [
      {
        platform: 'instagram',
        accountName: 'longtale.ai',
        status: 'published',
        postUrl: 'https://instagram.com/p/demo123',
        impressions: 6300,
        reach: 4100,
        views: 9400,
        likes: 412,
        comments: 28,
        shares: 15,
        clicks: 89,
        engagementRate: 7.2,
      },
    ],
  },
  {
    postId: 'demo-post-partial-1',
    platform: 'linkedin',
    impressions: 3200,
    reach: 2100,
    likes: 98,
    comments: 12,
    shares: 8,
    clicks: 45,
    engagementRate: 3.7,
    engagement: 118,
    snapshotDate: daysAgo(1),
    content: 'The future of content marketing is personalized, automated, and data-driven.',
    postUrl: 'https://linkedin.com/posts/longtale-ai-456',
    publishedAt: daysAgo(1),
    thumbnailUrl: null,
    views: 4200,
    source: 'manual',
    objective: 'awareness',
    _status: 'partial',
    _platformCount: 2,
    _publishedCount: 1,
    _failedCount: 1,
    _platforms: [
      {
        platform: 'linkedin',
        accountName: 'Longtale AI',
        status: 'published',
        postUrl: 'https://linkedin.com/posts/longtale-ai-456',
        impressions: 3200,
        reach: 2100,
        views: 4200,
        likes: 98,
        comments: 12,
        shares: 8,
        clicks: 45,
        engagementRate: 3.7,
      },
      {
        platform: 'twitter',
        accountName: '@longtale_ai',
        status: 'failed',
        postUrl: null,
        impressions: 0,
        reach: 0,
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        clicks: 0,
        engagementRate: 0,
      },
    ],
  },
];

// ─── Platform Breakdown (for PlatformBreakdownTable) ─────
export const DEMO_PLATFORM_BREAKDOWN = [
  {
    platform: 'linkedin' as Platform,
    followers: 3100,
    following: 450,
    postsCount: 18,
    impressions: 45000,
    reach: 32000,
    views: 58000,
    likes: 1240,
    comments: 180,
    shares: 320,
    clicks: 890,
    engagementRate: 5.1,
    totalEngagement: 1740,
  },
  {
    platform: 'twitter' as Platform,
    followers: 4200,
    following: 890,
    postsCount: 24,
    impressions: 38000,
    reach: 28000,
    views: 42000,
    likes: 980,
    comments: 120,
    shares: 450,
    clicks: 670,
    engagementRate: 3.9,
    totalEngagement: 1550,
  },
  {
    platform: 'instagram' as Platform,
    followers: 2800,
    following: 320,
    postsCount: 8,
    impressions: 28000,
    reach: 18000,
    views: 35000,
    likes: 1680,
    comments: 95,
    shares: 42,
    clicks: 310,
    engagementRate: 7.2,
    totalEngagement: 1817,
  },
  {
    platform: 'facebook' as Platform,
    followers: 1800,
    following: 0,
    postsCount: 6,
    impressions: 22000,
    reach: 15000,
    views: 19000,
    likes: 420,
    comments: 35,
    shares: 85,
    clicks: 245,
    engagementRate: 2.8,
    totalEngagement: 540,
  },
  {
    platform: 'tiktok' as Platform,
    followers: 500,
    following: 45,
    postsCount: 3,
    impressions: 8000,
    reach: 6000,
    views: 12000,
    likes: 340,
    comments: 28,
    shares: 15,
    clicks: 89,
    engagementRate: 4.8,
    totalEngagement: 383,
  },
];

// ─── Inbox Demo Data ─────────────────────────────────────────

const hoursAgo = (n: number) => new Date(Date.now() - n * 60 * 60 * 1000).toISOString();
const minsAgo = (n: number) => new Date(Date.now() - n * 60 * 1000).toISOString();

export const DEMO_INBOX_CONTACTS: InboxContact[] = [
  {
    id: 'demo-contact-1', company_id: DEMO_COMPANY_ID, platform: 'twitter',
    platform_user_id: 'tw-sarah123', username: 'sarah_designs', display_name: 'Sarah Chen',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', metadata: {},
    created_at: daysAgo(10), updated_at: daysAgo(10),
  },
  {
    id: 'demo-contact-2', company_id: DEMO_COMPANY_ID, platform: 'instagram',
    platform_user_id: 'ig-mike456', username: 'mike.creates', display_name: 'Mike Rodriguez',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike', metadata: {},
    created_at: daysAgo(8), updated_at: daysAgo(8),
  },
  {
    id: 'demo-contact-3', company_id: DEMO_COMPANY_ID, platform: 'linkedin',
    platform_user_id: 'li-emma789', username: 'emma-thompson', display_name: 'Emma Thompson',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma', metadata: {},
    created_at: daysAgo(5), updated_at: daysAgo(5),
  },
  {
    id: 'demo-contact-4', company_id: DEMO_COMPANY_ID, platform: 'facebook',
    platform_user_id: 'fb-alex101', username: 'alex.media', display_name: 'Alex Kim',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex', metadata: {},
    created_at: daysAgo(3), updated_at: daysAgo(3),
  },
  {
    id: 'demo-contact-5', company_id: DEMO_COMPANY_ID, platform: 'tiktok',
    platform_user_id: 'tt-zoe222', username: 'zoecontent', display_name: 'Zoe Park',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe', metadata: {},
    created_at: daysAgo(1), updated_at: daysAgo(1),
  },
];

export const DEMO_INBOX_LABELS: InboxLabel[] = [
  { id: 'demo-label-1', company_id: DEMO_COMPANY_ID, name: 'VIP', color: '#e06060', created_at: daysAgo(30) },
  { id: 'demo-label-2', company_id: DEMO_COMPANY_ID, name: 'Feature Request', color: '#6c7bf0', created_at: daysAgo(30) },
  { id: 'demo-label-3', company_id: DEMO_COMPANY_ID, name: 'Bug Report', color: '#d4a84e', created_at: daysAgo(30) },
  { id: 'demo-label-4', company_id: DEMO_COMPANY_ID, name: 'Partnership', color: '#5cb8a5', created_at: daysAgo(30) },
];

export const DEMO_INBOX_CONVERSATIONS: InboxConversation[] = [
  {
    id: 'demo-conv-1', company_id: DEMO_COMPANY_ID, platform: 'twitter',
    platform_conversation_id: 'twitter-post-pub-1', type: 'comment', status: 'open',
    subject: 'AI-powered content scheduling', contact_id: 'demo-contact-1',
    contact: DEMO_INBOX_CONTACTS[0], assigned_to: null, priority: 'high',
    sentiment: 'positive', post_id: 'demo-post-pub-1',
    post_url: 'https://x.com/longtale_ai/status/123', snooze_until: null,
    last_message_at: minsAgo(15), last_message_preview: 'This is exactly what we needed! How does the AI scheduling work?',
    unread_count: 2, metadata: {}, created_at: hoursAgo(3), updated_at: minsAgo(15),
    labels: [{ label: DEMO_INBOX_LABELS[0] }],
  },
  {
    id: 'demo-conv-2', company_id: DEMO_COMPANY_ID, platform: 'instagram',
    platform_conversation_id: 'dm-instagram-mike', type: 'dm', status: 'open',
    subject: 'Mike Rodriguez', contact_id: 'demo-contact-2',
    contact: DEMO_INBOX_CONTACTS[1], assigned_to: null, priority: 'normal',
    sentiment: null, post_id: null, post_url: null, snooze_until: null,
    last_message_at: hoursAgo(1), last_message_preview: 'Hey! Love your platform. Quick question about pricing...',
    unread_count: 1, metadata: {}, created_at: hoursAgo(2), updated_at: hoursAgo(1),
    labels: [],
  },
  {
    id: 'demo-conv-3', company_id: DEMO_COMPANY_ID, platform: 'linkedin',
    platform_conversation_id: 'linkedin-post-pub-2', type: 'comment', status: 'pending',
    subject: 'Content repurposing strategy', contact_id: 'demo-contact-3',
    contact: DEMO_INBOX_CONTACTS[2], assigned_to: null, priority: 'normal',
    sentiment: 'positive', post_id: 'demo-post-pub-2',
    post_url: 'https://linkedin.com/posts/longtale-ai-123', snooze_until: null,
    last_message_at: hoursAgo(4), last_message_preview: 'Great insights! We saw similar results with our B2B content.',
    unread_count: 0, metadata: {}, created_at: hoursAgo(6), updated_at: hoursAgo(4),
    labels: [{ label: DEMO_INBOX_LABELS[3] }],
  },
  {
    id: 'demo-conv-4', company_id: DEMO_COMPANY_ID, platform: 'facebook',
    platform_conversation_id: 'dm-facebook-alex', type: 'dm', status: 'open',
    subject: 'Alex Kim', contact_id: 'demo-contact-4',
    contact: DEMO_INBOX_CONTACTS[3], assigned_to: null, priority: 'normal',
    sentiment: 'neutral', post_id: null, post_url: null, snooze_until: null,
    last_message_at: hoursAgo(8), last_message_preview: 'Can you help me set up the RSS automation? Having trouble with the feed URL.',
    unread_count: 3, metadata: {}, created_at: hoursAgo(12), updated_at: hoursAgo(8),
    labels: [{ label: DEMO_INBOX_LABELS[2] }],
  },
  {
    id: 'demo-conv-5', company_id: DEMO_COMPANY_ID, platform: 'tiktok',
    platform_conversation_id: 'tiktok-post-pub-3', type: 'comment', status: 'open',
    subject: 'Behind the scenes content workflow', contact_id: 'demo-contact-5',
    contact: DEMO_INBOX_CONTACTS[4], assigned_to: null, priority: 'normal',
    sentiment: 'positive', post_id: 'demo-post-pub-3', post_url: null, snooze_until: null,
    last_message_at: hoursAgo(2), last_message_preview: 'This is so cool! Can you do a full tutorial?',
    unread_count: 1, metadata: {}, created_at: hoursAgo(5), updated_at: hoursAgo(2),
    labels: [{ label: DEMO_INBOX_LABELS[1] }],
  },
  {
    id: 'demo-conv-6', company_id: DEMO_COMPANY_ID, platform: 'twitter',
    platform_conversation_id: 'dm-twitter-sarah', type: 'dm', status: 'resolved',
    subject: 'Sarah Chen', contact_id: 'demo-contact-1',
    contact: DEMO_INBOX_CONTACTS[0], assigned_to: null, priority: 'normal',
    sentiment: 'positive', post_id: null, post_url: null, snooze_until: null,
    last_message_at: daysAgo(1), last_message_preview: 'Thanks for the help! Everything is working now.',
    unread_count: 0, metadata: {}, created_at: daysAgo(3), updated_at: daysAgo(1),
    labels: [],
  },
];

export const DEMO_INBOX_MESSAGES: Record<string, InboxMessage[]> = {
  'demo-conv-1': [
    {
      id: 'demo-msg-1-1', conversation_id: 'demo-conv-1', company_id: DEMO_COMPANY_ID,
      platform_message_id: 'tw-comment-1', contact_id: 'demo-contact-1',
      contact: DEMO_INBOX_CONTACTS[0], sender_type: 'contact', sender_user_id: null,
      content: 'Wow, 340% growth in organic reach? That\'s incredible! What metrics did you track?',
      content_type: 'text', media_url: null, parent_message_id: null,
      is_internal_note: false, metadata: {}, created_at: hoursAgo(3),
    },
    {
      id: 'demo-msg-1-2', conversation_id: 'demo-conv-1', company_id: DEMO_COMPANY_ID,
      platform_message_id: 'tw-reply-1', contact_id: null,
      contact: null, sender_type: 'agent', sender_user_id: 'demo-user',
      content: 'Thanks Sarah! We tracked impressions, engagement rate, and follower growth across LinkedIn, Twitter, and Instagram. The biggest lift came from AI-optimized posting times.',
      content_type: 'text', media_url: null, parent_message_id: null,
      is_internal_note: false, metadata: {}, created_at: hoursAgo(2),
    },
    {
      id: 'demo-msg-1-3', conversation_id: 'demo-conv-1', company_id: DEMO_COMPANY_ID,
      platform_message_id: 'tw-comment-2', contact_id: 'demo-contact-1',
      contact: DEMO_INBOX_CONTACTS[0], sender_type: 'contact', sender_user_id: null,
      content: 'This is exactly what we needed! How does the AI scheduling work? Is it based on historical engagement data?',
      content_type: 'text', media_url: null, parent_message_id: null,
      is_internal_note: false, metadata: {}, created_at: minsAgo(15),
    },
  ],
  'demo-conv-2': [
    {
      id: 'demo-msg-2-1', conversation_id: 'demo-conv-2', company_id: DEMO_COMPANY_ID,
      platform_message_id: 'ig-dm-1', contact_id: 'demo-contact-2',
      contact: DEMO_INBOX_CONTACTS[1], sender_type: 'contact', sender_user_id: null,
      content: 'Hey! Love your platform. Quick question about pricing \u2014 do you have team plans for agencies?',
      content_type: 'text', media_url: null, parent_message_id: null,
      is_internal_note: false, metadata: {}, created_at: hoursAgo(1),
    },
  ],
  'demo-conv-3': [
    {
      id: 'demo-msg-3-1', conversation_id: 'demo-conv-3', company_id: DEMO_COMPANY_ID,
      platform_message_id: 'li-comment-1', contact_id: 'demo-contact-3',
      contact: DEMO_INBOX_CONTACTS[2], sender_type: 'contact', sender_user_id: null,
      content: 'Great insights! We saw similar results with our B2B content. Repurposing long-form articles into carousel posts on LinkedIn gave us 3x the engagement.',
      content_type: 'text', media_url: null, parent_message_id: null,
      is_internal_note: false, metadata: {}, created_at: hoursAgo(6),
    },
    {
      id: 'demo-msg-3-2', conversation_id: 'demo-conv-3', company_id: DEMO_COMPANY_ID,
      platform_message_id: 'li-reply-1', contact_id: null,
      contact: null, sender_type: 'agent', sender_user_id: 'demo-user',
      content: 'That\'s a great point Emma! Carousels are definitely underrated for B2B. Would love to hear more about your content strategy. Open to a collab?',
      content_type: 'text', media_url: null, parent_message_id: null,
      is_internal_note: false, metadata: {}, created_at: hoursAgo(4),
    },
  ],
  'demo-conv-4': [
    {
      id: 'demo-msg-4-1', conversation_id: 'demo-conv-4', company_id: DEMO_COMPANY_ID,
      platform_message_id: 'fb-dm-1', contact_id: 'demo-contact-4',
      contact: DEMO_INBOX_CONTACTS[3], sender_type: 'contact', sender_user_id: null,
      content: 'Hi there! I signed up yesterday and I\'m trying to set up RSS automation.',
      content_type: 'text', media_url: null, parent_message_id: null,
      is_internal_note: false, metadata: {}, created_at: hoursAgo(12),
    },
    {
      id: 'demo-msg-4-2', conversation_id: 'demo-conv-4', company_id: DEMO_COMPANY_ID,
      platform_message_id: 'fb-dm-2', contact_id: 'demo-contact-4',
      contact: DEMO_INBOX_CONTACTS[3], sender_type: 'contact', sender_user_id: null,
      content: 'I keep getting an error when I paste my feed URL. It says "Invalid RSS feed" but it works in my browser.',
      content_type: 'text', media_url: null, parent_message_id: null,
      is_internal_note: false, metadata: {}, created_at: hoursAgo(11),
    },
    {
      id: 'demo-msg-4-3', conversation_id: 'demo-conv-4', company_id: DEMO_COMPANY_ID,
      platform_message_id: 'fb-dm-3', contact_id: 'demo-contact-4',
      contact: DEMO_INBOX_CONTACTS[3], sender_type: 'contact', sender_user_id: null,
      content: 'Can you help me set up the RSS automation? Having trouble with the feed URL.',
      content_type: 'text', media_url: null, parent_message_id: null,
      is_internal_note: false, metadata: {}, created_at: hoursAgo(8),
    },
  ],
  'demo-conv-5': [
    {
      id: 'demo-msg-5-1', conversation_id: 'demo-conv-5', company_id: DEMO_COMPANY_ID,
      platform_message_id: 'tt-comment-1', contact_id: 'demo-contact-5',
      contact: DEMO_INBOX_CONTACTS[4], sender_type: 'contact', sender_user_id: null,
      content: 'This is so cool! Can you do a full tutorial? I want to set this up for my agency.',
      content_type: 'text', media_url: null, parent_message_id: null,
      is_internal_note: false, metadata: {}, created_at: hoursAgo(2),
    },
  ],
  'demo-conv-6': [
    {
      id: 'demo-msg-6-1', conversation_id: 'demo-conv-6', company_id: DEMO_COMPANY_ID,
      platform_message_id: 'tw-dm-1', contact_id: 'demo-contact-1',
      contact: DEMO_INBOX_CONTACTS[0], sender_type: 'contact', sender_user_id: null,
      content: 'Hey! I noticed a bug with the scheduling feature \u2014 posts scheduled for midnight seem to publish at noon instead.',
      content_type: 'text', media_url: null, parent_message_id: null,
      is_internal_note: false, metadata: {}, created_at: daysAgo(3),
    },
    {
      id: 'demo-msg-6-2', conversation_id: 'demo-conv-6', company_id: DEMO_COMPANY_ID,
      platform_message_id: 'tw-dm-reply-1', contact_id: null,
      contact: null, sender_type: 'agent', sender_user_id: 'demo-user',
      content: 'Thanks for reporting this Sarah! It looks like a timezone issue. Can you check your timezone setting in Settings > Profile? It should match your local timezone.',
      content_type: 'text', media_url: null, parent_message_id: null,
      is_internal_note: false, metadata: {}, created_at: daysAgo(2),
    },
    {
      id: 'demo-msg-6-note', conversation_id: 'demo-conv-6', company_id: DEMO_COMPANY_ID,
      platform_message_id: null, contact_id: null,
      contact: null, sender_type: 'system', sender_user_id: 'demo-user',
      content: 'Confirmed this is a known timezone bug. Fix deployed in v2.3.1. Following up with Sarah.',
      content_type: 'note', media_url: null, parent_message_id: null,
      is_internal_note: true, metadata: {}, created_at: daysAgo(2),
    },
    {
      id: 'demo-msg-6-3', conversation_id: 'demo-conv-6', company_id: DEMO_COMPANY_ID,
      platform_message_id: 'tw-dm-2', contact_id: 'demo-contact-1',
      contact: DEMO_INBOX_CONTACTS[0], sender_type: 'contact', sender_user_id: null,
      content: 'That fixed it! Thanks for the quick help.',
      content_type: 'text', media_url: null, parent_message_id: null,
      is_internal_note: false, metadata: {}, created_at: daysAgo(1),
    },
    {
      id: 'demo-msg-6-4', conversation_id: 'demo-conv-6', company_id: DEMO_COMPANY_ID,
      platform_message_id: 'tw-dm-reply-2', contact_id: null,
      contact: null, sender_type: 'agent', sender_user_id: 'demo-user',
      content: 'Glad to hear it! We also pushed a fix so this won\'t happen again. Let us know if you run into anything else!',
      content_type: 'text', media_url: null, parent_message_id: null,
      is_internal_note: false, metadata: {}, created_at: daysAgo(1),
    },
  ],
};

// ─── Inbox Demo — Canned Replies ────────────────────────────

export const DEMO_INBOX_CANNED_REPLIES: InboxCannedReply[] = [
  {
    id: 'demo-canned-1', company_id: DEMO_COMPANY_ID,
    title: 'Greeting', content: 'Hi {{contact_name}}, thanks for reaching out! How can I help you today?',
    shortcut: 'hi', platform: null, created_by: 'demo-user',
    created_at: daysAgo(30), updated_at: daysAgo(30),
  },
  {
    id: 'demo-canned-2', company_id: DEMO_COMPANY_ID,
    title: 'Pricing Info', content: 'Great question! We have three plans: Starter ($29/mo), Pro ($79/mo), and Enterprise (custom). You can see full details at longtale.ai/pricing. Would you like me to set up a demo?',
    shortcut: 'pricing', platform: null, created_by: 'demo-user',
    created_at: daysAgo(25), updated_at: daysAgo(25),
  },
  {
    id: 'demo-canned-3', company_id: DEMO_COMPANY_ID,
    title: 'Bug Acknowledgment', content: 'Thanks for reporting this, {{contact_name}}! I\'ve logged the issue and our team is looking into it. We\'ll update you as soon as we have a fix.',
    shortcut: 'bug', platform: null, created_by: 'demo-user',
    created_at: daysAgo(20), updated_at: daysAgo(20),
  },
  {
    id: 'demo-canned-4', company_id: DEMO_COMPANY_ID,
    title: 'Follow-up', content: 'Just checking in — did that solve your issue? Let us know if there\'s anything else we can help with!',
    shortcut: 'followup', platform: null, created_by: 'demo-user',
    created_at: daysAgo(15), updated_at: daysAgo(15),
  },
  {
    id: 'demo-canned-5', company_id: DEMO_COMPANY_ID,
    title: 'Instagram DM Thanks', content: 'Thanks for the DM! 💙 We\'ll get back to you shortly.',
    shortcut: 'igthx', platform: 'instagram', created_by: 'demo-user',
    created_at: daysAgo(10), updated_at: daysAgo(10),
  },
];

// ─── Inbox Demo — Automation Rules ──────────────────────────

export const DEMO_INBOX_AUTO_RULES: InboxAutoRule[] = [
  {
    id: 'demo-rule-1', company_id: DEMO_COMPANY_ID,
    name: 'Auto-greet new DMs', enabled: true,
    trigger_type: 'all_new', trigger_value: null,
    trigger_platform: null, trigger_conversation_type: 'dm',
    action_type: 'canned_reply', canned_reply_id: 'demo-canned-1',
    ai_prompt_template: null, created_by: 'demo-user',
    created_at: daysAgo(14), updated_at: daysAgo(14),
  },
  {
    id: 'demo-rule-2', company_id: DEMO_COMPANY_ID,
    name: 'Auto-reply to pricing questions', enabled: true,
    trigger_type: 'keyword', trigger_value: 'pricing, price, cost, how much',
    trigger_platform: null, trigger_conversation_type: null,
    action_type: 'canned_reply', canned_reply_id: 'demo-canned-2',
    ai_prompt_template: null, created_by: 'demo-user',
    created_at: daysAgo(10), updated_at: daysAgo(10),
  },
  {
    id: 'demo-rule-3', company_id: DEMO_COMPANY_ID,
    name: 'AI-powered support responses', enabled: false,
    trigger_type: 'keyword', trigger_value: 'help, support, issue, broken, error',
    trigger_platform: null, trigger_conversation_type: null,
    action_type: 'ai_response', canned_reply_id: null,
    ai_prompt_template: 'You are a helpful customer support agent for Longtale.ai, a social media management platform. Be professional, empathetic, and concise.',
    created_by: 'demo-user',
    created_at: daysAgo(7), updated_at: daysAgo(7),
  },
];

// ─── Inbox Demo — Threaded + Rich Messages ──────────────────

// Add threaded replies and rich media to conv-1 (Twitter comment thread)
DEMO_INBOX_MESSAGES['demo-conv-1'].push(
  {
    id: 'demo-msg-1-4', conversation_id: 'demo-conv-1', company_id: DEMO_COMPANY_ID,
    platform_message_id: 'tw-comment-3', contact_id: 'demo-contact-1',
    contact: DEMO_INBOX_CONTACTS[0], sender_type: 'contact', sender_user_id: null,
    content: '', content_type: 'image',
    media_url: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=300&fit=crop',
    parent_message_id: 'demo-msg-1-2', // Reply to agent message
    is_internal_note: false, metadata: {}, created_at: minsAgo(10),
  },
  {
    id: 'demo-msg-1-5', conversation_id: 'demo-conv-1', company_id: DEMO_COMPANY_ID,
    platform_message_id: 'tw-comment-4', contact_id: 'demo-contact-1',
    contact: DEMO_INBOX_CONTACTS[0], sender_type: 'contact', sender_user_id: null,
    content: 'Here\'s our analytics dashboard for comparison — the spike happened right after we started using AI scheduling!',
    content_type: 'text', media_url: null,
    parent_message_id: 'demo-msg-1-4', // Reply to the image
    is_internal_note: false, metadata: {}, created_at: minsAgo(8),
  },
);

// Add bot auto-reply to conv-2 (Instagram DM)
DEMO_INBOX_MESSAGES['demo-conv-2'].splice(0, 0, {
  id: 'demo-msg-2-0-bot', conversation_id: 'demo-conv-2', company_id: DEMO_COMPANY_ID,
  platform_message_id: null, contact_id: null,
  contact: null, sender_type: 'bot', sender_user_id: null,
  content: 'Hi Mike Rodriguez, thanks for reaching out! How can I help you today?',
  content_type: 'text', media_url: null, parent_message_id: null,
  is_internal_note: false, metadata: { auto_response: true }, created_at: hoursAgo(2),
});

// Add image message to conv-4 (Facebook DM — bug report with screenshot)
DEMO_INBOX_MESSAGES['demo-conv-4'].push({
  id: 'demo-msg-4-4', conversation_id: 'demo-conv-4', company_id: DEMO_COMPANY_ID,
  platform_message_id: 'fb-dm-4', contact_id: 'demo-contact-4',
  contact: DEMO_INBOX_CONTACTS[3], sender_type: 'contact', sender_user_id: null,
  content: 'Here\'s a screenshot of the error I\'m seeing:',
  content_type: 'image',
  media_url: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=400&h=250&fit=crop',
  parent_message_id: null, is_internal_note: false, metadata: {}, created_at: hoursAgo(7),
});

// Add video message to conv-5 (TikTok comment thread)
DEMO_INBOX_MESSAGES['demo-conv-5'].push({
  id: 'demo-msg-5-2', conversation_id: 'demo-conv-5', company_id: DEMO_COMPANY_ID,
  platform_message_id: 'tt-comment-2', contact_id: 'demo-contact-5',
  contact: DEMO_INBOX_CONTACTS[4], sender_type: 'contact', sender_user_id: null,
  content: 'Check out this video — I tried to replicate your workflow!',
  content_type: 'video',
  media_url: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=400&h=300&fit=crop',
  parent_message_id: null, is_internal_note: false, metadata: {}, created_at: hoursAgo(1),
});
