import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Eye, 
  Share2, 
  Clock,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';
import { useSecurityContext } from '@/hooks/useSecurityContext';

interface PortfolioMetrics {
  totalCompanies: number;
  totalFollowers: number;
  totalPosts: number;
  totalEngagement: number;
  avgEngagementRate: number;
  topPerformingCompanies: CompanyPerformance[];
  platformBreakdown: PlatformMetrics[];
  growthMetrics: GrowthMetrics;
  contentVelocity: ContentVelocity;
}

interface CompanyPerformance {
  id: string;
  name: string;
  followers: number;
  posts: number;
  engagement: number;
  engagementRate: number;
  growth: number;
  lastActive: string;
}

interface PlatformMetrics {
  platform: string;
  posts: number;
  engagement: number;
  engagementRate: number;
  growth: number;
  icon: string;
}

interface GrowthMetrics {
  followerGrowth: number;
  engagementGrowth: number;
  postGrowth: number;
  period: string;
}

interface ContentVelocity {
  postsPerDay: number;
  avgTimeToPublish: number;
  scheduledPosts: number;
  publishedPosts: number;
  successRate: number;
}

interface PortfolioAnalyticsProps {
  mediaCompanyId: string;
}

export function PortfolioAnalytics({ mediaCompanyId }: PortfolioAnalyticsProps) {
  const { securityContext } = useSecurityContext();
  
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

  // Mock data - replace with actual API calls
  useEffect(() => {
    const loadPortfolioMetrics = async () => {
      setIsLoading(true);
      try {
        // Mock portfolio metrics
        const mockMetrics: PortfolioMetrics = {
          totalCompanies: 12,
          totalFollowers: 45678,
          totalPosts: 1234,
          totalEngagement: 89456,
          avgEngagementRate: 4.2,
          topPerformingCompanies: [
            {
              id: '1',
              name: 'Holly Springs Update',
              followers: 5600,
              posts: 89,
              engagement: 234,
              engagementRate: 4.2,
              growth: 12.5,
              lastActive: '2 hours ago'
            },
            {
              id: '2',
              name: 'Wake County News',
              followers: 3200,
              posts: 67,
              engagement: 156,
              engagementRate: 4.9,
              growth: 8.3,
              lastActive: '1 hour ago'
            },
            {
              id: '3',
              name: 'Triangle Business Daily',
              followers: 8900,
              posts: 145,
              engagement: 445,
              engagementRate: 5.0,
              growth: 15.2,
              lastActive: '30 minutes ago'
            }
          ],
          platformBreakdown: [
            {
              platform: 'twitter',
              posts: 456,
              engagement: 12345,
              engagementRate: 3.8,
              growth: 12.3,
              icon: '🐦'
            },
            {
              platform: 'facebook',
              posts: 389,
              engagement: 23456,
              engagementRate: 6.0,
              growth: 8.7,
              icon: '📘'
            },
            {
              platform: 'linkedin',
              posts: 234,
              engagement: 18765,
              engagementRate: 8.0,
              growth: 15.4,
              icon: '💼'
            },
            {
              platform: 'instagram',
              posts: 155,
              engagement: 34890,
              engagementRate: 6.8,
              growth: 22.1,
              icon: '📷'
            }
          ],
          growthMetrics: {
            followerGrowth: 15.3,
            engagementGrowth: 8.7,
            postGrowth: 12.4,
            period: '30 days'
          },
          contentVelocity: {
            postsPerDay: 41.1,
            avgTimeToPublish: 2.3,
            scheduledPosts: 23,
            publishedPosts: 1211,
            successRate: 98.1
          }
        };

        setMetrics(mockMetrics);
      } catch (error) {
        console.error('Failed to load portfolio metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (mediaCompanyId) {
      loadPortfolioMetrics();
    }
  }, [mediaCompanyId, timeRange]);

  const handleExport = () => {
    // Mock export functionality
    const data = {
      metrics,
      timeRange,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-analytics-${timeRange}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRefresh = () => {
    // Trigger data refresh
    window.location.reload();
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );
  };

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? 'text-green-600' : 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
          <p className="text-gray-600">Portfolio analytics will appear here once data is available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Portfolio Analytics</h1>
          <p className="text-gray-600 mt-1">Performance metrics across your entire portfolio</p>
        </div>
        <div className="flex space-x-3">
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Companies</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalCompanies}</div>
            <p className="text-xs text-muted-foreground">Active companies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Followers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(metrics.totalFollowers)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {getGrowthIcon(metrics.growthMetrics.followerGrowth)}
              <span className={`ml-1 ${getGrowthColor(metrics.growthMetrics.followerGrowth)}`}>
                +{metrics.growthMetrics.followerGrowth}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(metrics.totalPosts)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {getGrowthIcon(metrics.growthMetrics.postGrowth)}
              <span className={`ml-1 ${getGrowthColor(metrics.growthMetrics.postGrowth)}`}>
                +{metrics.growthMetrics.postGrowth}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Engagement</CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(metrics.totalEngagement)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {getGrowthIcon(metrics.growthMetrics.engagementGrowth)}
              <span className={`ml-1 ${getGrowthColor(metrics.growthMetrics.engagementGrowth)}`}>
                +{metrics.growthMetrics.engagementGrowth}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Engagement Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgEngagementRate}%</div>
            <p className="text-xs text-muted-foreground">Portfolio average</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="velocity">Content Velocity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performing Companies */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Companies</CardTitle>
                <CardDescription>Ranked by engagement rate</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.topPerformingCompanies.slice(0, 5).map((company, index) => (
                    <div key={company.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-800">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{company.name}</div>
                          <div className="text-sm text-gray-600">{company.followers.toLocaleString()} followers</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{company.engagementRate}%</div>
                        <div className="flex items-center text-sm text-gray-600">
                          {getGrowthIcon(company.growth)}
                          <span className={`ml-1 ${getGrowthColor(company.growth)}`}>
                            +{company.growth}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Content Velocity */}
            <Card>
              <CardHeader>
                <CardTitle>Content Velocity</CardTitle>
                <CardDescription>Publishing speed and efficiency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Posts per Day</span>
                    <span className="font-bold">{metrics.contentVelocity.postsPerDay}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Avg Time to Publish</span>
                    <span className="font-bold">{metrics.contentVelocity.avgTimeToPublish} min</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Success Rate</span>
                    <span className="font-bold text-green-600">{metrics.contentVelocity.successRate}%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Scheduled Posts</span>
                    <span className="font-bold">{metrics.contentVelocity.scheduledPosts}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="companies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Company Performance</CardTitle>
              <CardDescription>Detailed metrics for each company</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.topPerformingCompanies.map(company => (
                  <div key={company.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-lg">{company.name}</h3>
                        <p className="text-sm text-gray-600">Last active {company.lastActive}</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedCompany(company.id)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold">{formatNumber(company.followers)}</div>
                        <div className="text-sm text-gray-600">Followers</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold">{company.posts}</div>
                        <div className="text-sm text-gray-600">Posts</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold">{formatNumber(company.engagement)}</div>
                        <div className="text-sm text-gray-600">Engagement</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold">{company.engagementRate}%</div>
                        <div className="text-sm text-gray-600">Engagement Rate</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platforms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Platform Performance</CardTitle>
              <CardDescription>How content performs across different platforms</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {metrics.platformBreakdown.map(platform => (
                  <Card key={platform.platform} className="border">
                    <CardHeader className="pb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">{platform.icon}</span>
                        <div>
                          <CardTitle className="capitalize">{platform.platform}</CardTitle>
                          <div className="flex items-center text-sm text-gray-600">
                            {getGrowthIcon(platform.growth)}
                            <span className={`ml-1 ${getGrowthColor(platform.growth)}`}>
                              +{platform.growth}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Posts</span>
                          <span className="font-medium">{platform.posts}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Engagement</span>
                          <span className="font-medium">{formatNumber(platform.engagement)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Engagement Rate</span>
                          <span className="font-medium">{platform.engagementRate}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="velocity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Publishing Metrics</CardTitle>
              <CardDescription>Velocity and efficiency of your content pipeline</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Publishing Speed</h3>
                  <div className="space-y-3">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {metrics.contentVelocity.postsPerDay}
                      </div>
                      <div className="text-sm text-blue-700">Posts per day</div>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {metrics.contentVelocity.avgTimeToPublish} min
                      </div>
                      <div className="text-sm text-green-700">Avg time to publish</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Success Metrics</h3>
                  <div className="space-y-3">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {metrics.contentVelocity.successRate}%
                      </div>
                      <div className="text-sm text-green-700">Publishing success rate</div>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">
                        {metrics.contentVelocity.scheduledPosts}
                      </div>
                      <div className="text-sm text-yellow-700">Scheduled posts</div>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatNumber(metrics.contentVelocity.publishedPosts)}
                      </div>
                      <div className="text-sm text-blue-700">Published posts</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
