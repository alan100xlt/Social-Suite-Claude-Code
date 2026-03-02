import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Palette, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  Settings, 
  Sparkles, 
  Sun, 
  Moon, 
  Zap,
  CheckCircle,
  AlertCircle,
  Download
} from 'lucide-react';
import { useTheme, themeVariants, type ThemeVariant } from '@/contexts/ThemeContext';
import { FigmaThemeImport } from './FigmaThemeImport';

export function ThemeToggle() {
  const {
    currentTheme,
    themeConfig,
    setTheme,
    toggleTheme,
    resetToDefault,
    availableThemes,
    isPreviewMode,
    setPreviewMode
  } = useTheme();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [previewTheme, setPreviewTheme] = useState<ThemeVariant | null>(null);

  const handleThemeSelect = (theme: ThemeVariant) => {
    if (isPreviewMode) {
      setPreviewTheme(theme);
    } else {
      setTheme(theme);
    }
  };

  const handlePreviewToggle = (enabled: boolean) => {
    setPreviewMode(enabled);
    if (!enabled) {
      setPreviewTheme(null);
    }
  };

  const applyPreviewTheme = () => {
    if (previewTheme) {
      setTheme(previewTheme);
      setPreviewTheme(null);
      setPreviewMode(false);
    }
  };

  const cancelPreview = () => {
    setPreviewTheme(null);
    setPreviewMode(false);
  };

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

  const getThemePreview = (theme: ThemeVariant) => {
    const config = themeVariants[theme];
    return {
      primary: config.colors.primary,
      secondary: config.colors.secondary,
      accent: config.colors.accent,
      background: config.colors.background
    };
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Palette className="w-5 h-5" />
            <CardTitle>Theme Experience</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Badge 
              variant={isPreviewMode ? "default" : "secondary"}
              className="text-xs"
            >
              {isPreviewMode ? 'Preview Mode' : 'Live Mode'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <CardDescription>
          Switch between different design experiences or import from Figma
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="themes" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="themes" className="flex items-center space-x-2">
              <Palette className="w-4 h-4" />
              <span>Built-in Themes</span>
            </TabsTrigger>
            <TabsTrigger value="figma" className="flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Import from Figma</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="themes" className="space-y-6 mt-6">
            {/* Preview Mode Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3">
                {isPreviewMode ? (
                  <Eye className="w-4 h-4 text-blue-600" />
                ) : (
                  <EyeOff className="w-4 h-4 text-gray-600" />
                )}
                <div>
                  <div className="font-medium">Preview Mode</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {isPreviewMode 
                      ? 'Test themes before applying' 
                      : 'Changes apply immediately'
                    }
                  </div>
                </div>
              </div>
              <Switch
                checked={isPreviewMode}
                onCheckedChange={handlePreviewToggle}
              />
            </div>

            {/* Theme Selection */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Select Theme {isPreviewMode && '(Preview)'}
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                {availableThemes.map((theme) => {
                  const isSelected = isPreviewMode 
                    ? previewTheme === theme.id 
                    : currentTheme === theme.id;
                  const isCurrent = currentTheme === theme.id;
                  
                  return (
                    <div
                      key={theme.id}
                      className={`
                        relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                        ${isSelected 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }
                      `}
                      onClick={() => handleThemeSelect(theme.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`
                            p-2 rounded-md
                            ${isSelected ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-800'}
                          `}>
                            {getThemeIcon(theme.id)}
                          </div>
                          <div>
                            <div className="font-medium">{theme.name}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {theme.description}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          {isCurrent && !isPreviewMode && (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                          {isSelected && isPreviewMode && (
                            <Badge variant="secondary" className="text-xs">
                              Preview
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Theme Color Preview */}
                      <div className="mt-3 flex space-x-2">
                        {Object.entries(getThemePreview(theme.id)).map(([key, value]) => (
                          <div key={key} className="text-center">
                            <div 
                              className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600"
                              style={{ 
                                background: value.includes('gradient') ? value : value,
                                border: '1px solid'
                              }}
                            />
                            <div className="text-xs mt-1 capitalize">{key}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Preview Actions */}
            {isPreviewMode && previewTheme && (
              <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                  <div>
                    <div className="font-medium">Preview Active</div>
                    <div className="text-sm text-yellow-700 dark:text-yellow-300">
                      Previewing {themeVariants[previewTheme].name} theme
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelPreview}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={applyPreviewTheme}
                  >
                    Apply Theme
                  </Button>
                </div>
              </div>
            )}

            {/* Advanced Options */}
            {showAdvanced && (
              <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="font-medium mb-3">Advanced Options</div>
                
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={toggleTheme}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Quick Toggle Theme
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={resetToDefault}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset to Professional
                  </Button>
                </div>

                <div className="text-sm text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="font-medium mb-2">Current Theme Info:</div>
                  <div className="space-y-1">
                    <div>• Name: {themeConfig.name}</div>
                    <div>• Typography: {themeConfig.typography.fontFamily}</div>
                    <div>• Spacing Scale: {themeConfig.typography.scale}x</div>
                    <div>• Animation: {themeConfig.animations.duration}</div>
                    <div>• Reduced Motion: {themeConfig.animations.reduced ? 'On' : 'Off'}</div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="figma" className="mt-6">
            <FigmaThemeImport />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default ThemeToggle;
