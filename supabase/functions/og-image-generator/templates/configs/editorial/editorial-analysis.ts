import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'editorial-analysis',
  name: 'Editorial Analysis',
  category: 'editorial',
  tags: ['dark', 'analysis', 'fullbleed', 'photo', 'data', 'investigative'],
  requiresImage: true,

  layout: {
    archetype: 'fullbleed',
    padding: [60, 80, 80, 80],
    theme: 'dark',
  },

  background: {
    type: 'solid',
    colors: ['#0D0D12'],
  },

  image: {
    position: 'fullbleed',
    overlay: { type: 'dark-gradient-top', opacity: 0.7 },
    filter: 'saturate(0.8) brightness(0.9)',
  },

  title: {
    fontSize: 46,
    fontWeight: 700,
    fontFamily: 'serif',
    color: '#FFFFFF',
    alignment: 'left',
    verticalAlign: 'bottom',
    lineHeight: 1.2,
    maxLines: 3,
    treatment: 'highlight-segments',
    textShadow: '0 1px 8px rgba(0,0,0,0.3)',
  },

  description: {
    fontSize: 17,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 1.5,
    maxLines: 2,
    marginTop: 16,
  },

  sourceName: {
    style: 'inline-banner',
    position: 'above-title',
    fontSize: 13,
    fontWeight: 700,
    color: '#ffffff',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-title',
    fontSize: 15,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.5)',
    prefix: 'Analysis by ',
  },

  date: {
    position: 'below-author',
    fontSize: 13,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.3)',
    format: 'short',
  },

  categoryTag: {
    position: 'top-left',
    fontSize: 11,
    fontWeight: 700,
    color: '#0D0D12',
    backgroundColor: 'brandColor',
    borderRadius: 3,
    padding: '4px 12px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-right',
    maxHeight: 26,
    margin: 36,
    background: 'frosted',
  },

  brandColorSlots: ['highlight-bg', 'category-badge', 'banner-bg'],

  decorations: [
    {
      type: 'data-lines',
      position: 'top-right',
      width: 300,
      height: 200,
      color: 'brandColor',
      opacity: 0.12,
    },
    {
      type: 'accent-bar',
      position: 'top',
      width: 1200,
      height: 3,
      color: 'brandColor',
    },
  ],

  staticLabels: [
    {
      text: 'Analysis',
      position: 'top-left-below-logo',
      fontSize: 11,
      fontWeight: 700,
      color: 'brandColor',
      textTransform: 'uppercase',
    },
  ],

  behavior: {
    categoryColorCoded: true,
  },
};

export default config;
