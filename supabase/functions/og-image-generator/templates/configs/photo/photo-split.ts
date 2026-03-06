import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'photo-split',
  name: 'Photo Split',
  category: 'photo',
  tags: ['dark', 'split', 'accent'],
  requiresImage: true,

  layout: {
    archetype: 'split-lr',
    splitRatio: [50, 50],
    padding: [0, 48, 0, 48],
    theme: 'dark',
  },

  background: {
    type: 'solid',
    colors: ['#0f0f0f'],
  },

  image: {
    position: 'left-panel',
    panelPercent: 50,
  },

  title: {
    fontSize: 38,
    fontWeight: 700,
    color: '#ffffff',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.25,
    maxLines: 5,
  },

  description: {
    fontSize: 20,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 1.5,
    maxLines: 3,
    marginTop: 24,
  },

  sourceName: {
    style: 'subtle-text',
    position: 'below-title',
    fontSize: 16,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.5)',
  },

  author: {
    position: 'below-description',
    fontSize: 18,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.5)',
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
    position: 'bottom-right',
    maxHeight: 28,
    margin: 32,
    background: 'none',
  },

  brandColorSlots: ['accent-bar', 'category-badge'],

  decorations: [
    {
      type: 'accent-bar',
      position: 'left-edge',
      width: 6,
      height: 630,
      color: 'brandColor',
    },
  ],
};

export default config;
