import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'photo-wide',
  name: 'Photo Wide',
  category: 'photo',
  tags: ['dark', 'wide', 'split-tb', 'immersive'],
  requiresImage: true,

  layout: {
    archetype: 'split-tb',
    splitRatio: [70, 30],
    padding: [0, 48, 0, 48],
    theme: 'dark',
  },

  background: {
    type: 'solid',
    colors: ['#0d0d0d'],
  },

  image: {
    position: 'top-panel',
    panelPercent: 70,
    edgeBlend: { side: 'bottom', width: 80 },
  },

  title: {
    fontSize: 36,
    fontWeight: 700,
    color: '#ffffff',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.2,
    maxLines: 2,
  },

  sourceName: {
    style: 'badge',
    position: 'above-title',
    fontSize: 14,
    fontWeight: 700,
    color: '#ffffff',
    badgeBg: 'brandColor',
  },

  date: {
    position: 'below-title',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.4)',
    format: 'short',
  },

  logo: {
    position: 'bottom-right',
    maxHeight: 24,
    margin: 28,
    background: 'none',
  },

  brandColorSlots: ['badge-bg'],

  decorations: [],
};

export default config;
