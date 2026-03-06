import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'editorial-review',
  name: 'Editorial Review',
  category: 'editorial',
  tags: ['dark', 'review', 'fullbleed', 'photo', 'cinematic'],
  requiresImage: true,

  layout: {
    archetype: 'fullbleed',
    padding: [60, 72, 72, 72],
    theme: 'dark',
  },

  background: {
    type: 'solid',
    colors: ['#0A0A0A'],
  },

  image: {
    position: 'fullbleed',
    overlay: { type: 'dark-gradient-bottom', opacity: 0.85 },
    filter: 'saturate(1.1)',
  },

  title: {
    fontSize: 50,
    fontWeight: 700,
    fontFamily: 'serif',
    color: '#FFFFFF',
    alignment: 'left',
    verticalAlign: 'bottom',
    lineHeight: 1.2,
    maxLines: 3,
    textShadow: '0 2px 12px rgba(0,0,0,0.4)',
  },

  description: {
    fontSize: 18,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 1.5,
    maxLines: 2,
    marginTop: 16,
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'above-title',
    fontSize: 13,
    fontWeight: 700,
    color: 'brandColor',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-title',
    fontSize: 16,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.6)',
    prefix: 'Reviewed by ',
  },

  date: {
    position: 'below-author',
    fontSize: 13,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.35)',
    format: 'long',
  },

  categoryTag: {
    position: 'top-right',
    fontSize: 11,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'brandColor',
    borderRadius: 4,
    padding: '4px 12px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-left',
    maxHeight: 28,
    margin: 36,
    background: 'frosted',
  },

  brandColorSlots: ['source-text', 'category-badge', 'accent-bar'],

  decorations: [
    {
      type: 'accent-bar',
      position: 'bottom',
      width: 1200,
      height: 4,
      color: 'brandColor',
    },
    {
      type: 'star-rating',
      position: 'above-title',
      width: 120,
      height: 24,
      color: 'brandColor',
    },
  ],
};

export default config;
