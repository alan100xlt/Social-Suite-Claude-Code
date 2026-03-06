import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'photo-strip',
  name: 'Photo Strip',
  category: 'photo',
  tags: ['dark', 'strip', 'banner', 'compact'],
  requiresImage: true,

  layout: {
    archetype: 'banner',
    padding: [0, 48, 0, 48],
    theme: 'dark',
  },

  background: {
    type: 'solid',
    colors: ['#141414'],
  },

  image: {
    position: 'top-panel',
    panelPercent: 45,
    borderRadius: 0,
  },

  title: {
    fontSize: 38,
    fontWeight: 700,
    color: '#ffffff',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.2,
    maxLines: 3,
  },

  sourceName: {
    style: 'monospace-path',
    position: 'above-title',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.4)',
  },

  author: {
    position: 'below-title',
    fontSize: 16,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.5)',
    prefix: 'By ',
  },

  date: {
    position: 'inline-with-author',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.3)',
    format: 'short',
  },

  logo: {
    position: 'bottom-right',
    maxHeight: 24,
    margin: 28,
    background: 'none',
  },

  brandColorSlots: ['accent-bar'],

  decorations: [
    {
      type: 'accent-bar',
      position: 'image-bottom-edge',
      width: 1200,
      height: 3,
      color: 'brandColor',
    },
  ],
};

export default config;
