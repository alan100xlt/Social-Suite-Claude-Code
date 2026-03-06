import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSelectedCompany } from '@/contexts/SelectedCompanyContext';
import { isDemoCompany } from '@/lib/demo/demo-constants';

async function callOgFunction(action: string, params: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');

  const resp = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/og-image-generator`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, ...params }),
    }
  );

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }));
    throw new Error(err.error || 'OG image generation failed');
  }

  return resp.json();
}

export function useGenerateOgImage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (feedItemId: string) =>
      callOgFunction('generate', { feedItemId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rss-feed-items'] });
      queryClient.invalidateQueries({ queryKey: ['all-feed-items'] });
      toast({ title: 'OG Image Generated', description: 'Preview image has been created.' });
    },
    onError: (error) => {
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate OG image',
        variant: 'destructive',
      });
    },
  });
}

export function useRegenerateOgImage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ feedItemId, templateId }: { feedItemId: string; templateId?: string }) =>
      callOgFunction('regenerate', { feedItemId, templateId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rss-feed-items'] });
      queryClient.invalidateQueries({ queryKey: ['all-feed-items'] });
      toast({ title: 'OG Image Regenerated', description: 'Preview image has been updated.' });
    },
    onError: (error) => {
      toast({
        title: 'Regeneration Failed',
        description: error instanceof Error ? error.message : 'Failed to regenerate OG image',
        variant: 'destructive',
      });
    },
  });
}

/** Template metadata (no render function — frontend only needs display info) */
export interface OgTemplateInfo {
  id: string;
  name: string;
  category: string;
  requiresImage: boolean;
  tags?: string[];
  archetype?: string;
  theme?: string;
}

/** Static template list for the UI — synced from backend config files (103 templates) */
export const OG_TEMPLATES: OgTemplateInfo[] = [
  // Photo (33)
  { id: 'photo-hero', name: 'Photo Hero', category: 'photo', requiresImage: true },
  { id: 'photo-glass', name: 'Photo Glass', category: 'photo', requiresImage: true },
  { id: 'photo-caption', name: 'Photo Caption', category: 'photo', requiresImage: true },
  { id: 'photo-split', name: 'Photo Split', category: 'photo', requiresImage: true },
  { id: 'photo-duotone', name: 'Photo Duotone', category: 'photo', requiresImage: true },
  { id: 'photo-frame', name: 'Photo Frame', category: 'photo', requiresImage: true },
  { id: 'photo-sidebar', name: 'Photo Sidebar', category: 'photo', requiresImage: true },
  { id: 'photo-panoramic', name: 'Photo Panoramic', category: 'photo', requiresImage: true },
  { id: 'photo-cinematic', name: 'Photo Cinematic', category: 'photo', requiresImage: true },
  { id: 'photo-spotlight', name: 'Photo Spotlight', category: 'photo', requiresImage: true },
  { id: 'photo-magazine', name: 'Photo Magazine', category: 'photo', requiresImage: true },
  { id: 'photo-editorial', name: 'Photo Editorial', category: 'photo', requiresImage: true },
  { id: 'photo-overlay-bold', name: 'Photo Overlay Bold', category: 'photo', requiresImage: true },
  { id: 'photo-vignette', name: 'Photo Vignette', category: 'photo', requiresImage: true },
  { id: 'photo-minimal', name: 'Photo Minimal', category: 'photo', requiresImage: true },
  { id: 'photo-strip', name: 'Photo Strip', category: 'photo', requiresImage: true },
  { id: 'photo-gradient-fade', name: 'Photo Gradient Fade', category: 'photo', requiresImage: true },
  { id: 'photo-grayscale', name: 'Photo Grayscale', category: 'photo', requiresImage: true },
  { id: 'photo-sepia', name: 'Photo Sepia', category: 'photo', requiresImage: true },
  { id: 'photo-brand-tint', name: 'Photo Brand Tint', category: 'photo', requiresImage: true },
  { id: 'photo-blur-bg', name: 'Photo Blur Background', category: 'photo', requiresImage: true },
  { id: 'photo-corner-card', name: 'Photo Corner Card', category: 'photo', requiresImage: true },
  { id: 'photo-top-story', name: 'Photo Top Story', category: 'photo', requiresImage: true },
  { id: 'photo-feature', name: 'Photo Feature', category: 'photo', requiresImage: true },
  { id: 'photo-wide', name: 'Photo Wide', category: 'photo', requiresImage: true },
  { id: 'photo-banner', name: 'Photo Banner', category: 'photo', requiresImage: true },
  { id: 'photo-dark-luxe', name: 'Photo Dark Luxe', category: 'photo', requiresImage: true },
  { id: 'photo-light-airy', name: 'Photo Light Airy', category: 'photo', requiresImage: true },
  { id: 'photo-mosaic', name: 'Photo Mosaic', category: 'photo', requiresImage: true },
  { id: 'photo-profile', name: 'Photo Profile', category: 'photo', requiresImage: true },
  { id: 'photo-halftone', name: 'Photo Halftone', category: 'photo', requiresImage: true },
  { id: 'photo-mono-type', name: 'Photo Mono Type', category: 'photo', requiresImage: true },
  { id: 'photo-tilt', name: 'Photo Tilt', category: 'photo', requiresImage: true },
  // Gradient (20)
  { id: 'gradient-clean', name: 'Clean Gradient', category: 'gradient', requiresImage: false },
  { id: 'gradient-modern', name: 'Modern Gradient', category: 'gradient', requiresImage: false },
  { id: 'gradient-bold', name: 'Bold Gradient', category: 'gradient', requiresImage: false },
  { id: 'gradient-minimal', name: 'Minimal Gradient', category: 'gradient', requiresImage: false },
  { id: 'gradient-glass', name: 'Glass Gradient', category: 'gradient', requiresImage: false },
  { id: 'gradient-startup', name: 'Startup Gradient', category: 'gradient', requiresImage: false },
  { id: 'gradient-sunset', name: 'Sunset Gradient', category: 'gradient', requiresImage: false },
  { id: 'gradient-ocean', name: 'Ocean Gradient', category: 'gradient', requiresImage: false },
  { id: 'gradient-neon', name: 'Neon Gradient', category: 'gradient', requiresImage: false },
  { id: 'gradient-pastel', name: 'Pastel Gradient', category: 'gradient', requiresImage: false },
  { id: 'gradient-warm', name: 'Warm Gradient', category: 'gradient', requiresImage: false },
  { id: 'gradient-cool', name: 'Cool Gradient', category: 'gradient', requiresImage: false },
  { id: 'gradient-electric', name: 'Electric Gradient', category: 'gradient', requiresImage: false },
  { id: 'gradient-aurora', name: 'Aurora Gradient', category: 'gradient', requiresImage: false },
  { id: 'gradient-midnight', name: 'Midnight Gradient', category: 'gradient', requiresImage: false },
  { id: 'gradient-dawn', name: 'Dawn Gradient', category: 'gradient', requiresImage: false },
  { id: 'gradient-ember', name: 'Ember Gradient', category: 'gradient', requiresImage: false },
  { id: 'gradient-forest', name: 'Forest Gradient', category: 'gradient', requiresImage: false },
  { id: 'gradient-royal', name: 'Royal Gradient', category: 'gradient', requiresImage: false },
  { id: 'gradient-coral', name: 'Coral Gradient', category: 'gradient', requiresImage: false },
  // News (15)
  { id: 'news-banner', name: 'News Banner', category: 'news', requiresImage: false },
  { id: 'news-photo-banner', name: 'News Photo Banner', category: 'news', requiresImage: true },
  { id: 'news-ticker', name: 'News Ticker', category: 'news', requiresImage: false },
  { id: 'news-flash', name: 'News Flash', category: 'news', requiresImage: false },
  { id: 'news-headline', name: 'News Headline', category: 'news', requiresImage: true },
  { id: 'news-alert', name: 'News Alert', category: 'news', requiresImage: true },
  { id: 'news-wire', name: 'News Wire', category: 'news', requiresImage: false },
  { id: 'news-digest', name: 'News Digest', category: 'news', requiresImage: true },
  { id: 'news-frontpage', name: 'News Front Page', category: 'news', requiresImage: true },
  { id: 'news-column', name: 'News Column', category: 'news', requiresImage: true },
  { id: 'news-bulletin', name: 'News Bulletin', category: 'news', requiresImage: false },
  { id: 'news-special', name: 'News Special', category: 'news', requiresImage: true },
  { id: 'news-exclusive', name: 'News Exclusive', category: 'news', requiresImage: true },
  { id: 'news-live', name: 'News Live', category: 'news', requiresImage: true },
  { id: 'news-update', name: 'News Update', category: 'news', requiresImage: true },
  // Stats (10)
  { id: 'stats-bars', name: 'Stats Bars', category: 'stats', requiresImage: false },
  { id: 'stats-card', name: 'Stats Card', category: 'stats', requiresImage: false },
  { id: 'stats-grid', name: 'Stats Grid', category: 'stats', requiresImage: false },
  { id: 'stats-dashboard', name: 'Stats Dashboard', category: 'stats', requiresImage: false },
  { id: 'stats-metric', name: 'Stats Metric', category: 'stats', requiresImage: false },
  { id: 'stats-comparison', name: 'Stats Comparison', category: 'stats', requiresImage: false },
  { id: 'stats-trend', name: 'Stats Trend', category: 'stats', requiresImage: false },
  { id: 'stats-highlight', name: 'Stats Highlight', category: 'stats', requiresImage: false },
  { id: 'stats-scorecard', name: 'Stats Scorecard', category: 'stats', requiresImage: false },
  { id: 'stats-chart', name: 'Stats Chart', category: 'stats', requiresImage: false },
  // Editorial (14)
  { id: 'quote-classic', name: 'Quote Classic', category: 'editorial', requiresImage: false },
  { id: 'quote-highlight', name: 'Quote Highlight', category: 'editorial', requiresImage: false },
  { id: 'editorial-magazine', name: 'Editorial Magazine', category: 'editorial', requiresImage: false },
  { id: 'photo-quote', name: 'Photo Quote', category: 'editorial', requiresImage: true },
  { id: 'editorial-longform', name: 'Editorial Longform', category: 'editorial', requiresImage: false },
  { id: 'editorial-opinion', name: 'Editorial Opinion', category: 'editorial', requiresImage: false },
  { id: 'editorial-review', name: 'Editorial Review', category: 'editorial', requiresImage: true },
  { id: 'editorial-feature', name: 'Editorial Feature', category: 'editorial', requiresImage: true },
  { id: 'editorial-column', name: 'Editorial Column', category: 'editorial', requiresImage: false },
  { id: 'editorial-letter', name: 'Editorial Letter', category: 'editorial', requiresImage: false },
  { id: 'editorial-essay', name: 'Editorial Essay', category: 'editorial', requiresImage: false },
  { id: 'editorial-interview', name: 'Editorial Interview', category: 'editorial', requiresImage: true },
  { id: 'editorial-profile', name: 'Editorial Profile', category: 'editorial', requiresImage: true },
  { id: 'editorial-analysis', name: 'Editorial Analysis', category: 'editorial', requiresImage: true },
  // Brand (11)
  { id: 'brand-minimal', name: 'Brand Minimal', category: 'brand', requiresImage: false },
  { id: 'brand-announce', name: 'Brand Announcement', category: 'brand', requiresImage: false },
  { id: 'brand-code', name: 'Brand Code', category: 'brand', requiresImage: false },
  { id: 'brand-event', name: 'Brand Event', category: 'brand', requiresImage: false },
  { id: 'brand-statement', name: 'Brand Statement', category: 'brand', requiresImage: false },
  { id: 'brand-spotlight', name: 'Brand Spotlight', category: 'brand', requiresImage: false },
  { id: 'brand-launch', name: 'Brand Launch', category: 'brand', requiresImage: false },
  { id: 'brand-update', name: 'Brand Update', category: 'brand', requiresImage: false },
  { id: 'brand-story', name: 'Brand Story', category: 'brand', requiresImage: false },
  { id: 'brand-milestone', name: 'Brand Milestone', category: 'brand', requiresImage: false },
  { id: 'brand-product', name: 'Brand Product', category: 'brand', requiresImage: false },
];

/** Company OG settings */
export interface OgCompanySettings {
  company_id: string;
  show_title: boolean;
  show_description: boolean;
  show_author: boolean;
  show_date: boolean;
  show_logo: boolean;
  show_category_tag: boolean;
  show_source_name: boolean;
  logo_url: string | null;
  logo_dark_url: string | null;
  brand_color: string;
  brand_color_secondary: string | null;
  font_family: 'sans' | 'serif' | 'mono';
  font_family_title: 'sans' | 'serif' | 'mono' | null;
  preferred_template_ids: string[];
  disabled_template_ids: string[];
}

export function useOgCompanySettings() {
  const { selectedCompanyId } = useSelectedCompany();
  const isDemo = isDemoCompany(selectedCompanyId);

  return useQuery({
    queryKey: ['og-company-settings', selectedCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('og_company_settings')
        .select('*')
        .eq('company_id', selectedCompanyId!)
        .maybeSingle();

      if (error) throw error;
      return data as OgCompanySettings | null;
    },
    enabled: !!selectedCompanyId && !isDemo,
  });
}

export function useUpdateOgCompanySettings() {
  const { selectedCompanyId } = useSelectedCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (updates: Partial<Omit<OgCompanySettings, 'company_id'>>) => {
      if (!selectedCompanyId) throw new Error('No company selected');

      const { data, error } = await supabase
        .from('og_company_settings')
        .upsert({
          company_id: selectedCompanyId,
          ...updates,
        }, { onConflict: 'company_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['og-company-settings', selectedCompanyId] });
      toast({ title: 'OG Settings Updated', description: 'Your OG image settings have been saved.' });
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update settings',
        variant: 'destructive',
      });
    },
  });
}
