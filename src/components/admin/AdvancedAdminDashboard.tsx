import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Settings, 
  Activity,
  Clock,
  AlertCircle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  Globe,
  Zap,
  Shield,
  Database,
  Server,
  Network,
  Target,
  Award,
  Rocket
} from 'lucide-react'

import { securityContextService } from '@/services/security/SecurityContextService'
import { automationService } from '@/services/automation/AutomationService'
import { auditService } from '@/services/audit/AuditService'
import { notificationService } from '@/services/notifications/NotificationService'

interface AdminMetrics {
  totalCompanies: number
  totalUsers: number
  totalTeams: number
  activeAutomationRules: number
  totalAuditEntries: number
  systemPerformance: {
    avgResponseTime: number
    uptime: number
    errorRate: number
    throughput: number
  }
  recentActivity: Array<{
    id: string
    type: string
    description: string
    timestamp: string
    user: string
    status: 'success' | 'error' | 'warning'
  }>
}

interface CompanyPerformance {
  id: string
  name: string
  totalPosts: number
  totalEngagement: number
  totalImpressions: number
  engagementRate: number
  teamCount: number
  automationRules: number
  performance: number
  trend: 'up' | 'down' | 'stable'
}

interface SystemHealth {
  database: {
    status: 'healthy' | 'warning' | 'critical'
    responseTime: number
    connections: number
    storageUsed: number
  }
  cache: {
    status: 'healthy' | 'warning' | 'critical'
    hitRate: number
    memoryUsage: number
    evictionRate: number
  }
  api: {
    status: 'healthy' | 'warning' | 'critical'
    responseTime: number
    requestsPerSecond: number
    errorRate: number
  }
  notifications: {
    status: 'healthy' | 'warning' | 'critical'
    delivered: number
    failed: number
    pending: number
  }
}

export function AdvancedAdminDashboard({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null)
  const [companyPerformance, setCompanyPerformance] = useState<CompanyPerformance[]>([])
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'1h' | '24h' | '7d' | '30d'>('24h')
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([])

  useEffect(() => {
    loadDashboardData()
  }, [userId, selectedPeriod])

  const loadDashboardData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Load data in parallel
      const [metricsData, performanceData, healthData] = await Promise.all([
        loadAdminMetrics(),
        loadCompanyPerformance(),
        loadSystemHealth()
      ])

      setMetrics(metricsData)
      setCompanyPerformance(performanceData)
      setSystemHealth(healthData)
    } catch (err) {
      setError('Failed to load dashboard data')
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadAdminMetrics = async (): Promise<AdminMetrics> => {
    // Mock implementation - would integrate with actual services
    return {
      totalCompanies: 127,
      totalUsers: 3420,
      totalTeams: 456,
      activeAutomationRules: 89,
      totalAuditEntries: 125000,
      systemPerformance: {
        avgResponseTime: 45,
        uptime: 99.9,
        errorRate: 0.1,
        throughput: 1250
      },
      recentActivity: [
        {
          id: '1',
          type: 'automation',
          description: 'Bulk content automation rule executed',
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          user: 'John Doe',
          status: 'success'
        },
        {
          id: '2',
          type: 'user',
          description: 'New team member added to Marketing team',
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          user: 'Jane Smith',
          status: 'success'
        },
        {
          id: '3',
          type: 'system',
          description: 'Database backup completed',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          user: 'System',
          status: 'success'
        }
      ]
    }
  }

  const loadCompanyPerformance = async (): Promise<CompanyPerformance[]> => {
    // Mock implementation - would integrate with actual analytics
    return [
      {
        id: '1',
        name: 'TechCorp Solutions',
        totalPosts: 1250,
        totalEngagement: 45000,
        totalImpressions: 250000,
        engagementRate: 18.0,
        teamCount: 8,
        automationRules: 12,
        performance: 92,
        trend: 'up'
      },
      {
        id: '2',
        name: 'Marketing Masters',
        totalPosts: 890,
        totalEngagement: 32000,
        totalImpressions: 180000,
        engagementRate: 17.8,
        teamCount: 6,
        automationRules: 8,
        performance: 88,
        trend: 'stable'
      },
      {
        id: '3',
        name: 'Creative Agency',
        totalPosts: 670,
        totalEngagement: 28000,
        totalImpressions: 145000,
        engagementRate: 19.3,
        teamCount: 5,
        automationRules: 6,
        performance: 85,
        trend: 'up'
      }
    ]
  }

  const loadSystemHealth = async (): Promise<SystemHealth> => {
    // Mock implementation - would integrate with actual monitoring
    return {
      database: {
        status: 'healthy',
        responseTime: 12,
        connections: 45,
        storageUsed: 67.5
      },
      cache: {
        status: 'healthy',
        hitRate: 94.2,
        memoryUsage: 45.8,
        evictionRate: 0.8
      },
      api: {
        status: 'healthy',
        responseTime: 45,
        requestsPerSecond: 1250,
        errorRate: 0.1
      },
      notifications: {
        status: 'healthy',
        delivered: 9876,
        failed: 12,
        pending: 3
      }
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadDashboardData()
    setRefreshing(false)
  }

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'critical': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />
      case 'warning': return <AlertCircle className="h-4 w-4" />
      case 'critical': return <AlertCircle className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <ArrowUpRight className="h-4 w-4 text-green-600" />
      case 'down': return <ArrowDownRight className="h-4 w-4 text-red-600" />
      default: return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!metrics || !systemHealth) {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advanced Admin Dashboard</h1>
          <p className="text-muted-foreground">Real-time enterprise metrics and system health</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4" />
        <span className="text-sm font-medium">Period:</span>
        <div className="flex gap-1">
          {(['1h', '24h', '7d', '30d'] as const).map((period) => (
            <Button
              key={period}
              variant={selectedPeriod === period ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod(period)}
            >
              {period}
            </Button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalCompanies}</div>
            <p className="text-xs text-muted-foreground">+12% from last period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalUsers}</div>
            <p className="text-xs text-muted-foreground">+8% from last period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Automation Rules</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeAutomationRules}</div>
            <p className="text-xs text-muted-foreground">+15% from last period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.systemPerformance.uptime}%</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="health">System Health</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Company Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Top Performing Companies
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {companyPerformance.map((company) => (
                  <div key={company.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{company.name}</span>
                        {getTrendIcon(company.trend)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {company.totalPosts} posts • {company.engagementRate}% engagement
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{company.performance}%</div>
                      <Progress value={company.performance} className="w-20" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* System Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  System Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Average Response Time</span>
                  <span className="font-mono">{metrics.systemPerformance.avgResponseTime}ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Requests per Second</span>
                  <span className="font-mono">{metrics.systemPerformance.throughput}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Error Rate</span>
                  <span className="font-mono">{metrics.systemPerformance.errorRate}%</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span>Database Connections</span>
                  <span className="font-mono">{systemHealth.database.connections}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Cache Hit Rate</span>
                  <span className="font-mono">{systemHealth.cache.hitRate}%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {metrics.systemPerformance.avgResponseTime}ms
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Response Time</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {metrics.systemPerformance.throughput}
                  </div>
                  <div className="text-sm text-muted-foreground">Requests/Second</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {metrics.systemPerformance.uptime}%
                  </div>
                  <div className="text-sm text-muted-foreground">Uptime</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Health Tab */}
        <TabsContent value="health" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Database Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  <div className={`flex items-center gap-2 ${getHealthColor(systemHealth.database.status)}`}>
                    {getHealthIcon(systemHealth.database.status)}
                    <span className="capitalize">{systemHealth.database.status}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Response Time</span>
                  <span className="font-mono">{systemHealth.database.responseTime}ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Connections</span>
                  <span className="font-mono">{systemHealth.database.connections}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Storage Used</span>
                  <span className="font-mono">{systemHealth.database.storageUsed}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Cache Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  <div className={`flex items-center gap-2 ${getHealthColor(systemHealth.cache.status)}`}>
                    {getHealthIcon(systemHealth.cache.status)}
                    <span className="capitalize">{systemHealth.cache.status}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Hit Rate</span>
                  <span className="font-mono">{systemHealth.cache.hitRate}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Memory Usage</span>
                  <span className="font-mono">{systemHealth.cache.memoryUsage}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Eviction Rate</span>
                  <span className="font-mono">{systemHealth.cache.evictionRate}%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Recent Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {metrics.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.status === 'success' ? 'bg-green-500' :
                      activity.status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                    }`} />
                    <div>
                      <div className="font-medium">{activity.description}</div>
                      <div className="text-sm text-muted-foreground">
                        {activity.user} • {new Date(activity.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline">{activity.type}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
