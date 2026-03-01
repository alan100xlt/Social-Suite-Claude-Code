import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Building2, 
  Users, 
  TrendingUp, 
  Plus, 
  Settings, 
  Eye, 
  BarChart3,
  Globe,
  Crown,
  Shield
} from 'lucide-react'
import { useMediaCompanyHierarchy } from '@/hooks/useMediaCompanyHierarchy'
import { useMediaCompany } from '@/hooks/useMediaCompanyHierarchy'
import { MediaCompanyChild } from '@/hooks/useMediaCompanyHierarchy'
import { Skeleton } from '@/components/ui/skeleton'

interface MediaCompanyDashboardProps {
  mediaCompanyId: string
}

export function MediaCompanyDashboard({ mediaCompanyId }: MediaCompanyDashboardProps) {
  const [selectedView, setSelectedView] = useState<'overview' | 'companies' | 'members'>('overview')
  
  const { data: mediaCompany, isLoading: companyLoading } = useMediaCompany(mediaCompanyId)
  const { data: hierarchy, isLoading: hierarchyLoading } = useMediaCompanyHierarchy(mediaCompanyId)

  const getRelationshipColor = (type: string) => {
    switch (type) {
      case 'owned': return 'bg-green-100 text-green-800'
      case 'managed': return 'bg-blue-100 text-blue-800'
      case 'partnered': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRelationshipIcon = (type: string) => {
    switch (type) {
      case 'owned': return <Crown className="w-4 h-4" />
      case 'managed': return <Settings className="w-4 h-4" />
      case 'partnered': return <Shield className="w-4 h-4" />
      default: return <Building2 className="w-4 h-4" />
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const totalStats = hierarchy?.reduce(
    (acc, company) => ({
      totalPosts: acc.totalPosts + company.total_posts,
      totalFollowers: acc.totalFollowers + company.total_followers,
      totalEngagement: acc.totalEngagement + company.total_engagement,
    }),
    { totalPosts: 0, totalFollowers: 0, totalEngagement: 0 }
  ) || { totalPosts: 0, totalFollowers: 0, totalEngagement: 0 }

  if (companyLoading || hierarchyLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Building2 className="w-8 h-8" />
            {mediaCompany?.name}
          </h1>
          <p className="text-muted-foreground">
            Media company portfolio overview
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Company
          </Button>
        </div>
      </div>

      {/* Portfolio Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hierarchy?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active publications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalStats.totalPosts)}</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Followers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalStats.totalFollowers)}</div>
            <p className="text-xs text-muted-foreground">
              Across all platforms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Engagement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalStats.totalEngagement)}</div>
            <p className="text-xs text-muted-foreground">
              Likes, comments, shares
            </p>
          </CardContent>
        </Card>
      </div>

      {/* View Tabs */}
      <div className="flex gap-1 border-b">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'companies', label: 'Companies', icon: Building2 },
          { id: 'members', label: 'Members', icon: Users },
        ].map((view) => (
          <Button
            key={view.id}
            variant={selectedView === view.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedView(view.id as any)}
            className="flex items-center gap-2"
          >
            <view.icon className="w-4 h-4" />
            {view.label}
          </Button>
        ))}
      </div>

      {/* Content based on selected view */}
      {selectedView === 'overview' && (
        <div className="space-y-6">
          {/* Top Performing Companies */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Companies</CardTitle>
              <CardDescription>
                Ranked by total followers across all platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {hierarchy?.slice(0, 5).map((company, index) => (
                  <div key={company.company_id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{company.company_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {company.total_posts} posts • {formatNumber(company.total_engagement)} engagement
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatNumber(company.total_followers)}</div>
                      <div className="text-sm text-muted-foreground">followers</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedView === 'companies' && (
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Companies</CardTitle>
            <CardDescription>
              All companies in your media portfolio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {hierarchy?.map((company) => (
                <div key={company.company_id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getRelationshipIcon(company.relationship_type)}
                      <div>
                        <div className="font-medium">{company.company_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {company.total_posts} posts
                        </div>
                      </div>
                    </div>
                    <Badge className={getRelationshipColor(company.relationship_type)}>
                      {company.relationship_type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-medium">{formatNumber(company.total_followers)}</div>
                      <div className="text-sm text-muted-foreground">followers</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatNumber(company.total_engagement)}</div>
                      <div className="text-sm text-muted-foreground">engagement</div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedView === 'members' && (
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              Users with access to this media company
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Member management coming soon</p>
              <p className="text-sm">You'll be able to invite and manage team members here</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
