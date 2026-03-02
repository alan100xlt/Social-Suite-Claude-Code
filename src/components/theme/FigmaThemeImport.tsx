import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  Upload, 
  Palette, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Eye,
  Settings,
  Link
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { FigmaService, FigmaThemeData } from '@/services/figmaService';
import { FigmaThemeTranslator } from '@/utils/figmaThemeTranslator';

interface FigmaThemeImportProps {
  className?: string;
}

export function FigmaThemeImport({ className = '' }: FigmaThemeImportProps) {
  const { setTheme, availableThemes } = useTheme();
  const [figmaFileUrl, setFigmaFileUrl] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [previewTheme, setPreviewTheme] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  const extractFileId = (url: string): string | null => {
    const match = url.match(/figma\.com\/file\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  };

  const handleImport = async () => {
    const fileId = extractFileId(figmaFileUrl);
    
    if (!fileId) {
      setErrorMessage('Invalid Figma file URL. Please enter a valid Figma file link.');
      setImportStatus('error');
      return;
    }

    if (!accessToken) {
      setErrorMessage('Please enter your Figma access token.');
      setImportStatus('error');
      return;
    }

    setIsLoading(true);
    setImportStatus('loading');
    setErrorMessage('');

    try {
      const figmaService = new FigmaService(accessToken);
      
      // Test connection first
      const isConnected = await figmaService.testConnection();
      if (!isConnected) {
        throw new Error('Failed to connect to Figma API. Please check your access token.');
      }

      // Extract theme data
      const figmaData: FigmaThemeData = await figmaService.extractThemeData(fileId);
      
      // Translate to theme config
      const themeConfig = FigmaThemeTranslator.translateToFigmaTheme(figmaData);
      
      // Validate theme
      const validation = FigmaThemeTranslator.validateTheme(themeConfig);
      if (!validation.isValid) {
        throw new Error(`Invalid theme: ${validation.errors.join(', ')}`);
      }

      setPreviewTheme(themeConfig);
      setShowPreview(true);
      setImportStatus('success');
      
    } catch (error) {
      console.error('Error importing Figma theme:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to import theme');
      setImportStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyTheme = () => {
    if (previewTheme) {
      // Add the new theme to available themes (this would require extending the theme system)
      setTheme(previewTheme.id);
      setShowPreview(false);
    }
  };

  const renderThemePreview = () => {
    if (!previewTheme) return null;

    const preview = FigmaThemeTranslator.generateThemePreview(previewTheme);

    return (
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Eye className="w-5 h-5" />
            <CardTitle>Theme Preview: {previewTheme.name}</CardTitle>
          </div>
          <CardDescription>
            Review the imported theme before applying it to your application
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Color Palette */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Color Palette</Label>
            <div className="grid grid-cols-4 gap-3">
              {Object.entries(preview).map(([name, color]) => (
                <div key={name} className="text-center">
                  <div 
                    className="w-full h-12 rounded-md border border-gray-300 dark:border-gray-600"
                    style={{ backgroundColor: color }}
                  />
                  <div className="text-xs mt-1 font-medium capitalize">{name}</div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Typography */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Typography</Label>
            <div className="space-y-2">
              <div style={{ fontFamily: previewTheme.typography.fontFamily }}>
                <div className="text-lg font-bold">Body Text Sample</div>
                <div className="text-sm">Using {previewTheme.typography.fontFamily}</div>
              </div>
              <div style={{ fontFamily: previewTheme.typography.headingFont }}>
                <div className="text-lg font-bold">Heading Text Sample</div>
                <div className="text-sm">Using {previewTheme.typography.headingFont}</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Theme Properties */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Theme Properties</Label>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium">Font Scale</div>
                <div>{previewTheme.typography.scale}x</div>
              </div>
              <div>
                <div className="font-medium">Animation Duration</div>
                <div>{previewTheme.animations.duration}</div>
              </div>
              <div>
                <div className="font-medium">Border Radius (MD)</div>
                <div>{previewTheme.borderRadius.md}</div>
              </div>
              <div>
                <div className="font-medium">Reduced Motion</div>
                <div>{previewTheme.animations.reduced ? 'Yes' : 'No'}</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button onClick={handleApplyTheme} className="flex-1">
              <CheckCircle className="w-4 h-4 mr-2" />
              Apply Theme
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowPreview(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Palette className="w-5 h-5" />
          <CardTitle>Import Figma Theme</CardTitle>
        </div>
        <CardDescription>
          Import design tokens and color palettes directly from your Figma files
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center space-x-3">
            <Link className="w-4 h-4" />
            <div>
              <div className="font-medium">Figma API Connection</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Connect to import design tokens
              </div>
            </div>
          </div>
          <Badge variant={importStatus === 'success' ? 'default' : 'secondary'}>
            {importStatus === 'idle' && 'Not Connected'}
            {importStatus === 'loading' && 'Connecting...'}
            {importStatus === 'success' && 'Connected'}
            {importStatus === 'error' && 'Error'}
          </Badge>
        </div>

        {/* Input Fields */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="figma-url">Figma File URL</Label>
            <Input
              id="figma-url"
              type="url"
              placeholder="https://figma.com/file/your-file-id"
              value={figmaFileUrl}
              onChange={(e) => setFigmaFileUrl(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="access-token">Figma Access Token</Label>
            <Input
              id="access-token"
              type="password"
              placeholder="figd_your-access-token"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              className="mt-1"
            />
            <div className="text-xs text-gray-500 mt-1">
              Get your access token from Figma Account Settings → Developer → Personal Access Tokens
            </div>
          </div>
        </div>

        {/* Error Message */}
        {importStatus === 'error' && errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Import Button */}
        <Button 
          onClick={handleImport} 
          disabled={isLoading || !figmaFileUrl || !accessToken}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Importing Theme...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Import Theme from Figma
            </>
          )}
        </Button>

        {/* Theme Preview */}
        {showPreview && renderThemePreview()}

        {/* Instructions */}
        <div className="text-xs text-gray-500 space-y-1 pt-4 border-t">
          <div>• Your Figma file should use consistent naming conventions for colors and styles</div>
          <div>• Color styles should be named: primary, secondary, accent, background, etc.</div>
          <div>• Typography styles should include "heading" or "body" in their names</div>
          <div>• Make sure your access token has read permissions for the file</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default FigmaThemeImport;
