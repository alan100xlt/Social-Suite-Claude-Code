import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'gradient-warm',
  name: 'Warm Gradient',
  category: 'gradient',
  tags: ['warm', 'text-forward', 'cozy', 'amber'],
  requiresImage: false,

  layout: {
    archetype: 'text-forward',
    padding: 80,
    theme: 'dark',
  },

  background: {
    type: 'linear-gradient',
    colors: ['#92400E', '#78350F', '#451A03'],
    gradientAngle: 160,
  },

  title: {
    fontSize: 60,
    fontWeight: 700,
    fontFamily: 'serif',
    color: '#FEF3C7',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.2,
    maxLines: 4,
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'above-title',
    fontSize: 14,
    fontWeight: 700,
    color: '#FBBF24',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-title',
    fontSize: 18,
    fontWeight: 400,
    color: 'rgba(254,243,199,0.6)',
    prefix: 'By ',
  },

  date: {
    position: 'below-author',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(254,243,199,0.4)',
    format: 'short',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 13,
    fontWeight: 700,
    color: '#451A03',
    backgroundColor: '#FBBF24',
    borderRadius: 4,
    padding: '4px 12px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'bottom-left',
    maxHeight: 28,
    margin: 40,
    background: 'none',
  },

  brandColorSlots: [],

  decorations: [
    {
      type: 'accent-bar',
      position: 'left-edge',
      width: 6,
      height: 160,
      color: '#FBBF24',
      borderRadius: 3,
    },
  ],
};

export default config;
