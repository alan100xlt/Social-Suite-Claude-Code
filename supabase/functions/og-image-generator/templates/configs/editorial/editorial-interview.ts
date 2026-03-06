import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'editorial-interview',
  name: 'Editorial Interview',
  category: 'editorial',
  tags: ['dark', 'interview', 'split', 'photo', 'serif', 'conversation'],
  requiresImage: true,

  layout: {
    archetype: 'split-lr',
    splitRatio: [45, 55],
    padding: [0, 60, 0, 0],
    theme: 'dark',
  },

  background: {
    type: 'solid',
    colors: ['#18181B'],
  },

  image: {
    position: 'left-panel',
    panelPercent: 45,
    overlay: { type: 'vignette', opacity: 0.4 },
    filter: 'grayscale(0.3) contrast(1.05)',
    edgeBlend: { side: 'right', width: 80 },
  },

  title: {
    fontSize: 40,
    fontWeight: 400,
    fontFamily: 'serif',
    color: '#FAFAFA',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.35,
    maxLines: 4,
    treatment: 'highlight-segments',
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'above-title',
    fontSize: 12,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-title',
    fontSize: 17,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
  },

  date: {
    position: 'below-author',
    fontSize: 13,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.3)',
    format: 'short',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 11,
    fontWeight: 700,
    color: '#18181B',
    backgroundColor: 'brandColor',
    borderRadius: 3,
    padding: '3px 10px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-right',
    maxHeight: 26,
    margin: 36,
    background: 'frosted',
  },

  brandColorSlots: ['highlight-bg', 'category-badge', 'quote-mark'],

  decorations: [
    {
      type: 'quote-marks',
      position: 'above-title',
      height: 100,
      color: 'brandColor',
      opacity: 0.4,
    },
    {
      type: 'divider',
      position: 'below-title',
      width: 28,
      height: 2,
      color: 'rgba(255,255,255,0.2)',
      borderRadius: 1,
    },
  ],

  staticLabels: [
    {
      text: 'Interview',
      position: 'bottom-right',
      fontSize: 11,
      fontWeight: 600,
      color: 'rgba(255,255,255,0.2)',
      textTransform: 'uppercase',
    },
  ],
};

export default config;
