import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'gradient-midnight',
  name: 'Midnight Gradient',
  category: 'gradient',
  tags: ['dark', 'midnight', 'text-forward', 'elegant'],
  requiresImage: false,

  layout: {
    archetype: 'text-forward',
    padding: [80, 80, 80, 80],
    theme: 'dark',
  },

  background: {
    type: 'linear-gradient',
    colors: ['#0F0C29', '#302B63', '#24243E'],
    gradientAngle: 135,
  },

  title: {
    fontSize: 58,
    fontWeight: 700,
    fontFamily: 'serif',
    color: '#F8FAFC',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.2,
    maxLines: 4,
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'above-title',
    fontSize: 14,
    fontWeight: 600,
    color: 'rgba(248,250,252,0.5)',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-title',
    fontSize: 18,
    fontWeight: 400,
    color: 'rgba(248,250,252,0.5)',
    prefix: 'By ',
    letterSpacing: 1,
  },

  date: {
    position: 'below-author',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(248,250,252,0.3)',
    format: 'long',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 12,
    fontWeight: 700,
    color: '#C4B5FD',
    backgroundColor: 'rgba(196,181,253,0.1)',
    borderRadius: 4,
    padding: '4px 12px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'bottom-right',
    maxHeight: 28,
    margin: 40,
    background: 'frosted',
  },

  brandColorSlots: [],

  decorations: [
    {
      type: 'divider',
      position: 'above-author',
      width: 60,
      height: 2,
      color: 'rgba(196,181,253,0.4)',
      borderRadius: 1,
    },
  ],
};

export default config;
