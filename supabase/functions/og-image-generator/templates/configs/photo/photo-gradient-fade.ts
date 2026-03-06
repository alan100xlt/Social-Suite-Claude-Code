import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'photo-gradient-fade',
  name: 'Photo Gradient Fade',
  category: 'photo',
  tags: ['dark', 'gradient', 'fade', 'edge-blend'],
  requiresImage: true,

  layout: {
    archetype: 'split-lr',
    splitRatio: [55, 45],
    padding: [60, 48, 60, 0],
    theme: 'dark',
  },

  background: {
    type: 'solid',
    colors: ['#111111'],
  },

  image: {
    position: 'left-panel',
    panelPercent: 55,
    edgeBlend: { side: 'right', width: 150 },
  },

  title: {
    fontSize: 36,
    fontWeight: 700,
    color: '#ffffff',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.25,
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
    fontSize: 13,
    fontWeight: 700,
    color: 'brandColor',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-description',
    fontSize: 16,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.5)',
    prefix: 'By ',
  },

  logo: {
    position: 'top-right',
    maxHeight: 26,
    margin: 32,
    background: 'none',
  },

  brandColorSlots: ['source-text'],

  decorations: [],
};

export default config;
