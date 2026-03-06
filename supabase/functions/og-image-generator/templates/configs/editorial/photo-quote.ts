import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'photo-quote',
  name: 'Photo Quote',
  category: 'editorial',
  tags: ['dark', 'quote', 'photo', 'split'],
  requiresImage: true,

  layout: {
    archetype: 'split-lr',
    splitRatio: [40, 60],
    padding: [0, 56, 0, 0],
    theme: 'dark',
  },

  background: {
    type: 'solid',
    colors: ['#1C1917'],
  },

  image: {
    position: 'left-panel',
    panelPercent: 40,
    edgeBlend: { side: 'right', width: 100 },
  },

  title: {
    fontSize: 38,
    fontWeight: 400,
    color: '#FAFAF9',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.4,
    maxLines: 4,
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'below-title',
    fontSize: 16,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-title',
    fontSize: 18,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  date: {
    position: 'below-author',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.3)',
    format: 'short',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 12,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'brandColor',
    borderRadius: 4,
    padding: '3px 10px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-right',
    maxHeight: 28,
    margin: 32,
    background: 'frosted',
  },

  brandColorSlots: ['quote-mark', 'divider', 'category-badge'],

  decorations: [
    {
      type: 'quote-marks',
      position: 'above-title',
      height: 140,
      color: 'brandColor',
    },
    {
      type: 'divider',
      position: 'below-title',
      width: 32,
      height: 2,
      color: 'brandColor',
    },
  ],
};

export default config;
