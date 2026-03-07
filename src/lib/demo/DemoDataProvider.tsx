import { createContext, useContext, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { DEMO_COMPANY_ID, DEMO_COMPANY } from './demo-constants';
import {
  DEMO_POSTS,
  DEMO_ACCOUNTS,
  DEMO_RSS_FEEDS,
  DEMO_FEED_ITEMS,
  DEMO_DASHBOARD_STATS,
  DEMO_DASHBOARD_TRENDS,
  DEMO_CHART_DATA,
  DEMO_PLATFORM_CHART,
  DEMO_BEST_TIMES,
  DEMO_TOP_POSTS,
  DEMO_BRIEFING,
  DEMO_POST_DRAFTS,
  DEMO_PENDING_APPROVALS,
  DEMO_SPARKLINE_DATA,
  DEMO_POSTS_WITH_ANALYTICS,
  DEMO_PLATFORM_BREAKDOWN,
  DEMO_ANALYTICS_BY_PUBLISH_DATE,
  DEMO_CONTENT_DECAY,
  DEMO_INBOX_CONVERSATIONS,
  DEMO_INBOX_MESSAGES,
  DEMO_INBOX_LABELS,
  DEMO_INBOX_CANNED_REPLIES,
  DEMO_INBOX_AUTO_RULES,
  DEMO_POST_TIMELINE,
  DEMO_YOUTUBE_DAILY_VIEWS,
  DEMO_FOLLOWER_STATS,
  DEMO_ACCOUNT_HEALTH,
  DEMO_CAMPAIGNS,
  DEMO_JOURNALISTS,
  DEMO_EVERGREEN_QUEUE,
  DEMO_FEATURE_CONFIG,
  DEMO_PERMISSIONS,
  DEMO_ACTIVITY_FEED,
  DEMO_CORRECTIONS,
  DEMO_NOTIFICATION_PREFERENCES,
  DEMO_ROUTING_RULES,
  DEMO_TEAM_WORKLOAD,
  DEMO_TEAM_METRICS,
} from './demo-data';

interface DemoContextValue {
  isDemo: boolean;
}

const DemoContext = createContext<DemoContextValue>({ isDemo: false });

export function useDemo() {
  return useContext(DemoContext);
}

export function DemoDataProvider({ children }: { children: React.ReactNode }) {
  const { selectedCompanyId } = useSelectedCompany();
  const queryClient = useQueryClient();
  const isDemo = selectedCompanyId === DEMO_COMPANY_ID;

  useEffect(() => {
    if (!isDemo) return;

    // Company data
    queryClient.setQueryData(['company', undefined, DEMO_COMPANY_ID, false], DEMO_COMPANY);
    queryClient.setQueryData(['company', undefined, DEMO_COMPANY_ID, true], DEMO_COMPANY);

    // User role — demo user is owner
    queryClient.setQueryData(['user-role', undefined, DEMO_COMPANY_ID], 'owner');

    // GetLate posts — profileId is null for demo company
    queryClient.setQueryData(['getlate-posts', null, undefined], DEMO_POSTS);
    // Also set for common query variations
    queryClient.setQueryData(['getlate-posts', null, { status: 'scheduled' }], DEMO_POSTS.filter(p => p.status === 'scheduled'));
    queryClient.setQueryData(['getlate-posts', null, { status: 'published' }], DEMO_POSTS.filter(p => p.status === 'published'));
    queryClient.setQueryData(['getlate-posts', null, { status: 'draft' }], DEMO_POSTS.filter(p => p.status === 'draft'));
    queryClient.setQueryData(['getlate-posts', null, { status: 'failed' }], DEMO_POSTS.filter(p => p.status === 'failed'));

    // GetLate accounts — profileId is null
    queryClient.setQueryData(['getlate-accounts', null], DEMO_ACCOUNTS);

    // RSS feeds
    queryClient.setQueryData(['rss-feeds', DEMO_COMPANY_ID], DEMO_RSS_FEEDS);

    // All feed items
    const feedIds = DEMO_RSS_FEEDS.map(f => f.id);
    queryClient.setQueryData(['all-feed-items', feedIds], DEMO_FEED_ITEMS);

    // Dashboard stats (with and without platform filter)
    queryClient.setQueryData(['dashboard-stats', DEMO_COMPANY_ID, undefined], DEMO_DASHBOARD_STATS);
    queryClient.setQueryData(['dashboard-stats', DEMO_COMPANY_ID, null], DEMO_DASHBOARD_STATS);

    // Dashboard trends
    queryClient.setQueryData(['dashboard-trends', DEMO_COMPANY_ID], {
      engagementRate: DEMO_DASHBOARD_TRENDS.engagementRate,
      reach: DEMO_DASHBOARD_TRENDS.reach,
      posts: DEMO_DASHBOARD_TRENDS.posts,
    });

    // Engagement chart data
    queryClient.setQueryData(['dashboard-chart', DEMO_COMPANY_ID], DEMO_CHART_DATA);
    queryClient.setQueryData(['dashboard-platform-chart', DEMO_COMPANY_ID], DEMO_PLATFORM_CHART);

    // Dashboard briefing — the hook uses JSON.stringify(payload) as part of the key,
    // so we set the data for the exact payload the hook will compute from demo stats.
    const briefingPayload = JSON.stringify({
      totalFollowers: DEMO_DASHBOARD_STATS.totalFollowers,
      avgEngagementRate: DEMO_DASHBOARD_STATS.avgEngagementRate,
      totalReach: DEMO_DASHBOARD_STATS.totalReach,
      totalViews: DEMO_DASHBOARD_STATS.totalViews,
      totalPosts: DEMO_DASHBOARD_STATS.totalPosts,
      scheduledCount: DEMO_POSTS.filter(p => p.status === 'scheduled').length,
      draftCount: DEMO_POST_DRAFTS.length,
      pendingApprovals: DEMO_PENDING_APPROVALS.length,
      inactiveAutomations: 0,
      topPostSummary: 'linkedin post with 12400 impressions, 342 likes, 5.8% engagement',
    });
    queryClient.setQueryData(['dashboard-briefing', DEMO_COMPANY_ID, briefingPayload], DEMO_BRIEFING);

    // Best time to post
    queryClient.setQueryData(['best-time-to-post', DEMO_COMPANY_ID, {}], DEMO_BEST_TIMES);
    queryClient.setQueryData(['best-time-to-post', DEMO_COMPANY_ID, { platform: undefined }], DEMO_BEST_TIMES);

    // Top performing posts
    queryClient.setQueryData(['top-posts', DEMO_COMPANY_ID, 'impressions', 50, 30], DEMO_TOP_POSTS);
    queryClient.setQueryData(['top-posts', DEMO_COMPANY_ID, 'impressions', 1, 7], DEMO_TOP_POSTS.slice(0, 1));
    queryClient.setQueryData(['top-posts', DEMO_COMPANY_ID, 'impressions', 3, 30], DEMO_TOP_POSTS);

    // Post drafts
    queryClient.setQueryData(['post-drafts', DEMO_COMPANY_ID], DEMO_POST_DRAFTS);

    // Pending approvals count
    queryClient.setQueryData(['pending-approvals-count', DEMO_COMPANY_ID], DEMO_PENDING_APPROVALS.length);

    // Company members (demo has one user)
    queryClient.setQueryData(['company-members', DEMO_COMPANY_ID], [
      { id: 'demo-user', full_name: 'Demo User', email: 'demo@longtale.ai', avatar_url: null, role: 'owner' },
    ]);

    // Has membership
    queryClient.setQueryData(['has-membership', undefined], true);

    // Account growth (used by dashboard trends for followers)
    queryClient.setQueryData(['account-growth', undefined, 14], {
      totalFollowers: 12400,
      followerChange: 600,
      accounts: DEMO_ACCOUNTS.map(a => ({
        accountId: a.id,
        platform: a.platform,
        username: a.username,
        currentFollowers: a.followers || 0,
        change: Math.round((a.followers || 0) * 0.05),
      })),
    });

    // Posting frequency
    queryClient.setQueryData(['posting-frequency', DEMO_COMPANY_ID, undefined], [
      { platform: 'linkedin', posts_per_week: 4.2, average_engagement_rate: 5.1 },
      { platform: 'twitter', posts_per_week: 6.8, average_engagement_rate: 3.9 },
      { platform: 'instagram', posts_per_week: 2.1, average_engagement_rate: 7.2 },
      { platform: 'facebook', posts_per_week: 1.5, average_engagement_rate: 2.8 },
    ]);

    // Optimal posting windows
    queryClient.setQueryData(['optimal-posting-windows', DEMO_COMPANY_ID, undefined, 'UTC'], [
      {
        platform: 'all',
        topWindows: DEMO_BEST_TIMES.map(bt => ({
          dayOfWeek: bt.day_of_week,
          hour: bt.hour,
          avgEngagement: bt.avg_engagement,
          postCount: bt.post_count,
        })),
        narrative: 'Based on 48 posts over the last 90 days, your best engagement windows are Monday mornings and Wednesday afternoons.',
        confidence: 'high',
        totalPosts: 48,
      },
    ]);

    // Automation rules (empty for demo — no real automations)
    queryClient.setQueryData(['automation-rules', DEMO_COMPANY_ID], []);

    // Dashboard sparklines (7-day mini charts for KPI cards)
    queryClient.setQueryData(['dashboard-sparkline', DEMO_COMPANY_ID], DEMO_SPARKLINE_DATA);

    // Pending approvals activity (for ActivityTimeline)
    queryClient.setQueryData(['pending-approvals-activity', DEMO_COMPANY_ID], DEMO_PENDING_APPROVALS);

    // All posts with analytics (for RecentPostsTable + TopPostsTable + Analytics)
    queryClient.setQueryData(['all-posts-with-analytics', DEMO_COMPANY_ID, null, 30], DEMO_POSTS_WITH_ANALYTICS);
    queryClient.setQueryData(['all-posts-with-analytics', DEMO_COMPANY_ID, null, 7], DEMO_POSTS_WITH_ANALYTICS);
    queryClient.setQueryData(['all-posts-with-analytics', DEMO_COMPANY_ID, null, 90], DEMO_POSTS_WITH_ANALYTICS);

    // Platform breakdown (for PlatformBreakdownTable)
    // The hook uses { startDate, endDate } as params — set for common date ranges
    const today = new Date().toISOString().split('T')[0];
    const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const sevenAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const ninetyAgo = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
    queryClient.setQueryData(['platform-breakdown', DEMO_COMPANY_ID, { startDate: thirtyAgo, endDate: today }], DEMO_PLATFORM_BREAKDOWN);
    queryClient.setQueryData(['platform-breakdown', DEMO_COMPANY_ID, { startDate: sevenAgo, endDate: today }], DEMO_PLATFORM_BREAKDOWN);
    queryClient.setQueryData(['platform-breakdown', DEMO_COMPANY_ID, { startDate: ninetyAgo, endDate: today }], DEMO_PLATFORM_BREAKDOWN);

    // Analytics by publish date (for consolidated analytics page)
    queryClient.setQueryData(['analytics-by-publish-date', DEMO_COMPANY_ID, { startDate: thirtyAgo, endDate: today }], DEMO_ANALYTICS_BY_PUBLISH_DATE);
    queryClient.setQueryData(['analytics-by-publish-date', DEMO_COMPANY_ID, { startDate: sevenAgo, endDate: today }], DEMO_ANALYTICS_BY_PUBLISH_DATE.slice(-7));
    queryClient.setQueryData(['analytics-by-publish-date', DEMO_COMPANY_ID, { startDate: ninetyAgo, endDate: today }], DEMO_ANALYTICS_BY_PUBLISH_DATE);

    // Content decay (for analytics engagement tab)
    queryClient.setQueryData(['content-decay', DEMO_COMPANY_ID, {}], DEMO_CONTENT_DECAY);

    // Last sync time (prevent sync indicator from showing stale state)
    queryClient.setQueryData(['last-sync-time', DEMO_COMPANY_ID], new Date().toISOString());

    // Inbox conversations (various filter combinations)
    queryClient.setQueryData(['inbox-conversations', DEMO_COMPANY_ID, undefined], DEMO_INBOX_CONVERSATIONS);
    queryClient.setQueryData(['inbox-conversations', DEMO_COMPANY_ID, {}], DEMO_INBOX_CONVERSATIONS);
    queryClient.setQueryData(['inbox-conversations', DEMO_COMPANY_ID, { status: undefined, platform: undefined, type: undefined }], DEMO_INBOX_CONVERSATIONS);
    queryClient.setQueryData(['inbox-conversations', DEMO_COMPANY_ID, { status: 'open' }], DEMO_INBOX_CONVERSATIONS.filter(c => c.status === 'open'));
    queryClient.setQueryData(['inbox-conversations', DEMO_COMPANY_ID, { status: 'resolved' }], DEMO_INBOX_CONVERSATIONS.filter(c => c.status === 'resolved'));
    queryClient.setQueryData(['inbox-conversations', DEMO_COMPANY_ID, { type: 'comment' }], DEMO_INBOX_CONVERSATIONS.filter(c => c.type === 'comment'));
    queryClient.setQueryData(['inbox-conversations', DEMO_COMPANY_ID, { type: 'dm' }], DEMO_INBOX_CONVERSATIONS.filter(c => c.type === 'dm'));

    // Inbox messages per conversation
    Object.entries(DEMO_INBOX_MESSAGES).forEach(([convId, msgs]) => {
      queryClient.setQueryData(['inbox-messages', DEMO_COMPANY_ID, convId], msgs);
    });

    // Inbox labels
    queryClient.setQueryData(['inbox-labels', DEMO_COMPANY_ID], DEMO_INBOX_LABELS);

    // Inbox canned replies (empty for demo)
    queryClient.setQueryData(['inbox-canned-replies', DEMO_COMPANY_ID], DEMO_INBOX_CANNED_REPLIES);
    queryClient.setQueryData(['inbox-auto-rules', DEMO_COMPANY_ID], DEMO_INBOX_AUTO_RULES);

    // Inbox AI settings (demo defaults)
    queryClient.setQueryData(['inbox-ai-settings', DEMO_COMPANY_ID], {
      company_id: DEMO_COMPANY_ID,
      company_type: 'media',
      auto_classify: true,
      smart_acknowledgment: false,
      crisis_detection: true,
      crisis_threshold: 5,
      crisis_window_minutes: 30,
      auto_translate: false,
      content_recycling: false,
      ai_calls_count: 142,
      ai_calls_reset_at: new Date().toISOString(),
    });

    // No active crisis events for demo
    queryClient.setQueryData(['inbox-crisis-events', DEMO_COMPANY_ID], []);

    // Post timeline (for PostTimeline widget)
    queryClient.setQueryData(['post-timeline', 'demo-post-pub-1'], DEMO_POST_TIMELINE);

    // YouTube daily views (for YouTube analytics)
    queryClient.setQueryData(['youtube-daily-views', 'demo-post-pub-3'], DEMO_YOUTUBE_DAILY_VIEWS);

    // Follower stats (historical follower growth)
    for (const account of DEMO_ACCOUNTS) {
      queryClient.setQueryData(['follower-stats', account.id], DEMO_FOLLOWER_STATS);
    }

    // Account health (SOC-261)
    queryClient.setQueryData(['account-health', DEMO_COMPANY_ID], DEMO_ACCOUNT_HEALTH);

    // ─── Content Page Overhaul (Phases 0-14) ───

    // Campaigns (Phase 5)
    queryClient.setQueryData(['campaigns', DEMO_COMPANY_ID], DEMO_CAMPAIGNS);
    // Campaign posts (empty for demo campaigns)
    for (const campaign of DEMO_CAMPAIGNS) {
      queryClient.setQueryData(['campaign-posts', campaign.id], []);
    }

    // Feature config (Phase 3)
    queryClient.setQueryData(['feature-config', DEMO_COMPANY_ID], DEMO_FEATURE_CONFIG);

    // Permissions (Phase 1)
    queryClient.setQueryData(['user-permissions', undefined, DEMO_COMPANY_ID], DEMO_PERMISSIONS);

    // Evergreen queue (Phase 8)
    queryClient.setQueryData(['evergreen-queue', DEMO_COMPANY_ID], DEMO_EVERGREEN_QUEUE);

    // Performance alerts (Phase 10 — no active alerts for demo)
    queryClient.setQueryData(['performance-alerts', DEMO_COMPANY_ID], []);

    // Cross-outlet analytics (Phase 11 — empty for demo, no media company)
    queryClient.setQueryData(['cross-outlet-analytics', undefined], []);

    // ─── Teamwork Features ───

    // Activity feed
    queryClient.setQueryData(['activity-feed', DEMO_COMPANY_ID, 50], DEMO_ACTIVITY_FEED);

    // Corrections
    queryClient.setQueryData(['corrections', DEMO_COMPANY_ID], DEMO_CORRECTIONS);

    // Notification preferences
    queryClient.setQueryData(['notification-preferences', 'demo-user', DEMO_COMPANY_ID], DEMO_NOTIFICATION_PREFERENCES);

    // Routing rules
    queryClient.setQueryData(['routing-rules', DEMO_COMPANY_ID], DEMO_ROUTING_RULES);

    // Team workload
    queryClient.setQueryData(['team-workload', DEMO_COMPANY_ID], DEMO_TEAM_WORKLOAD);

    // Team metrics (multiple time ranges)
    queryClient.setQueryData(['team-metrics', DEMO_COMPANY_ID, 7], DEMO_TEAM_METRICS);
    queryClient.setQueryData(['team-metrics', DEMO_COMPANY_ID, 30], DEMO_TEAM_METRICS);
    queryClient.setQueryData(['team-metrics', DEMO_COMPANY_ID, 90], DEMO_TEAM_METRICS);

    // Cross-outlet members (empty for demo — no media company hierarchy)
    queryClient.setQueryData(['cross-outlet-members', DEMO_COMPANY_ID], []);
  }, [isDemo, queryClient]);

  const value = useMemo(() => ({ isDemo }), [isDemo]);

  return (
    <DemoContext.Provider value={value}>
      {children}
    </DemoContext.Provider>
  );
}
