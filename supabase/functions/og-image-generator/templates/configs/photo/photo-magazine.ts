import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'photo-magazine',
  name: 'Photo Magazine',
  category: 'photo',
  tags: ['light', 'editorial', 'magazine', 'serif'],
  requiresImage: true,

  layout: {
    archetype: 'split-lr',
    splitRatio: [55, 45],
    padding: [48, 48, 48, 48],
    theme: 'light',
  },

  background: {
    type: 'solid',
    colors: ['#fafafa'],
  },

  image: {
    position: 'left-panel',
    panelPercent: 55,
    borderRadius: 0,
  },

  title: {
    fontSize: 36,
    fontWeight: 700,
    fontFamily: 'serif',
    color: '#1a1a1a',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.25,
    maxLines: 4,
  },

  description: {
    fontSize: 18,
    fontWeight: 400,
    color: '#666666',
    lineHeight: 1.5,
    maxLines: 3,
    marginTop: 20,
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'above-title',
    fontSize: 12,
    fontWeight: 700,
    color: 'brandColor',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-description',
    fontSize: 15,
    fontWeight: 500,
    color: '#444444',
    prefix: 'By ',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  date: {
    position: 'below-author',
    fontSize: 13,
    fontWeight: 400,
    color: '#999999',
    format: 'long',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 11,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'brandColor',
    borderRadius: 2,
    padding: '3px 8px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'bottom-right',
    maxHeight: 24,
    margin: 32,
    background: 'none',
  },

  brandColorSlots: ['source-text', 'category-badge', 'divider'],

  decorations: [
    {
      type: 'divider',
      position: 'below-source',
      width: 40,
      height: 2,
      color: 'brandColor',
    },
  ],
};

export default config;
