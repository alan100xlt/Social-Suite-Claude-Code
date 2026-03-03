import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Palette, 
  Settings, 
  Eye, 
  RotateCcw, 
  Zap,
  Sun,
  Moon,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import ThemeToggle from '@/components/theme/ThemeToggle';
import ThemePreview from '@/components/theme/ThemePreview';
import { useTheme, themeVariants, type ThemeVariant } from '@/contexts/ThemeContext';

export default function ThemeSettings() {
  const {
    currentTheme,
    themeConfig,
    setTheme,
    resetToDefault,
    availableThemes,
    isPreviewMode
  } = useTheme();

  const getThemeIcon = (theme: ThemeVariant) => {
    switch (theme) {
      case 'professional':
        return <Palette className="w-4 h-4" />;
      case 'modern':
        return <Sparkles className="w-4 h-4" />;
      case 'minimal':
        return <Sun className="w-4 h-4" />;
      case 'vibrant':
        return <Zap className="w-4 h-4" />;
      case 'dark-pro':
        return <Moon className="w-4 h-4" />;
      default:
        return <Palette className="w-4 h-4" />;
    }
  };

  const getThemeStats = () => {
    const stats = availableThemes.map(theme => ({
      id: theme.id,
      name: theme.name,
      isCurrent: currentTheme === theme.id,
      hasGradient: theme.colors.primary.includes('gradient'),
      isDark: theme.name.toLowerCase().includes('dark'),
      scale: theme.typography.scale,
      reducedMotion: theme.animations.reduced
    }));

    return {
      total: stats.length,
      current: stats.find(s => s.isCurrent),
      gradients: stats.filter(s => s.hasGradient).length,
      darkThemes: stats.filter(s => s.isDark).length,
      reducedMotion: stats.filter(s => s.reducedMotion).length
    };
  };

  const stats = getThemeStats();

  return (
    <DashboardLayout>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-3">
            <Palette className="w-8 h-8" />
            Theme Experience Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Customize your design experience with different themes, preview changes, and manage your visual preferences.
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Badge 
            variant={isPreviewMode ? "default" : "secondary"}
            className="text-sm"
          >
            {isPreviewMode ? 'Preview Mode' : 'Live Mode'}
          </Badge>
          <Button
            variant="outline"
            onClick={resetToDefault}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Default
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Palette className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-gray-600">Total Themes</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{stats.current?.name}</div>
                <div className="text-sm text-gray-600">Current Theme</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{stats.gradients}</div>
                <div className="text-sm text-gray-600">Gradient Themes</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Moon className="w-5 h-5 text-gray-600" />
              <div>
                <div className="text-2xl font-bold">{stats.darkThemes}</div>
                <div className="text-sm text-gray-600">Dark Themes</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Settings className="w-5 h-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">{stats.reducedMotion}</div>
                <div className="text-sm text-gray-600">Reduced Motion</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="toggle" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="toggle" className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>Quick Toggle</span>
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center space-x-2">
            <Eye className="w-4 h-4" />
            <span>Preview & Compare</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center space-x-2">
            <Info className="w-4 h-4" />
            <span>Advanced</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="toggle" className="space-y-6">
          <ThemeToggle />
          
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common theme operations and shortcuts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableThemes.map(theme => (
                  <Button
                    key={theme.id}
                    variant={currentTheme === theme.id ? "default" : "outline"}
                    className="justify-start h-auto p-4"
                    onClick={() => setTheme(theme.id)}
                  >
                    <div className="flex items-center space-x-3 w-full">
                      <div className={`
                        p-2 rounded-lg
                        ${currentTheme === theme.id ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-800'}
                      `}>
                        {getThemeIcon(theme.id)}
                      </div>
                      <div className="text-left">
                        <div className="font-medium">{theme.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {theme.description}
                        </div>
                      </div>
                      {currentTheme === theme.id && (
                        <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <ThemePreview />
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          {/* Current Theme Details */}
          <Card>
            <CardHeader>
              <CardTitle>Current Theme Configuration</CardTitle>
              <CardDescription>
                Detailed information about your currently active theme.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Colors</h4>
                  <div className="space-y-2">
                    {Object.entries(themeConfig.colors).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{key}</span>
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
                            style={{ 
                              background: value.includes('gradient') ? value : value,
                              border: '1px solid'
                            }}
                          />
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {typeof value === 'string' && value.length > 20 
                              ? value.substring(0, 20) + '...' 
                              : value
                            }
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Typography & Layout</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Font Family</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {themeConfig.typography.fontFamily}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Heading Font</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {themeConfig.typography.headingFont}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Font Scale</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {themeConfig.typography.scale}x
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Border Radius</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {themeConfig.borderRadius.md}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Animation Duration</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {themeConfig.animations.duration}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Reduced Motion</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {themeConfig.animations.reduced ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Theme System Info */}
          <Card>
            <CardHeader>
              <CardTitle>Theme System Information</CardTitle>
              <CardDescription>
                Technical details about the theme experience system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">System Features</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm">Live Theme Switching</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm">Preview Mode</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm">Side-by-Side Comparison</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm">Local Storage Persistence</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm">CSS Custom Properties</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm">Responsive Design</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Available Themes</h4>
                  <div className="space-y-2">
                    {availableThemes.map(theme => (
                      <div key={theme.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getThemeIcon(theme.id)}
                          <span className="text-sm">{theme.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {theme.colors.primary.includes('gradient') && (
                            <Badge variant="secondary" className="text-xs">Gradient</Badge>
                          )}
                          {theme.name.toLowerCase().includes('dark') && (
                            <Badge variant="secondary" className="text-xs">Dark</Badge>
                          )}
                          {theme.animations.reduced && (
                            <Badge variant="secondary" className="text-xs">Reduced Motion</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </DashboardLayout>
  );
}
