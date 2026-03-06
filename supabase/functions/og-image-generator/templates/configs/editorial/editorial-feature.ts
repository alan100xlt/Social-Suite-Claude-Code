import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'editorial-feature',
  name: 'Editorial Feature',
  category: 'editorial',
  tags: ['dark', 'feature', 'split', 'photo', 'serif', 'premium'],
  requiresImage: true,

  layout: {
    archetype: 'split-lr',
    splitRatio: [55, 45],
    padding: [0, 64, 0, 0],
    theme: 'dark',
  },

  background: {
    type: 'solid',
    colors: ['#0F0E13'],
  },

  image: {
    position: 'left-panel',
    panelPercent: 55,
    overlay: { type: 'dark-gradient-radial', opacity: 0.3 },
    edgeBlend: { side: 'right', width: 120 },
  },

  title: {
    fontSize: 44,
    fontWeight: 700,
    fontFamily: 'serif',
    color: '#FAFAFA',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.25,
    maxLines: 4,
  },

  description: {
    fontSize: 17,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 1.55,
    maxLines: 3,
    marginTop: 20,
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'above-title',
    fontSize: 12,
    fontWeight: 700,
    color: 'brandColor',
    letterSpacing: 5,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-title',
    fontSize: 15,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.45)',
    prefix: 'By ',
  },

  date: {
    position: 'below-author',
    fontSize: 13,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.25)',
    format: 'long',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 11,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'brandColor',
    borderRadius: 3,
    padding: '3px 10px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-right',
    maxHeight: 26,
    margin: 36,
    background: 'frosted',
  },

  brandColorSlots: ['source-text', 'category-badge', 'divider'],

  decorations: [
    {
      type: 'divider',
      position: 'below-title',
      width: 36,
      height: 2,
      color: 'brandColor',
      borderRadius: 1,
    },
    {
      type: 'rule',
      position: 'top',
      width: 1200,
      height: 1,
      color: 'rgba(255,255,255,0.08)',
    },
  ],

  staticLabels: [
    {
      text: 'Feature',
      position: 'bottom-right',
      fontSize: 11,
      fontWeight: 600,
      color: 'rgba(255,255,255,0.25)',
      textTransform: 'uppercase',
    },
  ],
};

export default config;
