import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
}

/** Static template list for the UI dropdown */
export const OG_TEMPLATES: OgTemplateInfo[] = [
  // Photo
  { id: 'photo-hero', name: 'Photo Hero', category: 'photo', requiresImage: true },
  { id: 'photo-glass', name: 'Photo Glass', category: 'photo', requiresImage: true },
  { id: 'photo-caption', name: 'Photo Caption', category: 'photo', requiresImage: true },
  { id: 'photo-split', name: 'Photo Split', category: 'photo', requiresImage: true },
  { id: 'photo-duotone', name: 'Photo Duotone', category: 'photo', requiresImage: true },
  { id: 'photo-frame', name: 'Photo Frame', category: 'photo', requiresImage: true },
  { id: 'photo-sidebar', name: 'Photo Sidebar', category: 'photo', requiresImage: true },
  // Gradient
  { id: 'gradient-clean', name: 'Gradient Clean', category: 'gradient', requiresImage: false },
  { id: 'gradient-modern', name: 'Gradient Modern', category: 'gradient', requiresImage: false },
  { id: 'gradient-bold', name: 'Gradient Bold', category: 'gradient', requiresImage: false },
  { id: 'gradient-minimal', name: 'Gradient Minimal', category: 'gradient', requiresImage: false },
  { id: 'gradient-glass', name: 'Gradient Glass', category: 'gradient', requiresImage: false },
  { id: 'gradient-startup', name: 'Gradient Startup', category: 'gradient', requiresImage: false },
  // News
  { id: 'news-banner', name: 'News Banner', category: 'news', requiresImage: false },
  { id: 'news-photo-banner', name: 'News Photo Banner', category: 'news', requiresImage: true },
  { id: 'news-ticker', name: 'News Ticker', category: 'news', requiresImage: false },
  // Stats
  { id: 'stats-bars', name: 'Stats Bars', category: 'stats', requiresImage: false },
  { id: 'stats-card', name: 'Stats Card', category: 'stats', requiresImage: false },
  { id: 'stats-grid', name: 'Stats Grid', category: 'stats', requiresImage: false },
  // Editorial
  { id: 'quote-classic', name: 'Quote Classic', category: 'editorial', requiresImage: false },
  { id: 'quote-highlight', name: 'Quote Highlight', category: 'editorial', requiresImage: false },
  { id: 'editorial-magazine', name: 'Editorial Magazine', category: 'editorial', requiresImage: false },
  { id: 'photo-quote', name: 'Photo Quote', category: 'editorial', requiresImage: true },
  // Brand
  { id: 'brand-minimal', name: 'Brand Minimal', category: 'brand', requiresImage: false },
  { id: 'brand-announce', name: 'Brand Announce', category: 'brand', requiresImage: false },
  { id: 'brand-code', name: 'Brand Code', category: 'brand', requiresImage: false },
  { id: 'brand-event', name: 'Brand Event', category: 'brand', requiresImage: false },
];
