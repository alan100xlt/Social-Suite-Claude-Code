import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'photo-feature',
  name: 'Photo Feature',
  category: 'photo',
  tags: ['dark', 'feature', 'split', 'right-panel', 'serif'],
  requiresImage: true,

  layout: {
    archetype: 'split-lr',
    splitRatio: [45, 55],
    padding: [56, 0, 56, 56],
    theme: 'dark',
  },

  background: {
    type: 'solid',
    colors: ['#1a1a1a'],
  },

  image: {
    position: 'right-panel',
    panelPercent: 55,
    edgeBlend: { side: 'left', width: 100 },
  },

  title: {
    fontSize: 40,
    fontWeight: 700,
    fontFamily: 'serif',
    color: '#ffffff',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.2,
    maxLines: 4,
  },

  description: {
    fontSize: 18,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.55)',
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
    color: 'rgba(255,255,255,0.5)',
    prefix: 'By ',
  },

  logo: {
    position: 'top-left',
    maxHeight: 26,
    margin: 36,
    background: 'none',
  },

  brandColorSlots: ['source-text', 'accent-bar'],

  decorations: [
    {
      type: 'accent-bar',
      position: 'above-source',
      width: 32,
      height: 4,
      color: 'brandColor',
      borderRadius: 2,
    },
  ],
};

export default config;
