import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Image, Type, Eye, EyeOff, Search } from 'lucide-react';
import {
  useOgCompanySettings,
  useUpdateOgCompanySettings,
  OG_TEMPLATES,
  type OgCompanySettings,
} from '@/hooks/useOgImage';

const CATEGORIES = ['photo', 'gradient', 'news', 'stats', 'editorial', 'brand'] as const;

const VISIBILITY_FIELDS: Array<{
  key: keyof Pick<OgCompanySettings, 'show_title' | 'show_description' | 'show_author' | 'show_date' | 'show_logo' | 'show_category_tag' | 'show_source_name'>;
  label: string;
  description: string;
}> = [
  { key: 'show_title', label: 'Title', description: 'Article headline' },
  { key: 'show_description', label: 'Description', description: 'Article summary/subtitle' },
  { key: 'show_author', label: 'Author', description: 'Writer byline' },
  { key: 'show_date', label: 'Date', description: 'Publication date' },
  { key: 'show_logo', label: 'Logo', description: 'Company logo' },
  { key: 'show_category_tag', label: 'Category Tag', description: 'Article category badge' },
  { key: 'show_source_name', label: 'Source Name', description: 'Feed/publication name' },
];

const DEFAULT_SETTINGS: Partial<OgCompanySettings> = {
  show_title: true,
  show_description: true,
  show_author: false,
  show_date: false,
  show_logo: true,
  show_category_tag: false,
  show_source_name: true,
  brand_color: '#3B82F6',
  font_family: 'sans',
};

export function OgSettingsTab() {
  const { data: settings, isLoading } = useOgCompanySettings();
  const updateSettings = useUpdateOgCompanySettings();
  const [search, setSearch] = useState('');

  const current = settings || DEFAULT_SETTINGS;
  const disabledIds = new Set(settings?.disabled_template_ids || []);

  const filteredTemplates = useMemo(() => {
    if (!search) return OG_TEMPLATES;
    const q = search.toLowerCase();
    return OG_TEMPLATES.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q)
    );
  }, [search]);

  const handleVisibilityToggle = (key: string, value: boolean) => {
    updateSettings.mutate({ [key]: value });
  };

  const handleFontChange = (value: string) => {
    updateSettings.mutate({ font_family: value as 'sans' | 'serif' | 'mono' });
  };

  const handleTitleFontChange = (value: string) => {
    updateSettings.mutate({
      font_family_title: value === 'inherit' ? null : value as 'sans' | 'serif' | 'mono',
    });
  };

  const handleBrandColorChange = (color: string) => {
    updateSettings.mutate({ brand_color: color });
  };

  const handleToggleTemplate = (templateId: string) => {
    const current = settings?.disabled_template_ids || [];
    const newDisabled = disabledIds.has(templateId)
      ? current.filter(id => id !== templateId)
      : [...current, templateId];
    updateSettings.mutate({ disabled_template_ids: newDisabled });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Visibility Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Content Layers
          </CardTitle>
          <CardDescription>
            Choose which elements appear on your OG images. These settings apply to all templates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {VISIBILITY_FIELDS.map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">{label}</Label>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <Switch
                checked={(current as Record<string, unknown>)[key] as boolean ?? false}
                onCheckedChange={(checked) => handleVisibilityToggle(key, checked)}
                disabled={updateSettings.isPending}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Brand & Typography */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            Brand & Typography
          </CardTitle>
          <CardDescription>
            Set your brand colors and font preferences for OG images.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Brand Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={current.brand_color || '#3B82F6'}
                  onChange={(e) => handleBrandColorChange(e.target.value)}
                  className="h-9 w-12 rounded border cursor-pointer"
                />
                <Input
                  value={current.brand_color || '#3B82F6'}
                  onChange={(e) => handleBrandColorChange(e.target.value)}
                  className="font-mono text-sm"
                  placeholder="#3B82F6"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Secondary Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={current.brand_color_secondary || '#6366F1'}
                  onChange={(e) => updateSettings.mutate({ brand_color_secondary: e.target.value })}
                  className="h-9 w-12 rounded border cursor-pointer"
                />
                <Input
                  value={current.brand_color_secondary || ''}
                  onChange={(e) => updateSettings.mutate({ brand_color_secondary: e.target.value || null })}
                  className="font-mono text-sm"
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Body Font</Label>
              <Select value={current.font_family || 'sans'} onValueChange={handleFontChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sans">Inter (Sans-serif)</SelectItem>
                  <SelectItem value="serif">Source Serif 4</SelectItem>
                  <SelectItem value="mono">JetBrains Mono</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title Font</Label>
              <Select
                value={current.font_family_title || 'inherit'}
                onValueChange={handleTitleFontChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inherit">Same as body</SelectItem>
                  <SelectItem value="sans">Inter (Sans-serif)</SelectItem>
                  <SelectItem value="serif">Source Serif 4</SelectItem>
                  <SelectItem value="mono">JetBrains Mono</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Logo URL (light background)</Label>
              <Input
                value={current.logo_url || ''}
                onChange={(e) => updateSettings.mutate({ logo_url: e.target.value || null })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Logo URL (dark background)</Label>
              <Input
                value={current.logo_dark_url || ''}
                onChange={(e) => updateSettings.mutate({ logo_dark_url: e.target.value || null })}
                placeholder="https://..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Template Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Template Library
          </CardTitle>
          <CardDescription>
            Enable or disable templates. Disabled templates won't be used by AI or shown in the template picker.
            {disabledIds.size > 0 && (
              <span className="ml-1 text-amber-500">
                ({disabledIds.size} disabled)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-4">
            {CATEGORIES.map(category => {
              const categoryTemplates = filteredTemplates.filter(t => t.category === category);
              if (categoryTemplates.length === 0) return null;
              const enabledCount = categoryTemplates.filter(t => !disabledIds.has(t.id)).length;

              return (
                <div key={category}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold capitalize">{category}</h4>
                    <span className="text-xs text-muted-foreground">
                      {enabledCount}/{categoryTemplates.length} enabled
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {categoryTemplates.map(t => {
                      const isDisabled = disabledIds.has(t.id);
                      return (
                        <button
                          key={t.id}
                          onClick={() => handleToggleTemplate(t.id)}
                          disabled={updateSettings.isPending}
                          className={`flex items-center gap-2 px-3 py-2 rounded-md border text-left text-xs transition-colors ${
                            isDisabled
                              ? 'border-dashed border-muted-foreground/30 text-muted-foreground/50 bg-muted/30'
                              : 'border-border bg-card hover:bg-accent'
                          }`}
                        >
                          {isDisabled ? (
                            <EyeOff className="h-3 w-3 flex-shrink-0" />
                          ) : (
                            <Eye className="h-3 w-3 flex-shrink-0 text-green-500" />
                          )}
                          <span className="truncate">{t.name}</span>
                          {t.requiresImage && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 ml-auto flex-shrink-0">
                              img
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <Separator className="mt-3" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
