import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'photo-frame',
  name: 'Photo Frame',
  category: 'photo',
  tags: ['light', 'clean', 'framed', 'minimal'],
  requiresImage: true,

  layout: {
    archetype: 'split-tb',
    splitRatio: [67, 33],
    padding: 32,
    theme: 'light',
  },

  background: {
    type: 'solid',
    colors: ['#ffffff'],
  },

  image: {
    position: 'top-panel',
    panelPercent: 67,
    borderRadius: 12,
  },

  title: {
    fontSize: 32,
    fontWeight: 700,
    color: '#111111',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.25,
    maxLines: 2,
  },

  sourceName: {
    style: 'subtle-text',
    position: 'below-title',
    fontSize: 18,
    fontWeight: 400,
    color: '#888888',
  },

  author: {
    position: 'below-title',
    fontSize: 16,
    fontWeight: 400,
    color: '#888888',
    prefix: 'By ',
  },

  date: {
    position: 'inline-with-author',
    fontSize: 14,
    fontWeight: 400,
    color: '#aaaaaa',
    format: 'short',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 12,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'brandColor',
    borderRadius: 4,
    padding: '3px 8px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'bottom-right',
    maxHeight: 28,
    margin: 32,
    background: 'none',
  },

  brandColorSlots: ['accent-dot', 'category-badge'],

  decorations: [
    {
      type: 'accent-dot',
      position: 'left-of-title',
      width: 12,
      height: 12,
      color: 'brandColor',
      borderRadius: 6,
    },
  ],
};

export default config;
