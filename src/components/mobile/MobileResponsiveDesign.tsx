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
  Smartphone, 
  Tablet, 
  Monitor, 
  Wifi,
  WifiOff,
  Battery,
  BatteryCharging,
  RefreshCw,
  Download,
  Upload,
  Settings,
  Eye,
  EyeOff,
  Layout,
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
  Youtube,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Home,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Calendar,
  Clock,
  MapPin,
  Navigation,
  Compass,
  Globe,
  Cloud,
  CloudRain,
  Wind,
  Sun,
  Moon,
  Zap,
  Activity,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  LineChart,
  Target,
  Award,
  Rocket,
  Star,
  Heart,
  Bookmark,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Maximize2,
  Minimize2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  MoreHorizontal,
  MoreVertical,
  Check,
  X as XIcon,
  Plus,
  Minus,
  Divide,
  Calculator,
  FileText,
  Image,
  Music,
  Video as VideoIcon,
  Archive as ArchiveIcon,
  DownloadCloud,
  UploadCloud,
  Database,
  Server,
  HardDrive,
  Cpu,
  MemoryStick,
  Wifi as WifiIcon,
  Ethernet,
  Usb,
  Bluetooth,
  BluetoothOff,
  Signal,
  SignalOff,
  Radar,
  Radio,
  Tv,
  Smartphone as SmartphoneIcon,
  Tablet as TabletIcon,
  Laptop,
  Desktop,
  Gamepad2,
  Headphones,
  Camera,
  CameraOff,
  Printer,
  Scanner,
  CreditCard,
  DollarSign,
  Euro,
  PoundSterling,
  Yen,
  Bitcoin,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AlertCircle,
  CheckCircle,
  XCircle,
  HelpCircle as HelpCircleIcon,
  Info as InfoIcon,
  AlertTriangle as AlertTriangleIcon
} from 'lucide-react'

import { securityContextService } from '@/services/security/SecurityContextService'
import { automationService } from '@/services/automation/AutomationService'
import { auditService } from '@/services/audit/AuditService'
import { notificationService } from '@/services/notifications/NotificationService'

interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop'
  userAgent: string
  screen: {
    width: number
    height: number
    orientation: 'portrait' | 'landscape'
    pixelRatio: number
  }
  capabilities: {
    touch: boolean
    geolocation: boolean
    camera: boolean
    microphone: boolean
    bluetooth: boolean
    nfc: boolean
    vibration: boolean
    fullscreen: boolean
  }
  network: {
    online: boolean
    type: 'wifi' | 'cellular' | 'ethernet' | 'unknown'
    speed: 'slow' | 'fast' | 'unknown'
    strength: number
  }
  battery: {
    level: number
    charging: boolean
  }
  performance: {
    memory: number
    cpu: number
    storage: number
  }
}

interface ResponsiveLayout {
  breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  columns: number
  spacing: number
  fontSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  padding: number
  margin: number
}

interface TouchGesture {
  type: 'tap' | 'double-tap' | 'long-press' | 'swipe' | 'pinch' | 'rotate'
  direction?: 'up' | 'down' | 'left' | 'right'
  distance?: number
  scale?: number
  rotation?: number
  timestamp: number
}

interface OfflineData {
  id: string
  type: 'content' | 'settings' | 'analytics' | 'cache'
  data: any
  timestamp: string
  synced: boolean
  size: number
}

interface PWAConfig {
  name: string
  shortName: string
  description: string
  themeColor: string
  backgroundColor: string
  display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser'
  orientation: 'portrait' | 'landscape' | 'any'
  startUrl: '/'
  scope: '/'
  icons: Array<{
    src: string
    sizes: string
    type: string
  }>
  shortcuts: Array<{
    name: string
    shortName: string
    description: string
    url: string
    icons: Array<{
      src: string
      sizes: string
    }>
  }>
}

export function MobileResponsiveDesign({ userId }: { userId: string }) {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)
  const [responsiveLayout, setResponsiveLayout] = useState<ResponsiveLayout | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [isOfflineMode, setIsOfflineMode] = useState(false)
  const [offlineData, setOfflineData] = useState<OfflineData[]>([])
  const [pwaInstalled, setPwaInstalled] = useState(false)
  const [pwaConfig, setPwaConfig] = useState<PWAConfig | null>(null)
  const [touchGestures, setTouchGestures] = useState<TouchGesture[]>([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [screenOrientation, setScreenOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const [networkSpeed, setNetworkSpeed] = useState<'slow' | 'fast' | 'unknown'>('unknown')
  const [batteryLevel, setBatteryLevel] = useState(100)
  const [isCharging, setIsCharging] = useState(false)

  useEffect(() => {
    initializeMobileFeatures()
    setupResponsiveDetection()
    setupOfflineSupport()
    setupPWASupport()
    setupTouchGestureDetection()
    setupNetworkMonitoring()
    setupBatteryMonitoring()
    setupFullscreenDetection()
    
    return () => {
      cleanupMobileFeatures()
    }
  }, [userId])

  const initializeMobileFeatures = async () => {
    const device = await detectDevice()
    const layout = calculateResponsiveLayout(device)
    
    setDeviceInfo(device)
    setResponsiveLayout(layout)
    setIsOnline(navigator.onLine)
    
    // Initialize PWA if supported
    if ('serviceWorker' in navigator) {
      await initializePWA()
    }
  }

  const detectDevice = async (): Promise<DeviceInfo> => {
    const userAgent = navigator.userAgent
    const width = window.innerWidth
    const height = window.innerHeight
    const orientation = width > height ? 'landscape' : 'portrait'
    
    // Detect device type
    let type: 'mobile' | 'tablet' | 'desktop' = 'desktop'
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      type = width < 768 ? 'mobile' : 'tablet'
    }
    
    // Detect capabilities
    const capabilities = {
      touch: 'ontouchstart' in window,
      geolocation: 'geolocation' in navigator,
      camera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
      microphone: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
      bluetooth: 'bluetooth' in navigator,
      nfc: 'nfc' in navigator,
      vibration: 'vibrate' in navigator,
      fullscreen: 'fullscreenEnabled' in document || 'webkitFullscreenEnabled' in document
    }
    
    // Detect network
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    const network = {
      online: navigator.onLine,
      type: connection?.type || 'unknown',
      speed: connection?.effectiveType ? (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g' ? 'slow' : 'fast') : 'unknown',
      strength: connection?.downlink || 0
    }
    
    // Detect battery
    const battery = await getBatteryInfo()
    
    return {
      type,
      userAgent,
      screen: {
        width,
        height,
        orientation,
        pixelRatio: window.devicePixelRatio || 1
      },
      capabilities,
      network,
      battery
    }
  }

  const calculateResponsiveLayout = (device: DeviceInfo): ResponsiveLayout => {
    const { width } = device.screen
    
    let breakpoint: ResponsiveLayout['breakpoint'] = 'md'
    let columns = 12
    let spacing = 4
    let fontSize: ResponsiveLayout['fontSize'] = 'md'
    let padding = 16
    let margin = 16
    
    if (width < 640) {
      breakpoint = 'xs'
      columns = 4
      spacing = 2
      fontSize = 'sm'
      padding = 12
      margin = 12
    } else if (width < 768) {
      breakpoint = 'sm'
      columns = 8
      spacing = 3
      fontSize = 'sm'
      padding = 14
      margin = 14
    } else if (width < 1024) {
      breakpoint = 'md'
      columns = 12
      spacing = 4
      fontSize = 'md'
      padding = 16
      margin = 16
    } else if (width < 1280) {
      breakpoint = 'lg'
      columns = 12
      spacing = 6
      fontSize = 'lg'
      padding = 20
      margin = 20
    } else {
      breakpoint = 'xl'
      columns = 16
      spacing = 8
      fontSize = 'xl'
      padding = 24
      margin = 24
    }
    
    return {
      breakpoint,
      columns,
      spacing,
      fontSize,
      padding,
      margin
    }
  }

  const setupResponsiveDetection = () => {
    const handleResize = () => {
      const device = detectDevice()
      const layout = calculateResponsiveLayout(device)
      setDeviceInfo(device)
      setResponsiveLayout(layout)
    }
    
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }

  const setupOfflineSupport = () => {
    const handleOnline = () => {
      setIsOnline(true)
      setIsOfflineMode(false)
      syncOfflineData()
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      setIsOfflineMode(true)
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }

  const setupPWASupport = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')
        setPwaInstalled(true)
        
        // Check for PWA installation
        if ('beforeinstallprompt' in window) {
          window.addEventListener('beforeinstallprompt', (e: any) => {
            e.preventDefault()
            // Store the prompt for later use
          })
        }
      } catch (error) {
        console.error('PWA registration failed:', error)
      }
    }
  }

  const initializePWA = async () => {
    const config: PWAConfig = {
      name: 'Social Suite Enterprise',
      shortName: 'Social Suite',
      description: 'Enterprise media company management platform',
      themeColor: '#000000',
      backgroundColor: '#ffffff',
      display: 'standalone',
      orientation: 'portrait',
      startUrl: '/',
      scope: '/',
      icons: [
        {
          src: '/icons/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ],
      shortcuts: [
        {
          name: 'Dashboard',
          shortName: 'Dashboard',
          description: 'View enterprise dashboard',
          url: '/dashboard',
          icons: [
            {
              src: '/icons/dashboard-96x96.png',
              sizes: '96x96'
            }
          ]
        }
      ]
    }
    
    setPwaConfig(config)
    
    // Create manifest.json
    const manifestBlob = new Blob([JSON.stringify(config)], { type: 'application/json' })
    const manifestUrl = URL.createObjectURL(manifestBlob)
    
    // Add manifest link to head
    const manifestLink = document.createElement('link')
    manifestLink.rel = 'manifest'
    manifestLink.href = manifestUrl
    document.head.appendChild(manifestLink)
  }

  const setupTouchGestureDetection = () => {
    if (!deviceInfo?.capabilities.touch) return
    
    let touchStartX = 0
    let touchStartY = 0
    let touchStartTime = 0
    
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX
      touchStartY = e.touches[0].clientY
      touchStartTime = Date.now()
    }
    
    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX
      const touchEndY = e.changedTouches[0].clientY
      const touchEndTime = Date.now()
      
      const deltaX = touchEndX - touchStartX
      const deltaY = touchEndY - touchStartY
      const deltaTime = touchEndTime - touchStartTime
      
      const gesture: TouchGesture = {
        type: 'tap',
        timestamp: touchEndTime
      }
      
      // Detect swipe
      if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 50 && deltaTime < 500) {
        gesture.type = 'swipe'
        gesture.direction = deltaX > 0 ? 'right' : 'left'
        gesture.distance = Math.abs(deltaX)
      } else if (Math.abs(deltaY) > 50 && Math.abs(deltaX) < 50 && deltaTime < 500) {
        gesture.type = 'swipe'
        gesture.direction = deltaY > 0 ? 'down' : 'up'
        gesture.distance = Math.abs(deltaY)
      }
      
      // Detect long press
      if (deltaTime > 500) {
        gesture.type = 'long-press'
      }
      
      setTouchGestures(prev => [...prev.slice(-9), gesture])
    }
    
    document.addEventListener('touchstart', handleTouchStart)
    document.addEventListener('touchend', handleTouchEnd)
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }

  const setupNetworkMonitoring = () => {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    
    const updateNetworkInfo = () => {
      if (connection) {
        const speed = connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g' ? 'slow' : 'fast'
        setNetworkSpeed(speed)
      }
    }
    
    if (connection) {
      connection.addEventListener('change', updateNetworkInfo)
      updateNetworkInfo()
    }
    
    return () => {
      if (connection) {
        connection.removeEventListener('change', updateNetworkInfo)
      }
    }
  }

  const setupBatteryMonitoring = async () => {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery()
        
        const updateBatteryInfo = () => {
          setBatteryLevel(battery.level * 100)
          setIsCharging(battery.charging)
        }
        
        battery.addEventListener('levelchange', updateBatteryInfo)
        battery.addEventListener('chargingchange', updateBatteryInfo)
        
        updateBatteryInfo()
      } catch (error) {
        console.error('Battery monitoring not supported:', error)
      }
    }
  }

  const setupFullscreenDetection = () => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
    }
  }

  const getBatteryInfo = async () => {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery()
        return {
          level: battery.level,
          charging: battery.charging
        }
      } catch (error) {
        return { level: 1, charging: false }
      }
    }
    return { level: 1, charging: false }
  }

  const syncOfflineData = async () => {
    try {
      for (const data of offlineData) {
        if (!data.synced) {
          // Sync data with server
          await syncDataWithServer(data)
          data.synced = true
        }
      }
      
      setOfflineData(prev => prev.filter(data => !data.synced))
      
      await notificationService.sendMilestoneNotification(
        'Offline Data Synced',
        `Synced ${offlineData.length} offline items`,
        ['Items synced successfully']
      )
    } catch (error) {
      console.error('Failed to sync offline data:', error)
    }
  }

  const syncDataWithServer = async (data: OfflineData) => {
    // Mock sync implementation
    console.log('Syncing data:', data)
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const installPWA = async () => {
    const prompt = (window as any).deferredPrompt
    if (prompt) {
      prompt.prompt()
      const { outcome } = await prompt.userChoice
      if (outcome === 'accepted') {
        setPwaInstalled(true)
        await notificationService.sendMilestoneNotification(
          'PWA Installed',
          'Social Suite PWA has been installed successfully',
          ['App now available offline']
        )
      }
    }
  }

  const clearOfflineData = () => {
    setOfflineData([])
    localStorage.removeItem('offlineData')
  }

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile': return <Smartphone className="h-4 w-4" />
      case 'tablet': return <Tablet className="h-4 w-4" />
      case 'desktop': return <Monitor className="h-4 w-4" />
      default: return <Monitor className="h-4 w-4" />
    }
  }

  const getNetworkIcon = (online: boolean, speed: string) => {
    if (!online) return <WifiOff className="h-4 w-4 text-red-500" />
    if (speed === 'slow') return <Wifi className="h-4 w-4 text-yellow-500" />
    return <Wifi className="h-4 w-4 text-green-500" />
  }

  const getBatteryIcon = (level: number, charging: boolean) => {
    if (charging) return <BatteryCharging className="h-4 w-4 text-green-500" />
    if (level > 50) return <Battery className="h-4 w-4 text-green-500" />
    if (level > 20) return <Battery className="h-4 w-4 text-yellow-500" />
    return <Battery className="h-4 w-4 text-red-500" />
  }

  if (!deviceInfo || !responsiveLayout) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Detecting device capabilities...</span>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mobile Responsive Design</h1>
          <p className="text-muted-foreground">PWA, touch gestures, and offline capabilities</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          {!pwaInstalled && (
            <Button variant="outline" onClick={installPWA}>
              <Download className="h-4 w-4 mr-2" />
              Install PWA
            </Button>
          )}
        </div>
      </div>

      {/* Device Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Device Type</CardTitle>
            {getDeviceIcon(deviceInfo.type)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{deviceInfo.type}</div>
            <p className="text-xs text-muted-foreground">
              {deviceInfo.screen.width}x{deviceInfo.screen.height} ({deviceInfo.screen.orientation})
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Network Status</CardTitle>
            {getNetworkIcon(isOnline, networkSpeed)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {isOnline ? 'Online' : 'Offline'}
            </div>
            <p className="text-xs text-muted-foreground">
              {networkSpeed === 'slow' ? 'Slow Connection' : networkSpeed === 'fast' ? 'Fast Connection' : 'Unknown Speed'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Battery Level</CardTitle>
            {getBatteryIcon(batteryLevel, isCharging)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{batteryLevel.toFixed(0)}%</div>
            <Progress value={batteryLevel} className="mt-2" />
            <p className="text-xs text-muted-foreground">
              {isCharging ? 'Charging' : 'Not Charging'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Responsive Layout</CardTitle>
            <Layout className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold uppercase">{responsiveLayout.breakpoint}</div>
            <p className="text-xs text-muted-foreground">
              {responsiveLayout.columns} columns • {responsiveLayout.fontSize} font
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="capabilities" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="capabilities">Device Capabilities</TabsTrigger>
          <TabsTrigger value="responsive">Responsive Design</TabsTrigger>
          <TabsTrigger value="pwa">PWA Features</TabsTrigger>
          <TabsTrigger value="offline">Offline Support</TabsTrigger>
        </TabsList>

        {/* Device Capabilities Tab */}
        <TabsContent value="capabilities" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Device Capabilities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(deviceInfo.capabilities).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <div className={`w-2 h-2 rounded-full ${value ? 'bg-green-500' : 'bg-gray-300'}`} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Responsive Design Tab */}
        <TabsContent value="responsive" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layout className="h-5 w-5" />
                Responsive Layout Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{responsiveLayout.breakpoint}</div>
                  <div className="text-sm text-muted-foreground">Breakpoint</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{responsiveLayout.columns}</div>
                  <div className="text-sm text-muted-foreground">Grid Columns</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{responsiveLayout.fontSize}</div>
                  <div className="text-sm text-muted-foreground">Font Size</div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Screen Width</span>
                  <span className="font-mono">{deviceInfo.screen.width}px</span>
                </div>
                <div className="flex justify-between">
                  <span>Screen Height</span>
                  <span className="font-mono">{deviceInfo.screen.height}px</span>
                </div>
                <div className="flex justify-between">
                  <span>Pixel Ratio</span>
                  <span className="font-mono">{deviceInfo.screen.pixelRatio}x</span>
                </div>
                <div className="flex justify-between">
                  <span>Orientation</span>
                  <span className="font-mono capitalize">{deviceInfo.screen.orientation}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PWA Features Tab */}
        <TabsContent value="pwa" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Progressive Web App Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>PWA Installed</span>
                    <div className={`w-2 h-2 rounded-full ${pwaInstalled ? 'bg-green-500' : 'bg-gray-300'}`} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Service Worker</span>
                    <div className={`w-2 h-2 rounded-full ${'serviceWorker' in navigator ? 'bg-green-500' : 'bg-gray-300'}`} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Web App Manifest</span>
                    <div className={`w-2 h-2 rounded-full ${pwaConfig ? 'bg-green-500' : 'bg-gray-300'}`} />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {pwaInstalled ? 'Installed' : 'Not Installed'}
                    </div>
                    <div className="text-sm text-muted-foreground">PWA Status</div>
                  </div>
                </div>
              </div>
              
              {pwaConfig && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Display Mode</span>
                      <span className="font-mono">{pwaConfig.display}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Orientation</span>
                      <span className="font-mono">{pwaConfig.orientation}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Theme Color</span>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded" 
                          style={{ backgroundColor: pwaConfig.themeColor }}
                        />
                        <span className="font-mono">{pwaConfig.themeColor}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Offline Support Tab */}
        <TabsContent value="offline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                Offline Support
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Offline Mode</span>
                <div className={`w-2 h-2 rounded-full ${isOfflineMode ? 'bg-yellow-500' : 'bg-green-500'}`} />
              </div>
              
              <div className="flex items-center justify-between">
                <span>Offline Data Items</span>
                <span className="font-mono">{offlineData.length}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span>Storage Used</span>
                <span className="font-mono">
                  {(offlineData.reduce((sum, item) => sum + item.size, 0) / 1024).toFixed(1)} KB
                </span>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <h4 className="font-medium">Recent Offline Data</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {offlineData.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <div className="font-medium capitalize">{item.type}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(item.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${item.synced ? 'bg-green-500' : 'bg-yellow-500'}`} />
                        <span className="text-xs">{item.synced ? 'Synced' : 'Pending'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={syncOfflineData} disabled={isOnline}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Now
                </Button>
                <Button variant="outline" onClick={clearOfflineData}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
