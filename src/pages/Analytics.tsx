import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, Eye, Heart, Loader2, BarChart3, Users, TrendingUp, TrendingDown } from "lucide-react";
import { FaInstagram, FaTwitter, FaLinkedin, FaFacebook, FaTiktok } from "react-icons/fa";
import { useAccounts } from "@/hooks/useGetLateAccounts";
import { useHistoricalAnalytics, useAnalyticsByPlatform } from "@/hooks/useHistoricalAnalytics";
import { useAccountGrowth, useAggregatedFollowers } from "@/hooks/useAccountGrowth";
import { useTopPerformingPosts } from "@/hooks/useTopPerformingPosts";
import { useAllPostsWithAnalytics } from "@/hooks/useAllPostsWithAnalytics";
import { usePlatformBreakdown } from "@/hooks/usePlatformBreakdown";
import { useViewsByPublishDate } from "@/hooks/useViewsByPublishDate";
import { useFollowersByPlatform } from "@/hooks/useFollowersByPlatform";
import { useCompany } from "@/hooks/useCompany";
import { PlatformBreakdownTable } from "@/components/analytics/PlatformBreakdownTable";
import { AnalyticsDebugPanel } from "@/components/analytics/AnalyticsDebugPanel";
import { TopPostCard } from "@/components/analytics/TopPostCard";
import { TopPostsTable } from "@/components/analytics/TopPostsTable";
import { DateRangeFilter, computeGranularity } from "@/components/analytics/DateRangeFilter";
import {
  ViewsEngagementArea,
  PlatformDonut,
  EngagementStackedArea,
  EngagementSummaryCard,
  FollowerGrowthLine,
  PlatformHBar,
  ObjectiveBreakdown,
  FrequencyCorrelation,
  PlatformStackedBar,
  ClicksOverTimeLine,
  FollowerDistributionDonut,
  FollowersByPlatformBar,
} from "@/components/analytics/charts";
import { Platform } from "@/lib/api/getlate";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { differenceInDays, subDays } from "date-fns";

const platformIcons: Record<Platform, React.ElementType> = {
  instagram: FaInstagram,
  twitter: FaTwitter,
  facebook: FaFacebook,
  linkedin: FaLinkedin,
  tiktok: FaTiktok,
  youtube: FaTwitter,
  pinterest: FaTwitter,
  reddit: FaTwitter,
  bluesky: FaTwitter,
  threads: FaTwitter,
  "google-business": FaFacebook,
  telegram: FaFacebook,
  snapchat: FaFacebook,
};

const platformColors: Record<Platform, string> = {
  instagram: "bg-instagram",
  twitter: "bg-twitter",
  facebook: "bg-facebook",
  linkedin: "bg-linkedin",
  tiktok: "bg-tiktok",
  youtube: "bg-destructive",
  pinterest: "bg-destructive",
  reddit: "bg-destructive",
  bluesky: "bg-twitter",
  threads: "bg-foreground",
  "google-business": "bg-success",
  telegram: "bg-twitter",
  snapchat: "bg-warning",
};

const platformNames: Record<Platform, string> = {
  instagram: "Instagram",
  twitter: "Twitter",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube",
  pinterest: "Pinterest",
  reddit: "Reddit",
  bluesky: "Bluesky",
  threads: "Threads",
  "google-business": "Google",
  telegram: "Telegram",
  snapchat: "Snapchat",
};

const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const formatPercent = (num: number) => `${num >= 0 ? "+" : ""}${num.toFixed(1)}%`;

export default function AnalyticsPage() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "overview";
  const highlightPostId = searchParams.get("postId") || undefined;
  const [activeTab, setActiveTab] = useState(initialTab);

  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(subDays(new Date(), 30).toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(today);

  const handleRangeChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  const days = differenceInDays(new Date(endDate), new Date(startDate));
  const granularity = computeGranularity(startDate, endDate);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const { data: company } = useCompany();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: analytics, isLoading: analyticsLoading } = useHistoricalAnalytics({ startDate, endDate });
  const { data: platformData } = useAnalyticsByPlatform({ startDate, endDate });
  const { data: platformBreakdown, isLoading: platformBreakdownLoading } = usePlatformBreakdown({ startDate, endDate });
  const { data: accountGrowth } = useAccountGrowth({ days });
  const { data: followerTrend } = useAggregatedFollowers(days);
  const { data: topPosts, isLoading: topPostsLoading } = useTopPerformingPosts({ limit: 50, days });
  const { data: allPosts, isLoading: allPostsLoading } = useAllPostsWithAnalytics({ days });
  const { data: viewsByDate } = useViewsByPublishDate(days);
  const { data: followersByPlatform, isLoading: followersByPlatformLoading } = useFollowersByPlatform({ startDate, endDate });

  const isLoading = accountsLoading || analyticsLoading;

  // Period-over-period change
  const getPeriodChange = () => {
    if (!analytics?.dailyMetrics || analytics.dailyMetrics.length < 2) return 0;
    const mid = Math.floor(analytics.dailyMetrics.length / 2);
    const firstHalf = analytics.dailyMetrics.slice(0, mid);
    const secondHalf = analytics.dailyMetrics.slice(mid);
    const useViews = (analytics?.totalImpressions || 0) === 0 && (analytics?.totalViews || 0) > 0;
    const metric = useViews ? "views" : "impressions";
    const firstSum = firstHalf.reduce((a, b) => a + (b[metric] || 0), 0);
    const secondSum = secondHalf.reduce((a, b) => a + (b[metric] || 0), 0);
    if (firstSum === 0) return secondSum > 0 ? 100 : 0;
    return ((secondSum - firstSum) / firstSum) * 100;
  };

  const impressionChange = getPeriodChange();

  // Platform distribution for donut
  const platformDistribution = (platformData || []).map((p) => ({
    name: platformNames[p.platform as Platform] || p.platform,
    value: p.impressions,
  }));

  // Platform bar data
  const platformBarData = (platformData || []).map((p) => ({
    platform: p.platform,
    name: platformNames[p.platform as Platform] || p.platform,
    impressions: p.impressions,
    views: p.views,
    engagement: p.engagement,
  }));

  // Objective breakdown data from top posts
  const objectiveData = topPosts?.map((p) => ({
    postId: p.postId,
    objective: p.objective,
    views: p.views,
    engagement: p.engagement,
  }));

  const totalFollowers = accountGrowth?.totalFollowers || 0;
  const followerChange = accountGrowth?.changePercent || 0;
  const connectedAccounts = accounts?.length || 0;
  const totalEngagement = (analytics?.totalLikes || 0) + (analytics?.totalComments || 0) + (analytics?.totalShares || 0);

  // Follower distribution for pie chart
  const followerDistribution = useMemo(() => {
    if (!accountGrowth?.dataPoints) return [];
    const latestByPlatform = new Map<string, number>();
    for (const point of accountGrowth.dataPoints) {
      latestByPlatform.set(point.platform, point.followers);
    }
    return Array.from(latestByPlatform.entries()).map(([platform, followers]) => ({
      platform,
      followers,
    }));
  }, [accountGrowth?.dataPoints]);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">Track your social media performance and growth</p>
        </div>
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onRangeChange={handleRangeChange}
          companyCreatedAt={company?.created_at}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <StatCard
              title="Post Impressions"
              value={formatNumber(analytics?.totalImpressions || 0)}
              change={formatPercent(impressionChange)}
              changeType={impressionChange >= 0 ? "positive" : "negative"}
              icon={Eye}
              iconColor="bg-primary/10 text-primary"
            />
            <StatCard
              title="Video Views"
              value={formatNumber(analytics?.totalViews || 0)}
              change={`${analytics?.totalPosts || 0} posts`}
              changeType="neutral"
              icon={Eye}
              iconColor="bg-accent/10 text-accent"
            />
            <StatCard
              title="Total Engagement"
              value={formatNumber(totalEngagement)}
              change={`${analytics?.totalPosts || 0} posts`}
              changeType="neutral"
              icon={Heart}
              iconColor="bg-accent/10 text-accent"
            />
            <StatCard
              title="Total Followers"
              value={formatNumber(totalFollowers)}
              change={formatPercent(followerChange)}
              changeType={followerChange >= 0 ? "positive" : "negative"}
              icon={Users}
              iconColor="bg-success/10 text-success"
            />
            <StatCard
              title="Avg Engagement Rate"
              value={`${(analytics?.avgEngagementRate || 0).toFixed(2)}%`}
              change={`${connectedAccounts} accounts`}
              changeType="neutral"
              icon={BarChart3}
              iconColor="bg-warning/10 text-warning"
            />
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="platforms">Platforms</TabsTrigger>
              <TabsTrigger value="engagement">Engagement</TabsTrigger>
              <TabsTrigger value="audience">Audience</TabsTrigger>
              <TabsTrigger value="posts">All Posts</TabsTrigger>
            </TabsList>

            {/* ─── Overview Tab ─── */}
            <TabsContent value="overview" className="space-y-6">
              {/* 2x2 KPI grid with charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FollowerGrowthLine
                  data={followerTrend}
                  changePercent={accountGrowth?.changePercent}
                  followerChange={accountGrowth?.followerChange}
                  totalFollowers={totalFollowers}
                  compact
                  onViewDetails={() => handleTabChange("audience")}
                />
                <ViewsEngagementArea data={viewsByDate} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <EngagementSummaryCard
                  data={analytics?.dailyMetrics}
                  totalEngagement={totalEngagement}
                  onViewDetails={() => handleTabChange("engagement")}
                />
                <ClicksOverTimeLine
                  data={analytics?.dailyMetrics}
                  totalClicks={analytics?.totalClicks || 0}
                  compact
                />
              </div>

              {/* Platform Breakdown */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">Platform Breakdown</CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs gap-1 shrink-0" onClick={() => handleTabChange("platforms")}>
                    View all <ArrowRight className="w-3 h-3" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {!platformBreakdown || platformBreakdown.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-sm text-muted-foreground">No platform data available</p>
                    </div>
                  ) : (
                    <PlatformBreakdownTable data={platformBreakdown.slice(0, 4)} isLoading={platformBreakdownLoading} />
                  )}
                </CardContent>
              </Card>

              {/* Top Posts */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">Top Posts</CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs gap-1 shrink-0" onClick={() => handleTabChange("posts")}>
                    View all <ArrowRight className="w-3 h-3" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {topPostsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : !topPosts || topPosts.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-sm text-muted-foreground">No post analytics available</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {topPosts.slice(0, 3).map((post, index) => (
                        <TopPostCard key={post.postId} post={post} rank={index + 1} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ─── Platforms Tab ─── */}
            <TabsContent value="platforms" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FollowerDistributionDonut
                  data={followerDistribution}
                  totalFollowers={totalFollowers}
                />
                <PlatformDonut data={platformDistribution} title="Impressions by Platform" metric="Impressions" />
              </div>

              <FollowersByPlatformBar
                data={followersByPlatform}
                isLoading={followersByPlatformLoading}
              />

              <Card>
                <CardHeader>
                  <CardTitle>Platform Breakdown</CardTitle>
                  <p className="text-sm text-muted-foreground">Detailed metrics for each connected platform</p>
                </CardHeader>
                <CardContent>
                  <PlatformBreakdownTable data={platformBreakdown || []} isLoading={platformBreakdownLoading} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ─── Engagement Tab ─── */}
            <TabsContent value="engagement" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <EngagementStackedArea data={analytics?.dailyMetrics} />
                <PlatformHBar data={platformBarData} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ObjectiveBreakdown data={objectiveData} />
                <FrequencyCorrelation data={viewsByDate} />
              </div>
              <PlatformStackedBar startDate={startDate} endDate={endDate} />
            </TabsContent>

            {/* ─── Audience Tab ─── */}
            <TabsContent value="audience" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FollowerGrowthLine
                  data={followerTrend}
                  changePercent={accountGrowth?.changePercent}
                  followerChange={accountGrowth?.followerChange}
                  totalFollowers={totalFollowers}
                />
                <Card>
                  <CardHeader>
                    <CardTitle>Connected Accounts</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!accounts || accounts.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No accounts connected</p>
                      </div>
                    ) : (
                      accounts.map((account) => {
                        const Icon = platformIcons[account.platform as Platform] || FaTwitter;
                        const colorClass = platformColors[account.platform as Platform] || "bg-muted";
                        return (
                          <div key={account.id} className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", colorClass)}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{account.username}</p>
                              <p className="text-sm text-muted-foreground">
                                {platformNames[account.platform as Platform] || account.platform}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{formatNumber(account.followers || 0)}</p>
                              <p className="text-xs text-muted-foreground">followers</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ─── Posts Tab ─── */}
            <TabsContent value="posts" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>All Posts</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    All posts from GetLate, enriched with analytics when available — hover to delete
                  </p>
                </CardHeader>
                <CardContent>
                  <TopPostsTable posts={allPosts || []} isLoading={allPostsLoading} highlightPostId={highlightPostId} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="mt-8">
            <AnalyticsDebugPanel />
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
