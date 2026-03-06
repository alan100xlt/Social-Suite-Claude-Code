import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'gradient-ember',
  name: 'Ember Gradient',
  category: 'gradient',
  tags: ['dark', 'hot', 'text-forward', 'fire'],
  requiresImage: false,

  layout: {
    archetype: 'text-forward',
    padding: 72,
    theme: 'dark',
  },

  background: {
    type: 'radial-gradient',
    colors: ['#7F1D1D', '#1C1917', '#0A0A0A'],
  },

  title: {
    fontSize: 62,
    fontWeight: 800,
    fontFamily: 'sans',
    color: '#FEF2F2',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.1,
    maxLines: 4,
  },

  sourceName: {
    style: 'badge',
    position: 'above-title',
    fontSize: 14,
    fontWeight: 700,
    color: '#FEF2F2',
    badgeBg: 'rgba(239,68,68,0.3)',
  },

  author: {
    position: 'below-title',
    fontSize: 18,
    fontWeight: 400,
    color: 'rgba(254,242,242,0.5)',
    prefix: 'By ',
  },

  date: {
    position: 'below-author',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(254,242,242,0.3)',
    format: 'relative',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 13,
    fontWeight: 700,
    color: '#FEF2F2',
    backgroundColor: 'rgba(239,68,68,0.4)',
    borderRadius: 4,
    padding: '4px 12px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-left',
    maxHeight: 28,
    margin: 40,
    background: 'none',
  },

  brandColorSlots: [],

  decorations: [
    {
      type: 'accent-bar',
      position: 'bottom-edge',
      width: 1200,
      height: 4,
      gradient: 'linear-gradient(90deg, #EF4444, #F97316, #EAB308)',
    },
  ],
};

export default config;
