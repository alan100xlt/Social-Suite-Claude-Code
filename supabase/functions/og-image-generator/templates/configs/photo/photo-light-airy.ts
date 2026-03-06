import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'photo-light-airy',
  name: 'Photo Light Airy',
  category: 'photo',
  tags: ['light', 'airy', 'soft', 'pastel', 'rounded'],
  requiresImage: true,

  layout: {
    archetype: 'split-lr',
    splitRatio: [50, 50],
    padding: [40, 48, 40, 48],
    theme: 'light',
  },

  background: {
    type: 'linear-gradient',
    colors: ['#f8f6f3', '#eee9e2'],
    gradientAngle: 180,
  },

  image: {
    position: 'left-panel',
    panelPercent: 50,
    borderRadius: 16,
  },

  title: {
    fontSize: 32,
    fontWeight: 600,
    color: '#2d2d2d',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.35,
    maxLines: 4,
  },

  description: {
    fontSize: 17,
    fontWeight: 400,
    color: '#888888',
    lineHeight: 1.5,
    maxLines: 2,
    marginTop: 14,
  },

  sourceName: {
    style: 'subtle-text',
    position: 'above-title',
    fontSize: 14,
    fontWeight: 500,
    color: '#bbbbbb',
  },

  author: {
    position: 'below-description',
    fontSize: 14,
    fontWeight: 500,
    color: '#999999',
    prefix: 'By ',
  },

  logo: {
    position: 'top-right',
    maxHeight: 22,
    margin: 32,
    background: 'none',
  },

  brandColorSlots: ['accent-dot'],

  decorations: [
    {
      type: 'accent-dot',
      position: 'above-title',
      width: 10,
      height: 10,
      color: 'brandColor',
      borderRadius: 5,
    },
  ],
};

export default config;
