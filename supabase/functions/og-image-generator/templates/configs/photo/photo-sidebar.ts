import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'photo-sidebar',
  name: 'Photo Sidebar',
  category: 'photo',
  tags: ['dark', 'sidebar', 'overlay', 'accent'],
  requiresImage: true,

  layout: {
    archetype: 'split-lr',
    splitRatio: [5, 95],
    padding: 48,
    theme: 'dark',
  },

  background: {
    type: 'image-fullbleed',
    colors: [],
  },

  image: {
    position: 'right-panel',
    panelPercent: 95,
    overlay: { type: 'dark-gradient-bottom', opacity: 0.85 },
  },

  title: {
    fontSize: 44,
    fontWeight: 700,
    color: '#ffffff',
    alignment: 'left',
    verticalAlign: 'bottom',
    lineHeight: 1.2,
    maxLines: 3,
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'above-title',
    fontSize: 16,
    fontWeight: 700,
    color: 'brandColor',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-title',
    fontSize: 18,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.6)',
    prefix: 'By ',
  },

  date: {
    position: 'below-author',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.4)',
    format: 'short',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 13,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'brandColor',
    borderRadius: 4,
    padding: '4px 10px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-right',
    maxHeight: 28,
    margin: 32,
    background: 'frosted',
  },

  brandColorSlots: ['background', 'source-text', 'category-badge'],

  decorations: [
    {
      type: 'sidebar',
      position: 'left',
      width: 60,
      height: 630,
      color: 'brandColor',
    },
  ],
};

export default config;
