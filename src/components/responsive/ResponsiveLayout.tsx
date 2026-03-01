import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Smartphone, 
  Tablet, 
  Monitor, 
  Zap, 
  Battery, 
  Wifi, 
  WifiOff,
  CheckCircle,
  AlertCircle,
  Settings,
  Eye,
  Download,
  Upload,
  RefreshCw,
  Bell,
  Menu,
  X,
  ArrowLeft,
  ArrowRight,
  Home,
  Search,
  Filter,
  Grid,
  List,
  FileText,
  BarChart3,
  Users
} from 'lucide-react';

interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  userAgent: string;
  connection?: {
    effectiveType: string;
    downlink: number;
    rtt: number;
  };
  battery?: {
    level: number;
    charging: boolean;
  };
}

interface ResponsiveSettings {
  enableOfflineMode: boolean;
  enablePushNotifications: boolean;
  enableTouchGestures: boolean;
  enableKeyboardShortcuts: boolean;
  autoOptimizeImages: boolean;
  prefetchContent: boolean;
  enableDarkMode: boolean;
  reduceMotion: boolean;
}

interface PerformanceMetrics {
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  memoryUsage: number;
  networkRequests: number;
  cacheHitRate: number;
}

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  onDeviceChange?: (device: DeviceInfo) => void;
}

export function ResponsiveLayout({ children, onDeviceChange }: ResponsiveLayoutProps) {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [settings, setSettings] = useState<ResponsiveSettings>({
    enableOfflineMode: true,
    enablePushNotifications: false,
    enableTouchGestures: true,
    enableKeyboardShortcuts: true,
    autoOptimizeImages: true,
    prefetchContent: false,
    enableDarkMode: false,
    reduceMotion: false
  });
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Detect device information
  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const userAgent = navigator.userAgent;
      
      let type: 'mobile' | 'tablet' | 'desktop' = 'desktop';
      let orientation: 'portrait' | 'landscape' = width > height ? 'landscape' : 'portrait';
      
      // Device type detection
      if (width <= 768) {
        type = 'mobile';
      } else if (width <= 1024) {
        type = 'tablet';
      }
      
      // Enhanced detection using user agent
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
        if (/iPad/i.test(userAgent)) {
          type = 'tablet';
        } else {
          type = 'mobile';
        }
      }
      
      const device: DeviceInfo = {
        type,
        width,
        height,
        orientation,
        userAgent,
        connection: (navigator as any).connection || undefined,
        battery: undefined
      };
      
      setDeviceInfo(device);
      onDeviceChange?.(device);
    };

    detectDevice();
    window.addEventListener('resize', detectDevice);
    window.addEventListener('orientationchange', detectDevice);
    
    return () => {
      window.removeEventListener('resize', detectDevice);
      window.removeEventListener('orientationchange', detectDevice);
    };
  }, [onDeviceChange]);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Get battery information
  useEffect(() => {
    const getBatteryInfo = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          setDeviceInfo(prev => prev ? {
            ...prev,
            battery: {
              level: battery.level,
              charging: battery.charging
            }
          } : null);
          
          battery.addEventListener('levelchange', () => {
            setDeviceInfo(prev => prev ? {
              ...prev,
              battery: {
                level: battery.level,
                charging: battery.charging
              }
            } : null);
          });
        } catch (error) {
          console.log('Battery API not available');
        }
      }
    };
    
    getBatteryInfo();
  }, []);

  // Check PWA installation status
  useEffect(() => {
    const checkPWAInstallation = () => {
      // Check if running as PWA
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      setIsPWAInstalled(isStandalone);
      
      // Show install prompt if not installed and on mobile
      if (!isStandalone && deviceInfo?.type === 'mobile') {
        setShowInstallPrompt(true);
      }
    };
    
    checkPWAInstallation();
  }, [deviceInfo]);

  // Collect performance metrics
  useEffect(() => {
    const collectMetrics = () => {
      if ('performance' in window) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');
        const lcp = performance.getEntriesByType('largest-contentful-paint');
        const cls = performance.getEntriesByType('layout-shift');
        const fid = performance.getEntriesByType('first-input')[0] as PerformanceEventTiming;
        
        const metrics: PerformanceMetrics = {
          loadTime: navigation.loadEventEnd - navigation.loadEventStart,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
          largestContentfulPaint: lcp[lcp.length - 1]?.startTime || 0,
          cumulativeLayoutShift: cls.reduce((sum, entry) => sum + (entry as any).value, 0),
          firstInputDelay: fid?.processingStart - fid?.startTime || 0,
          memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
          networkRequests: performance.getEntriesByType('resource').length,
          cacheHitRate: 0 // Would need custom implementation
        };
        
        setPerformanceMetrics(metrics);
      }
    };
    
    // Collect metrics after page load
    if (document.readyState === 'complete') {
      setTimeout(collectMetrics, 1000);
    } else {
      window.addEventListener('load', () => setTimeout(collectMetrics, 1000));
    }
  }, []);

  // Handle PWA installation
  const handleInstallPWA = async () => {
    const deferredPrompt = (window as any).deferredPrompt;
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      (window as any).deferredPrompt = null;
      setShowInstallPrompt(false);
    }
  };

  // Update settings
  const updateSetting = (key: keyof ResponsiveSettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    // Apply settings immediately
    if (key === 'enableDarkMode') {
      document.documentElement.classList.toggle('dark', value);
    }
    if (key === 'reduceMotion') {
      document.documentElement.classList.toggle('reduce-motion', value);
    }
  };

  // Get device icon
  const getDeviceIcon = () => {
    switch (deviceInfo?.type) {
      case 'mobile': return <Smartphone className="h-5 w-5" />;
      case 'tablet': return <Tablet className="h-5 w-5" />;
      case 'desktop': return <Monitor className="h-5 w-5" />;
      default: return <Monitor className="h-5 w-5" />;
    }
  };

  // Get connection quality
  const getConnectionQuality = () => {
    if (!deviceInfo?.connection) return 'Unknown';
    
    const { effectiveType, downlink } = deviceInfo.connection;
    if (effectiveType === '4g' || downlink > 5) return 'Excellent';
    if (effectiveType === '3g' || downlink > 1) return 'Good';
    if (effectiveType === '2g' || downlink > 0.1) return 'Fair';
    return 'Poor';
  };

  // Get performance score
  const getPerformanceScore = () => {
    if (!performanceMetrics) return 0;
    
    const { loadTime, firstContentfulPaint, largestContentfulPaint, cumulativeLayoutShift } = performanceMetrics;
    
    let score = 100;
    
    // Load time scoring (0-3 seconds)
    if (loadTime > 3000) score -= 30;
    else if (loadTime > 2000) score -= 20;
    else if (loadTime > 1000) score -= 10;
    
    // FCP scoring (0-1.8 seconds)
    if (firstContentfulPaint > 1800) score -= 25;
    else if (firstContentfulPaint > 1000) score -= 15;
    else if (firstContentfulPaint > 500) score -= 5;
    
    // LCP scoring (0-2.5 seconds)
    if (largestContentfulPaint > 2500) score -= 25;
    else if (largestContentfulPaint > 1800) score -= 15;
    else if (largestContentfulPaint > 1200) score -= 5;
    
    // CLS scoring (0-0.1)
    if (cumulativeLayoutShift > 0.1) score -= 20;
    else if (cumulativeLayoutShift > 0.05) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  };

  // Mobile navigation component
  const MobileNavigation = () => (
    <div className="lg:hidden">
      {/* Mobile Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white dark:bg-gray-800">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <div className="flex items-center space-x-2">
          <Search className="h-5 w-5 text-gray-600" />
          <Bell className="h-5 w-5 text-gray-600" />
        </div>
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-800">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Menu</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <nav className="p-4 space-y-2">
            <Button variant="ghost" className="w-full justify-start">
              <Home className="h-4 w-4 mr-3" />
              Home
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Grid className="h-4 w-4 mr-3" />
              Portfolio
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <FileText className="h-4 w-4 mr-3" />
              Content
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <BarChart3 className="h-4 w-4 mr-3" />
              Analytics
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Users className="h-4 w-4 mr-3" />
              Team
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Settings className="h-4 w-4 mr-3" />
              Settings
            </Button>
          </nav>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile Navigation */}
      <MobileNavigation />
      
      {/* Desktop Layout */}
      <div className="hidden lg:block">
        {/* Status Bar */}
        <div className="bg-white dark:bg-gray-800 border-b px-6 py-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {getDeviceIcon()}
                <span className="font-medium capitalize">{deviceInfo?.type}</span>
                <span className="text-gray-600">
                  {deviceInfo?.width}×{deviceInfo?.height}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                {isOnline ? (
                  <>
                    <Wifi className="h-4 w-4 text-green-500" />
                    <span className="text-green-600">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 text-red-500" />
                    <span className="text-red-600">Offline</span>
                  </>
                )}
              </div>
              
              {deviceInfo?.connection && (
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-blue-500" />
                  <span>{getConnectionQuality()}</span>
                </div>
              )}
              
              {deviceInfo?.battery && (
                <div className="flex items-center space-x-2">
                  <Battery className="h-4 w-4 text-yellow-500" />
                  <span>{Math.round(deviceInfo.battery.level * 100)}%</span>
                  {deviceInfo.battery.charging && <span className="text-green-600">(Charging)</span>}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {performanceMetrics && (
                <div className="flex items-center space-x-2">
                  <span>Performance Score:</span>
                  <Badge className={getPerformanceScore() >= 80 ? 'bg-green-100 text-green-800' : 
                                   getPerformanceScore() >= 60 ? 'bg-yellow-100 text-yellow-800' : 
                                   'bg-red-100 text-red-800'}>
                    {getPerformanceScore()}%
                  </Badge>
                </div>
              )}
              
              {isPWAInstalled && (
                <Badge className="bg-blue-100 text-blue-800">PWA Installed</Badge>
              )}
            </div>
          </div>
        </div>
        
        {/* Install PWA Prompt */}
        {showInstallPrompt && (
          <div className="bg-blue-50 dark:bg-blue-900 border-b px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Download className="h-5 w-5 text-blue-600" />
                <span className="text-sm">Install this app for a better experience</span>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => setShowInstallPrompt(false)}>
                  Not now
                </Button>
                <Button size="sm" onClick={handleInstallPWA}>
                  Install
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Main Content */}
      <div className="flex">
        {/* Sidebar for Desktop */}
        <div className="hidden lg:block w-64 bg-white dark:bg-gray-800 border-r min-h-screen">
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Responsive Settings</h2>
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
              </TabsList>
              
              <TabsContent value="general" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Offline Mode</label>
                  <Switch
                    checked={settings.enableOfflineMode}
                    onCheckedChange={(checked) => updateSetting('enableOfflineMode', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Push Notifications</label>
                  <Switch
                    checked={settings.enablePushNotifications}
                    onCheckedChange={(checked) => updateSetting('enablePushNotifications', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Touch Gestures</label>
                  <Switch
                    checked={settings.enableTouchGestures}
                    onCheckedChange={(checked) => updateSetting('enableTouchGestures', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Keyboard Shortcuts</label>
                  <Switch
                    checked={settings.enableKeyboardShortcuts}
                    onCheckedChange={(checked) => updateSetting('enableKeyboardShortcuts', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Dark Mode</label>
                  <Switch
                    checked={settings.enableDarkMode}
                    onCheckedChange={(checked) => updateSetting('enableDarkMode', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Reduce Motion</label>
                  <Switch
                    checked={settings.reduceMotion}
                    onCheckedChange={(checked) => updateSetting('reduceMotion', checked)}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="performance" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Auto Optimize Images</label>
                  <Switch
                    checked={settings.autoOptimizeImages}
                    onCheckedChange={(checked) => updateSetting('autoOptimizeImages', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Prefetch Content</label>
                  <Switch
                    checked={settings.prefetchContent}
                    onCheckedChange={(checked) => updateSetting('prefetchContent', checked)}
                  />
                </div>
                
                {performanceMetrics && (
                  <div className="space-y-2 pt-4 border-t">
                    <h3 className="text-sm font-medium">Performance Metrics</h3>
                    <div className="text-xs space-y-1">
                      <div>Load Time: {performanceMetrics.loadTime.toFixed(0)}ms</div>
                      <div>FCP: {performanceMetrics.firstContentfulPaint.toFixed(0)}ms</div>
                      <div>LCP: {performanceMetrics.largestContentfulPaint.toFixed(0)}ms</div>
                      <div>CLS: {performanceMetrics.cumulativeLayoutShift.toFixed(3)}</div>
                      <div>FID: {performanceMetrics.firstInputDelay.toFixed(0)}ms</div>
                      <div>Memory: {(performanceMetrics.memoryUsage / 1024 / 1024).toFixed(1)}MB</div>
                      <div>Requests: {performanceMetrics.networkRequests}</div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1">
          {/* Responsive Content Wrapper */}
          <div className="max-w-7xl mx-auto p-4 lg:p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
