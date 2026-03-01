import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Building2, 
  Users, 
  BarChart3, 
  Settings, 
  Bot,
  FileText,
  ChevronRight,
  Star,
  Clock,
  TrendingUp,
  Activity,
  Filter,
  Grid,
  List,
  ArrowUpDown,
  Bookmark,
  Home,
  Briefcase,
  Target,
  Zap,
  Eye,
  Edit,
  Share2,
  Calendar,
  Bell,
  HelpCircle,
  Menu,
  X
} from 'lucide-react';
import { useSecurityContext } from '@/hooks/useSecurityContext';

interface Company {
  id: string;
  name: string;
  description?: string;
  platforms: string[];
  status: 'active' | 'inactive' | 'pending';
  metrics: {
    followers: number;
    posts: number;
    engagement: number;
    growth: number;
  };
  lastActive: string;
  tags: string[];
  favorite: boolean;
  role: 'admin' | 'member' | 'viewer';
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
  description?: string;
  category: 'overview' | 'content' | 'analytics' | 'team' | 'automation' | 'assets';
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  shortcut?: string;
  description?: string;
}

interface EnterpriseNavigationProps {
  mediaCompanyId: string;
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

export function EnterpriseNavigation({ 
  mediaCompanyId, 
  currentPath = '/overview',
  onNavigate 
}: EnterpriseNavigationProps) {
  const { securityContext } = useSecurityContext();
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'followers' | 'engagement' | 'lastActive'>('name');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Navigation structure
  const navigationItems: NavigationItem[] = useMemo(() => [
    {
      id: 'overview',
      label: 'Portfolio Overview',
      icon: <Home className="h-5 w-5" />,
      path: '/overview',
      description: 'Dashboard with portfolio metrics and insights',
      category: 'overview'
    },
    {
      id: 'content',
      label: 'Content Management',
      icon: <FileText className="h-5 w-5" />,
      path: '/content',
      badge: 12, // Pending content items
      description: 'Create and manage content across portfolio',
      category: 'content'
    },
    {
      id: 'analytics',
      label: 'Portfolio Analytics',
      icon: <BarChart3 className="h-5 w-5" />,
      path: '/analytics',
      description: 'Performance analytics and insights',
      category: 'analytics'
    },
    {
      id: 'team',
      label: 'Team Management',
      icon: <Users className="h-5 w-5" />,
      path: '/team',
      badge: 3, // Pending invitations
      description: 'Manage team members and permissions',
      category: 'team'
    },
    {
      id: 'automation',
      label: 'Automation Rules',
      icon: <Bot className="h-5 w-5" />,
      path: '/automation',
      description: 'Configure automation and workflows',
      category: 'automation'
    },
    {
      id: 'assets',
      label: 'Asset Library',
      icon: <Briefcase className="h-5 w-5" />,
      path: '/assets',
      description: 'Centralized media asset management',
      category: 'assets'
    }
  ], []);

  // Quick actions
  const quickActions: QuickAction[] = useMemo(() => [
    {
      id: 'create-content',
      label: 'Create Content',
      icon: <FileText className="h-4 w-4" />,
      action: () => onNavigate?.('/content/create'),
      shortcut: 'Ctrl+N',
      description: 'Create new content for portfolio'
    },
    {
      id: 'invite-member',
      label: 'Invite Team Member',
      icon: <Users className="h-4 w-4" />,
      action: () => onNavigate?.('/team/invite'),
      shortcut: 'Ctrl+I',
      description: 'Send invitation to new team member'
    },
    {
      id: 'view-analytics',
      label: 'View Analytics',
      icon: <BarChart3 className="h-4 w-4" />,
      action: () => onNavigate?.('/analytics'),
      shortcut: 'Ctrl+A',
      description: 'Open portfolio analytics dashboard'
    },
    {
      id: 'automation-rules',
      label: 'Automation Rules',
      icon: <Bot className="h-4 w-4" />,
      action: () => onNavigate?.('/automation'),
      shortcut: 'Ctrl+R',
      description: 'Manage automation rules'
    }
  ], [onNavigate]);

  // Mock data - replace with actual API calls
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        // Mock companies data
        const mockCompanies: Company[] = [
          {
            id: '1',
            name: 'Holly Springs Update',
            description: 'Local news and community updates',
            platforms: ['twitter', 'facebook', 'linkedin'],
            status: 'active',
            metrics: {
              followers: 5600,
              posts: 89,
              engagement: 234,
              growth: 12.5
            },
            lastActive: '2 hours ago',
            tags: ['news', 'community', 'local'],
            favorite: true,
            role: 'admin'
          },
          {
            id: '2',
            name: 'Wake County News',
            description: 'County-wide news and events',
            platforms: ['twitter', 'facebook', 'instagram'],
            status: 'active',
            metrics: {
              followers: 3200,
              posts: 67,
              engagement: 156,
              growth: 8.3
            },
            lastActive: '1 hour ago',
            tags: ['news', 'county', 'events'],
            favorite: false,
            role: 'admin'
          },
          {
            id: '3',
            name: 'Triangle Business Daily',
            description: 'Business news and insights',
            platforms: ['twitter', 'facebook', 'linkedin', 'instagram'],
            status: 'active',
            metrics: {
              followers: 8900,
              posts: 145,
              engagement: 445,
              growth: 15.2
            },
            lastActive: '30 minutes ago',
            tags: ['business', 'economy', 'insights'],
            favorite: true,
            role: 'member'
          },
          {
            id: '4',
            name: 'Raleigh Tech Hub',
            description: 'Technology and startup news',
            platforms: ['twitter', 'linkedin'],
            status: 'pending',
            metrics: {
              followers: 1200,
              posts: 23,
              engagement: 45,
              growth: 25.0
            },
            lastActive: '1 day ago',
            tags: ['tech', 'startups', 'innovation'],
            favorite: false,
            role: 'viewer'
          },
          {
            id: '5',
            name: 'Durham Community',
            description: 'Community-focused content',
            platforms: ['facebook', 'instagram'],
            status: 'active',
            metrics: {
              followers: 2800,
              posts: 56,
              engagement: 123,
              growth: 6.7
            },
            lastActive: '3 hours ago',
            tags: ['community', 'local', 'events'],
            favorite: false,
            role: 'member'
          }
        ];
        setCompanies(mockCompanies);
        setRecentlyViewed(['1', '3', '2']);
        setFavorites(['1', '3']);
      } catch (error) {
        console.error('Failed to load companies:', error);
      }
    };

    if (mediaCompanyId) {
      loadCompanies();
    }
  }, [mediaCompanyId]);

  // Filter and sort companies
  const filteredCompanies = useMemo(() => {
    let filtered = companies.filter(company => {
      const matchesSearch = company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           company.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           company.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = filterStatus === 'all' || company.status === filterStatus;
      return matchesSearch && matchesStatus;
    });

    // Sort companies
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'followers':
          return b.metrics.followers - a.metrics.followers;
        case 'engagement':
          return b.metrics.engagement - a.metrics.engagement;
        case 'lastActive':
          return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [companies, searchQuery, filterStatus, sortBy]);

  const handleCompanySelect = (companyId: string) => {
    setSelectedCompany(companyId);
    // Add to recently viewed
    setRecentlyViewed(prev => [companyId, ...prev.filter(id => id !== companyId)].slice(0, 5));
    onNavigate?.(`/company/${companyId}`);
  };

  const toggleFavorite = (companyId: string) => {
    setFavorites(prev => 
      prev.includes(companyId) 
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    );
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Settings className="h-4 w-4" />;
      case 'member': return <Users className="h-4 w-4" />;
      case 'viewer': return <Eye className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Enterprise Workspace</h1>
          <p className="text-gray-600 mt-1">Navigate your portfolio with intelligent search and quick access</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </Button>
          <Button variant="outline" size="sm">
            <HelpCircle className="h-4 w-4 mr-2" />
            Help
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className="lg:hidden"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            {showMobileMenu ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <CardDescription>Frequently used actions and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map(action => (
              <Button
                key={action.id}
                variant="outline"
                className="h-auto p-4 flex flex-col items-center space-y-2"
                onClick={action.action}
              >
                {action.icon}
                <span className="text-sm">{action.label}</span>
                {action.shortcut && (
                  <span className="text-xs text-gray-500">{action.shortcut}</span>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Navigation Menu */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Navigation</CardTitle>
              <CardDescription>Portfolio features and tools</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <nav className="space-y-1">
                {navigationItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => onNavigate?.(item.path)}
                    className={`w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors ${
                      currentPath === item.path ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {item.icon}
                      <div>
                        <div className="font-medium">{item.label}</div>
                        {item.description && (
                          <div className="text-sm text-gray-600">{item.description}</div>
                        )}
                      </div>
                    </div>
                    {item.badge && (
                      <Badge variant="destructive" className="text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Company Grid */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Portfolio Companies</CardTitle>
                  <CardDescription>Quick access to all your companies</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                  >
                    {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search companies, tags, or descriptions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="followers">Followers</SelectItem>
                    <SelectItem value="engagement">Engagement</SelectItem>
                    <SelectItem value="lastActive">Last Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Companies Display */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredCompanies.map(company => (
                    <Card 
                      key={company.id} 
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleCompanySelect(company.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2">
                            <Building2 className="h-5 w-5 text-blue-600" />
                            <div>
                              <CardTitle className="text-base">{company.name}</CardTitle>
                              <CardDescription className="text-sm">
                                {company.description}
                              </CardDescription>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(company.id);
                            }}
                          >
                            <Star className={`h-4 w-4 ${favorites.includes(company.id) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge className={getStatusColor(company.status)}>
                              {company.status}
                            </Badge>
                            <div className="flex items-center space-x-1">
                              {getRoleIcon(company.role)}
                              <span className="text-sm text-gray-600">{company.role}</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-600">Followers:</span>
                              <span className="ml-1 font-medium">{formatNumber(company.metrics.followers)}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Engagement:</span>
                              <span className="ml-1 font-medium">{company.metrics.engagement}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Growth:</span>
                              <span className="ml-1 font-medium text-green-600">+{company.metrics.growth}%</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Posts:</span>
                              <span className="ml-1 font-medium">{company.metrics.posts}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <span>Last active: {company.lastActive}</span>
                            <ChevronRight className="h-4 w-4" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredCompanies.map(company => (
                    <Card 
                      key={company.id} 
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleCompanySelect(company.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Building2 className="h-5 w-5 text-blue-600" />
                            <div>
                              <div className="font-medium">{company.name}</div>
                              <div className="text-sm text-gray-600">{company.description}</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="text-right text-sm">
                              <div>{formatNumber(company.metrics.followers)} followers</div>
                              <div className="text-green-600">+{company.metrics.growth}%</div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {filteredCompanies.length === 0 && (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Companies Found</h3>
                  <p className="text-gray-600">Try adjusting your search or filters</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recently Viewed */}
          {recentlyViewed.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Recently Viewed</CardTitle>
                <CardDescription>Quick access to recently visited companies</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-4">
                  {recentlyViewed.map(companyId => {
                    const company = companies.find(c => c.id === companyId);
                    if (!company) return null;
                    
                    return (
                      <Button
                        key={companyId}
                        variant="outline"
                        className="flex items-center space-x-2"
                        onClick={() => handleCompanySelect(companyId)}
                      >
                        <Building2 className="h-4 w-4" />
                        <span>{company.name}</span>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
