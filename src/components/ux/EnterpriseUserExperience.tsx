import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Rocket,
  Eye,
  EyeOff,
  Layout,
  Palette,
  Bell,
  Volume2,
  Wifi,
  Battery,
  Monitor,
  Smartphone,
  Tablet,
  Accessibility,
  Keyboard,
  MousePointer,
  Maximize2,
  Minimize2,
  Sun,
  Moon,
  Cloud,
  CloudRain,
  Wind,
  Gauge,
  Timer,
  MapPin,
  Navigation,
  Compass,
  Search,
  Filter as FilterIcon,
  SortAsc,
  SortDesc,
  Grid3X3,
  List,
  Columns,
  Rows,
  Layers,
  Package,
  Archive,
  Trash2,
  Share2,
  Link,
  Copy,
  Move,
  Edit3,
  Save,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Fullscreen,
  LogOut,
  User,
  Lock,
  Unlock,
  Key,
  ShieldCheck,
  AlertTriangle,
  Info,
  HelpCircle,
  BookOpen,
  MessageSquare,
  Phone,
  Mail,
  Github,
  Twitter,
  Linkedin,
  Facebook,
  Instagram,
  Youtube
} from 'lucide-react'

import { securityContextService } from '@/services/security/SecurityContextService'
import { automationService } from '@/services/automation/AutomationService'
import { auditService } from '@/services/audit/AuditService'
import { notificationService } from '@/services/notifications/NotificationService'

interface UserBehaviorData {
  userId: string
  userName: string
  sessionId: string
  timestamp: string
  action: string
  duration: number
  page: string
  device: string
  browser: string
  location: string
  performance: {
    loadTime: number
    interactionTime: number
    errorCount: number
  }
}

interface PerformanceMetrics {
  timestamp: string
  pageLoad: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  cumulativeLayoutShift: number
  firstInputDelay: number
  timeToInteractive: number
  memoryUsage: number
  cpuUsage: number
  networkLatency: number
}

interface AccessibilityMetrics {
  timestamp: string
  wcagCompliance: number
  colorContrast: number
  keyboardNavigation: number
  screenReaderSupport: number
  focusManagement: number
  ariaLabels: number
  altText: number
  headingStructure: number
}

interface PersonalizationSettings {
  theme: 'light' | 'dark' | 'auto'
  language: string
  timezone: string
  dateFormat: string
  timeFormat: string
  currency: string
  units: 'metric' | 'imperial'
  notifications: {
    email: boolean
    push: boolean
    slack: boolean
    inApp: boolean
  }
  privacy: {
    analytics: boolean
    personalization: boolean
    location: boolean
    cookies: boolean
  }
  accessibility: {
    highContrast: boolean
    largeText: boolean
    reducedMotion: boolean
    screenReader: boolean
    keyboardNavigation: boolean
  }
  dashboard: {
    layout: 'grid' | 'list' | 'cards'
    widgets: string[]
    refreshInterval: number
    defaultView: string
  }
}

export function EnterpriseUserExperience({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userBehaviorData, setUserBehaviorData] = useState<UserBehaviorData[]>([])
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics[]>([])
  const [accessibilityMetrics, setAccessibilityMetrics] = useState<AccessibilityMetrics[]>([])
  const [personalizationSettings, setPersonalizationSettings] = useState<PersonalizationSettings>({
    theme: 'auto',
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    currency: 'USD',
    units: 'metric',
    notifications: {
      email: true,
      push: true,
      slack: true,
      inApp: true
    },
    privacy: {
      analytics: true,
      personalization: true,
      location: false,
      cookies: true
    },
    accessibility: {
      highContrast: false,
      largeText: false,
      reducedMotion: false,
      screenReader: false,
      keyboardNavigation: true
    },
    dashboard: {
      layout: 'grid',
      widgets: ['metrics', 'activity', 'performance', 'health'],
      refreshInterval: 30,
      defaultView: 'overview'
    }
  })
  const [selectedPeriod, setSelectedPeriod] = useState<'1h' | '24h' | '7d' | '30d'>('24h')
  const [selectedDevice, setSelectedDevice] = useState<string>('all')
  const [selectedAction, setSelectedAction] = useState<string>('all')

  useEffect(() => {
    loadUserExperienceData()
    setupPerformanceMonitoring()
    setupAccessibilityMonitoring()
  }, [userId, selectedPeriod])

  const loadUserExperienceData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Load data in parallel
      const [behaviorData, performanceData, accessibilityData] = await Promise.all([
        loadUserBehaviorData(),
        loadPerformanceMetrics(),
        loadAccessibilityMetrics()
      ])

      setUserBehaviorData(behaviorData)
      setPerformanceMetrics(performanceData)
      setAccessibilityMetrics(accessibilityData)
    } catch (err) {
      setError('Failed to load user experience data')
      console.error('UX data load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadUserBehaviorData = async (): Promise<UserBehaviorData[]> => {
    // Mock implementation - would integrate with actual analytics service
    return [
      {
        userId: userId,
        userName: 'John Doe',
        sessionId: 'session_123',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        action: 'dashboard_view',
        duration: 45000,
        page: '/admin/dashboard',
        device: 'desktop',
        browser: 'Chrome',
        location: 'New York, US',
        performance: {
          loadTime: 1200,
          interactionTime: 300,
          errorCount: 0
        }
      },
      {
        userId: userId,
        userName: 'John Doe',
        sessionId: 'session_123',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        action: 'content_edit',
        duration: 120000,
        page: '/content/editor',
        device: 'desktop',
        browser: 'Chrome',
        location: 'New York, US',
        performance: {
          loadTime: 800,
          interactionTime: 200,
          errorCount: 1
        }
      }
    ]
  }

  const loadPerformanceMetrics = async (): Promise<PerformanceMetrics[]> => {
    // Mock implementation - would integrate with actual performance monitoring
    return [
      {
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        pageLoad: 1200,
        firstContentfulPaint: 800,
        largestContentfulPaint: 1500,
        cumulativeLayoutShift: 0.1,
        firstInputDelay: 50,
        timeToInteractive: 1800,
        memoryUsage: 45.2,
        cpuUsage: 12.5,
        networkLatency: 45
      },
      {
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        pageLoad: 900,
        firstContentfulPaint: 600,
        largestContentfulPaint: 1200,
        cumulativeLayoutShift: 0.05,
        firstInputDelay: 30,
        timeToInteractive: 1500,
        memoryUsage: 42.8,
        cpuUsage: 8.3,
        networkLatency: 38
      }
    ]
  }

  const loadAccessibilityMetrics = async (): Promise<AccessibilityMetrics[]> => {
    // Mock implementation - would integrate with actual accessibility testing
    return [
      {
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        wcagCompliance: 95,
        colorContrast: 88,
        keyboardNavigation: 92,
        screenReaderSupport: 85,
        focusManagement: 90,
        ariaLabels: 87,
        altText: 93,
        headingStructure: 96
      }
    ]
  }

  const setupPerformanceMonitoring = useCallback(() => {
    // Set up real-time performance monitoring
    if ('performance' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming
            const metrics: PerformanceMetrics = {
              timestamp: new Date().toISOString(),
              pageLoad: navEntry.loadEventEnd - navEntry.loadEventStart,
              firstContentfulPaint: 0, // Would need paint observer
              largestContentfulPaint: 0, // Would need LCP observer
              cumulativeLayoutShift: 0, // Would need CLS observer
              firstInputDelay: 0, // Would need FID observer
              timeToInteractive: 0, // Would calculate from metrics
              memoryUsage: 0, // Would get from performance.memory
              cpuUsage: 0, // Would calculate from performance entries
              networkLatency: 0 // Would get from navigation timing
            }
            setPerformanceMetrics(prev => [...prev.slice(-99), metrics])
          }
        })
      })
      
      observer.observe({ entryTypes: ['navigation'] })
    }
  }, [])

  const setupAccessibilityMonitoring = useCallback(() => {
    // Set up accessibility monitoring
    const checkAccessibility = () => {
      const metrics: AccessibilityMetrics = {
        timestamp: new Date().toISOString(),
        wcagCompliance: calculateWCAGCompliance(),
        colorContrast: calculateColorContrast(),
        keyboardNavigation: calculateKeyboardNavigation(),
        screenReaderSupport: calculateScreenReaderSupport(),
        focusManagement: calculateFocusManagement(),
        ariaLabels: calculateARIALabels(),
        altText: calculateAltText(),
        headingStructure: calculateHeadingStructure()
      }
      setAccessibilityMetrics(prev => [...prev.slice(-99), metrics])
    }

    // Check accessibility every 5 minutes
    const interval = setInterval(checkAccessibility, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const calculateWCAGCompliance = (): number => {
    // Mock WCAG compliance calculation
    return 95
  }

  const calculateColorContrast = (): number => {
    // Mock color contrast calculation
    return 88
  }

  const calculateKeyboardNavigation = (): number => {
    // Mock keyboard navigation calculation
    return 92
  }

  const calculateScreenReaderSupport = (): number => {
    // Mock screen reader support calculation
    return 85
  }

  const calculateFocusManagement = (): number => {
    // Mock focus management calculation
    return 90
  }

  const calculateARIALabels = (): number => {
    // Mock ARIA labels calculation
    return 87
  }

  const calculateAltText = (): number => {
    // Mock alt text calculation
    return 93
  }

  const calculateHeadingStructure = (): number => {
    // Mock heading structure calculation
    return 96
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadUserExperienceData()
    setRefreshing(false)
  }

  const handlePersonalizationChange = (category: keyof PersonalizationSettings, key: string, value: any) => {
    setPersonalizationSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }))
  }

  const handlePersonalizationSave = async () => {
    try {
      // Save personalization settings
      await notificationService.sendMilestoneNotification(
        'Personalization Settings Updated',
        'User experience preferences have been saved',
        ['Theme: ' + personalizationSettings.theme, 'Language: ' + personalizationSettings.language]
      )
    } catch (error) {
      console.error('Failed to save personalization settings:', error)
    }
  }

  const filteredBehaviorData = useMemo(() => {
    return userBehaviorData.filter(data => {
      const deviceMatch = selectedDevice === 'all' || data.device === selectedDevice
      const actionMatch = selectedAction === 'all' || data.action === selectedAction
      return deviceMatch && actionMatch
    })
  }, [userBehaviorData, selectedDevice, selectedAction])

  const averagePerformanceScore = useMemo(() => {
    if (performanceMetrics.length === 0) return 0
    
    const scores = performanceMetrics.map(metric => {
      // Calculate performance score based on Core Web Vitals
      const lcpScore = metric.largestContentfulPaint <= 2500 ? 100 : metric.largestContentfulPaint <= 4000 ? 50 : 0
      const fidScore = metric.firstInputDelay <= 100 ? 100 : metric.firstInputDelay <= 300 ? 50 : 0
      const clsScore = metric.cumulativeLayoutShift <= 0.1 ? 100 : metric.cumulativeLayoutShift <= 0.25 ? 50 : 0
      
      return (lcpScore + fidScore + clsScore) / 3
    })
    
    return scores.reduce((sum, score) => sum + score, 0) / scores.length
  }, [performanceMetrics])

  const averageAccessibilityScore = useMemo(() => {
    if (accessibilityMetrics.length === 0) return 0
    
    const latestMetrics = accessibilityMetrics[accessibilityMetrics.length - 1]
    return (
      latestMetrics.wcagCompliance +
      latestMetrics.colorContrast +
      latestMetrics.keyboardNavigation +
      latestMetrics.screenReaderSupport +
      latestMetrics.focusManagement +
      latestMetrics.ariaLabels +
      latestMetrics.altText +
      latestMetrics.headingStructure
    ) / 8
  }, [accessibilityMetrics])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading user experience data...</span>
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

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Enterprise User Experience</h1>
          <p className="text-muted-foreground">Performance monitoring, behavior analytics, and personalization</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handlePersonalizationSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance Score</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averagePerformanceScore.toFixed(1)}%</div>
            <Progress value={averagePerformanceScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accessibility Score</CardTitle>
            <Accessibility className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageAccessibilityScore.toFixed(1)}%</div>
            <Progress value={averageAccessibilityScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Sessions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredBehaviorData.length}</div>
            <p className="text-xs text-muted-foreground">Last {selectedPeriod}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Session Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredBehaviorData.length > 0 
                ? (filteredBehaviorData.reduce((sum, data) => sum + data.duration, 0) / filteredBehaviorData.length / 1000 / 60).toFixed(1)
                : '0'
              }m
            </div>
            <p className="text-xs text-muted-foreground">Minutes per session</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analytics">User Analytics</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
          <TabsTrigger value="personalization">Personalization</TabsTrigger>
        </TabsList>

        {/* User Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Behavior */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  User Behavior Analytics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Device" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Devices</SelectItem>
                      <SelectItem value="desktop">Desktop</SelectItem>
                      <SelectItem value="mobile">Mobile</SelectItem>
                      <SelectItem value="tablet">Tablet</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={selectedAction} onValueChange={setSelectedAction}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      <SelectItem value="dashboard_view">Dashboard</SelectItem>
                      <SelectItem value="content_edit">Content Edit</SelectItem>
                      <SelectItem value="team_manage">Team Manage</SelectItem>
                      <SelectItem value="settings">Settings</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  {filteredBehaviorData.slice(0, 5).map((data, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{data.action.replace('_', ' ').toUpperCase()}</div>
                        <div className="text-sm text-gray-500">
                          {data.page} • {data.device} • {data.location}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono">{(data.duration / 1000).toFixed(1)}s</div>
                        <div className="text-xs text-gray-500">
                          {new Date(data.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Performance Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {averagePerformanceScore.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Performance Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {performanceMetrics.length > 0 
                        ? (performanceMetrics.reduce((sum, m) => sum + m.pageLoad, 0) / performanceMetrics.length).toFixed(0)
                        : '0'
                      }ms
                    </div>
                    <div className="text-sm text-muted-foreground">Avg. Load Time</div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Page Load</span>
                    <span className="font-mono">
                      {performanceMetrics.length > 0 
                        ? (performanceMetrics.reduce((sum, m) => sum + m.pageLoad, 0) / performanceMetrics.length).toFixed(0)
                        : '0'
                      }ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Memory Usage</span>
                    <span className="font-mono">
                      {performanceMetrics.length > 0 
                        ? (performanceMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / performanceMetrics.length).toFixed(1)
                        : '0'
                      }%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>CPU Usage</span>
                    <span className="font-mono">
                      {performanceMetrics.length > 0 
                        ? (performanceMetrics.reduce((sum, m) => sum + m.cpuUsage, 0) / performanceMetrics.length).toFixed(1)
                        : '0'
                      }%
                    </span>
                  </div>
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
                <Gauge className="h-5 w-5" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {averagePerformanceScore.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Overall Performance</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {performanceMetrics.length > 0 
                      ? (performanceMetrics.reduce((sum, m) => sum + m.pageLoad, 0) / performanceMetrics.length).toFixed(0)
                      : '0'
                    }ms
                  </div>
                  <div className="text-sm text-muted-foreground">Avg. Page Load</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {performanceMetrics.length > 0 
                      ? (performanceMetrics.reduce((sum, m) => sum + m.timeToInteractive, 0) / performanceMetrics.length).toFixed(0)
                      : '0'
                    }ms
                  </div>
                  <div className="text-sm text-muted-foreground">Time to Interactive</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accessibility Tab */}
        <TabsContent value="accessibility" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Accessibility className="h-5 w-5" />
                Accessibility Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>WCAG Compliance</span>
                    <div className="flex items-center gap-2">
                      <Progress value={averageAccessibilityScore} className="w-20" />
                      <span className="font-mono">{averageAccessibilityScore.toFixed(1)}%</span>
                    </div>
                  </div>
                  
                  {accessibilityMetrics.length > 0 && (
                    <>
                      <div className="flex items-center justify-between">
                        <span>Color Contrast</span>
                        <span className="font-mono">{accessibilityMetrics[accessibilityMetrics.length - 1].colorContrast}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Keyboard Navigation</span>
                        <span className="font-mono">{accessibilityMetrics[accessibilityMetrics.length - 1].keyboardNavigation}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Screen Reader Support</span>
                        <span className="font-mono">{accessibilityMetrics[accessibilityMetrics.length - 1].screenReaderSupport}%</span>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {averageAccessibilityScore.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Accessibility Score</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Personalization Tab */}
        <TabsContent value="personalization" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Appearance Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Appearance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select 
                    value={personalizationSettings.theme} 
                    onValueChange={(value) => handlePersonalizationChange('theme', 'theme', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="auto">Auto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select 
                    value={personalizationSettings.language} 
                    onValueChange={(value) => handlePersonalizationChange('language', 'language', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="zh">Chinese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select 
                    value={personalizationSettings.timezone} 
                    onValueChange={(value) => handlePersonalizationChange('timezone', 'timezone', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="EST">EST</SelectItem>
                      <SelectItem value="PST">PST</SelectItem>
                      <SelectItem value="CET">CET</SelectItem>
                      <SelectItem value="JST">JST</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Accessibility Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Accessibility className="h-5 w-5" />
                  Accessibility
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>High Contrast</Label>
                  <Switch 
                    checked={personalizationSettings.accessibility.highContrast}
                    onCheckedChange={(checked) => handlePersonalizationChange('accessibility', 'highContrast', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Large Text</Label>
                  <Switch 
                    checked={personalizationSettings.accessibility.largeText}
                    onCheckedChange={(checked) => handlePersonalizationChange('accessibility', 'largeText', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Reduced Motion</Label>
                  <Switch 
                    checked={personalizationSettings.accessibility.reducedMotion}
                    onCheckedChange={(checked) => handlePersonalizationChange('accessibility', 'reducedMotion', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Keyboard Navigation</Label>
                  <Switch 
                    checked={personalizationSettings.accessibility.keyboardNavigation}
                    onCheckedChange={(checked) => handlePersonalizationChange('accessibility', 'keyboardNavigation', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
