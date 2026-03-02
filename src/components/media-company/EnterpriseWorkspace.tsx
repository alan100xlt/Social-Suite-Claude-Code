import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Building2, Users, TrendingUp, Settings, Plus, Filter } from 'lucide-react';
import { useSecurityContext } from '@/hooks/useSecurityContext';
import { useAccessibleCompanies } from '@/hooks/useSecurityContext';

interface Company {
  id: string;
  name: string;
  role: 'admin' | 'member' | 'viewer';
  followers: number;
  posts: number;
  engagement: number;
  lastActive: string;
}

interface EnterpriseWorkspaceProps {
  mediaCompanyId: string;
}

export function EnterpriseWorkspace({ mediaCompanyId }: EnterpriseWorkspaceProps) {
  const navigate = useNavigate();
  const { securityContext } = useSecurityContext();
  const { companies: accessibleCompanies } = useAccessibleCompanies();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'member' | 'viewer'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'followers' | 'posts' | 'engagement'>('name');
  const [portfolioCompanies, setPortfolioCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data - replace with actual API call
  useEffect(() => {
    const loadPortfolioData = async () => {
      setIsLoading(true);
      try {
        // This would be replaced with actual API call
        const mockData: Company[] = [
          {
            id: '1',
            name: 'Holly Springs Update',
            role: 'admin',
            followers: 5600,
            posts: 245,
            engagement: 43.2,
            lastActive: '2 hours ago'
          },
          {
            id: '2',
            name: 'Wake County News',
            role: 'admin',
            followers: 3200,
            posts: 189,
            engagement: 38.7,
            lastActive: '1 hour ago'
          },
          {
            id: '3',
            name: 'Triangle Business Daily',
            role: 'member',
            followers: 8900,
            posts: 412,
            engagement: 41.5,
            lastActive: '30 minutes ago'
          }
        ];
        setPortfolioCompanies(mockData);
      } catch (error) {
        console.error('Failed to load portfolio data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (mediaCompanyId) {
      loadPortfolioData();
    }
  }, [mediaCompanyId]);

  // Filter and sort companies
  const filteredCompanies = portfolioCompanies
    .filter(company => {
      const matchesSearch = company.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = filterRole === 'all' || company.role === filterRole;
      return matchesSearch && matchesRole;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'followers':
          return b.followers - a.followers;
        case 'posts':
          return b.posts - a.posts;
        case 'engagement':
          return b.engagement - a.engagement;
        default:
          return 0;
      }
    });

  // Calculate portfolio metrics
  const totalFollowers = portfolioCompanies.reduce((sum, company) => sum + company.followers, 0);
  const totalPosts = portfolioCompanies.reduce((sum, company) => sum + company.posts, 0);
  const avgEngagement = portfolioCompanies.length > 0 
    ? portfolioCompanies.reduce((sum, company) => sum + company.engagement, 0) / portfolioCompanies.length 
    : 0;

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'member': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'viewer': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleCompanyClick = (companyId: string) => {
    navigate(`/app/company/${companyId}`);
  };

  const handleBulkContent = () => {
    navigate(`/app/media-company/${mediaCompanyId}/content`);
  };

  const handlePortfolioAnalytics = () => {
    navigate(`/app/media-company/${mediaCompanyId}/analytics`);
  };

  const handleTeamManagement = () => {
    navigate(`/app/media-company/${mediaCompanyId}/team`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Enterprise Workspace</h1>
          <p className="text-gray-600 mt-1">Manage your media company portfolio</p>
        </div>
        <div className="flex space-x-3">
          <Button onClick={handleBulkContent} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Bulk Content</span>
          </Button>
          <Button variant="outline" onClick={handleTeamManagement}>
            <Users className="h-4 w-4 mr-2" />
            Team
          </Button>
        </div>
      </div>

      {/* Portfolio Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolioCompanies.length}</div>
            <p className="text-xs text-muted-foreground">Active companies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Followers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFollowers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across portfolio</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPosts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Published content</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgEngagement.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Portfolio average</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="companies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="companies" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterRole} onValueChange={(value: any) => setFilterRole(value)}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="followers">Followers</SelectItem>
                <SelectItem value="posts">Posts</SelectItem>
                <SelectItem value="engagement">Engagement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Companies Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCompanies.map((company) => (
              <Card 
                key={company.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleCompanyClick(company.id)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{company.name}</CardTitle>
                    <Badge className={getRoleColor(company.role)}>
                      {company.role}
                    </Badge>
                  </div>
                  <CardDescription>
                    Last active {company.lastActive}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Followers</span>
                      <span className="text-sm font-medium">{company.followers.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Posts</span>
                      <span className="text-sm font-medium">{company.posts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Engagement</span>
                      <span className="text-sm font-medium">{company.engagement}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredCompanies.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No companies found</h3>
              <p className="text-gray-600">Try adjusting your search or filters</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Analytics</CardTitle>
              <CardDescription>Performance metrics across your entire portfolio</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Dashboard</h3>
                <p className="text-gray-600 mb-4">Comprehensive analytics coming soon</p>
                <Button onClick={handlePortfolioAnalytics}>
                  View Detailed Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Content Management</CardTitle>
              <CardDescription>Create and manage content across multiple companies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Plus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Content Studio</h3>
                <p className="text-gray-600 mb-4">Create content for multiple companies at once</p>
                <Button onClick={handleBulkContent}>
                  Open Content Studio
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card>
            <CardHeader>
              <CardTitle>Team Management</CardTitle>
              <CardDescription>Manage permissions across your portfolio</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Team Portal</h3>
                <p className="text-gray-600 mb-4">Manage team members and permissions</p>
                <Button onClick={handleTeamManagement}>
                  Manage Team
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
