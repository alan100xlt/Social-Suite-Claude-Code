import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  RotateCcw,
  Check,
  X,
  Zap,
  Sun,
  Moon,
  Palette,
  Sparkles
} from 'lucide-react';
import { useTheme, themeVariants, type ThemeVariant } from '@/contexts/ThemeContext';

interface ThemePreviewProps {
  className?: string;
}

export function ThemePreview({ className = '' }: ThemePreviewProps) {
  const {
    currentTheme,
    themeConfig,
    setTheme,
    availableThemes,
    isPreviewMode,
    setPreviewMode
  } = useTheme();

  const [comparisonTheme, setComparisonTheme] = useState<ThemeVariant | null>(null);
  const [showSideBySide, setShowSideBySide] = useState(false);

  const handleComparisonSelect = (theme: ThemeVariant) => {
    setComparisonTheme(theme);
    setShowSideBySide(true);
  };

  const closeComparison = () => {
    setShowSideBySide(false);
    setComparisonTheme(null);
  };

  const applyTheme = (theme: ThemeVariant) => {
    setTheme(theme);
    closeComparison();
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

  const renderThemeCard = (theme: ThemeVariant, isComparison = false) => {
    const config = themeVariants[theme];
    const isActive = currentTheme === theme && !isComparison;
    
    return (
      <div className={`
        relative bg-white dark:bg-gray-800 rounded-lg border-2 transition-all duration-300
        ${isActive ? 'border-blue-500 shadow-lg' : 'border-gray-200 dark:border-gray-700'}
      `}>
        {/* Theme Header */}
        <div className={`
          p-4 border-b
          ${isActive ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-50 dark:bg-gray-900'}
        `}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`
                p-2 rounded-lg
                ${isActive ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-800'}
              `}>
                {getThemeIcon(theme)}
              </div>
              <div>
                <div className="font-semibold">{config.name}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {config.description}
                </div>
              </div>
            </div>
            {isActive && (
              <Badge className="bg-green-100 text-green-800">
                Current
              </Badge>
            )}
          </div>
        </div>

        {/* Theme Preview */}
        <div className="p-6 space-y-4">
          {/* Color Palette */}
          <div>
            <div className="text-sm font-medium mb-3">Color Palette</div>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries({
                Primary: config.colors.primary,
                Secondary: config.colors.secondary,
                Accent: config.colors.accent,
                Background: config.colors.background
              }).map(([name, color]) => (
                <div key={name} className="text-center">
                  <div 
                    className="w-full h-12 rounded-md border border-gray-300 dark:border-gray-600"
                    style={{ 
                      background: color.includes('gradient') ? color : color,
                      border: '1px solid'
                    }}
                  />
                  <div className="text-xs mt-1 font-medium">{name}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Typography Preview */}
          <div>
            <div className="text-sm font-medium mb-3">Typography</div>
            <div className="space-y-2">
              <div style={{ fontFamily: config.typography.fontFamily }}>
                <div className="text-lg font-bold">Heading Text</div>
                <div className="text-sm">Body text with {config.typography.fontFamily}</div>
              </div>
              <div style={{ fontFamily: config.typography.headingFont }}>
                <div className="text-lg font-bold">Heading Font</div>
                <div className="text-sm">Custom heading: {config.typography.headingFont}</div>
              </div>
            </div>
          </div>

          {/* Spacing & Layout */}
          <div>
            <div className="text-sm font-medium mb-3">Layout & Spacing</div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="font-medium">Spacing Scale</div>
                <div>{config.typography.scale}x</div>
              </div>
              <div>
                <div className="font-medium">Border Radius</div>
                <div>{config.borderRadius.md}</div>
              </div>
              <div>
                <div className="font-medium">Animation</div>
                <div>{config.animations.duration}</div>
              </div>
              <div>
                <div className="font-medium">Reduced Motion</div>
                <div>{config.animations.reduced ? 'Yes' : 'No'}</div>
              </div>
            </div>
          </div>

          {/* Interactive Elements Preview */}
          <div>
            <div className="text-sm font-medium mb-3">Interactive Elements</div>
            <div className="space-y-3">
              <div className="flex space-x-2">
                <Button size="sm" variant="default">Primary</Button>
                <Button size="sm" variant="outline">Secondary</Button>
                <Button size="sm" variant="ghost">Ghost</Button>
              </div>
              <div className="flex space-x-2">
                <Badge>Badge</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {isActive ? 'Currently active' : 'Click to apply'}
            </div>
            {!isActive && (
              <Button
                size="sm"
                onClick={() => isComparison ? applyTheme(theme) : handleComparisonSelect(theme)}
              >
                {isComparison ? 'Apply This Theme' : 'Compare'}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (showSideBySide && comparisonTheme) {
    return (
      <div className={`fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-8 ${className}`}>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <Eye className="w-5 h-5" />
              <div>
                <div className="font-semibold">Theme Comparison</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {themeVariants[currentTheme].name} vs {themeVariants[comparisonTheme].name}
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={closeComparison}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Comparison Content */}
          <div className="flex h-[calc(90vh-120px)]">
            {/* Current Theme */}
            <div className="flex-1 p-6 overflow-y-auto border-r border-gray-200 dark:border-gray-700">
              <div className="text-center mb-4">
                <Badge className="bg-blue-100 text-blue-800">Current Theme</Badge>
              </div>
              {renderThemeCard(currentTheme, true)}
            </div>

            {/* Comparison Theme */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="text-center mb-4">
                <Badge variant="outline">Comparison Theme</Badge>
              </div>
              {renderThemeCard(comparisonTheme, true)}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Choose which theme to apply
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={closeComparison}>
                Cancel
              </Button>
              <Button onClick={() => applyTheme(comparisonTheme)}>
                Apply {themeVariants[comparisonTheme].name}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Eye className="w-5 h-5" />
          <CardTitle>Theme Experience Preview</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Preview all available themes and compare them side-by-side before making changes.
        </div>

        {/* Current Theme Display */}
        <div className="mb-6">
          <div className="text-sm font-medium mb-3">Current Theme</div>
          {renderThemeCard(currentTheme)}
        </div>

        {/* Available Themes Grid */}
        <div>
          <div className="text-sm font-medium mb-3">Available Themes</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableThemes
              .filter(theme => theme.id !== currentTheme)
              .map(theme => (
                <div key={theme.id} className="scale-95">
                  {renderThemeCard(theme.id)}
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ThemePreview;
