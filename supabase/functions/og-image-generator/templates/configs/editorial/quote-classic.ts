import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'quote-classic',
  name: 'Quote Classic',
  category: 'editorial',
  tags: ['light', 'quote', 'serif', 'centered', 'elegant'],
  requiresImage: false,

  layout: {
    archetype: 'centered',
    padding: 80,
    theme: 'light',
  },

  background: {
    type: 'solid',
    colors: ['#FAFAF9'],
  },

  title: {
    fontSize: 42,
    fontWeight: 400,
    color: '#1C1917',
    alignment: 'center',
    verticalAlign: 'center',
    lineHeight: 1.4,
    maxLines: 4,
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'below-title',
    fontSize: 18,
    fontWeight: 700,
    color: '#78716C',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-title',
    fontSize: 20,
    fontWeight: 700,
    color: '#78716C',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  date: {
    position: 'below-author',
    fontSize: 14,
    fontWeight: 400,
    color: '#A8A29E',
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
    position: 'bottom-right',
    maxHeight: 28,
    margin: 40,
    background: 'none',
  },

  brandColorSlots: ['quote-mark', 'divider', 'category-badge'],

  decorations: [
    {
      type: 'quote-marks',
      position: 'above-title',
      height: 160,
      color: 'brandColor',
    },
    {
      type: 'divider',
      position: 'below-title',
      width: 60,
      height: 3,
      color: 'brandColor',
      borderRadius: 2,
    },
  ],
};

export default config;
