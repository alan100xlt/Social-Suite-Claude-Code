import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'photo-spotlight',
  name: 'Photo Spotlight',
  category: 'photo',
  tags: ['dark', 'spotlight', 'vignette', 'dramatic'],
  requiresImage: true,

  layout: {
    archetype: 'fullbleed',
    padding: 72,
    theme: 'dark',
  },

  background: {
    type: 'image-fullbleed',
    colors: [],
  },

  image: {
    position: 'fullbleed',
    overlay: { type: 'vignette', opacity: 0.85 },
  },

  title: {
    fontSize: 48,
    fontWeight: 700,
    color: '#ffffff',
    alignment: 'center',
    verticalAlign: 'bottom',
    lineHeight: 1.15,
    maxLines: 3,
    textShadow: '0 2px 16px rgba(0,0,0,0.7)',
  },

  sourceName: {
    style: 'badge',
    position: 'top-left',
    fontSize: 16,
    fontWeight: 700,
    color: '#ffffff',
    badgeBg: 'brandColor',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 13,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.9)',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: '6px 16px',
    textTransform: 'uppercase',
  },

  date: {
    position: 'below-title',
    fontSize: 15,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.5)',
    format: 'relative',
  },

  logo: {
    position: 'top-right',
    maxHeight: 30,
    margin: 36,
    background: 'frosted',
  },

  brandColorSlots: ['badge-bg'],

  decorations: [],
};

export default config;
