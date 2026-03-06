import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'gradient-electric',
  name: 'Electric Gradient',
  category: 'gradient',
  tags: ['dark', 'electric', 'text-forward', 'energetic'],
  requiresImage: false,

  layout: {
    archetype: 'text-forward',
    padding: 80,
    theme: 'dark',
  },

  background: {
    type: 'linear-gradient',
    colors: ['#7C3AED', '#2563EB'],
    gradientAngle: 120,
  },

  title: {
    fontSize: 68,
    fontWeight: 800,
    fontFamily: 'sans',
    color: '#FFFFFF',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.05,
    maxLines: 4,
  },

  sourceName: {
    style: 'badge',
    position: 'above-title',
    fontSize: 15,
    fontWeight: 700,
    color: '#FFFFFF',
    badgeBg: 'rgba(0,0,0,0.2)',
  },

  author: {
    position: 'below-title',
    fontSize: 20,
    fontWeight: 500,
    color: 'rgba(255,255,255,0.8)',
    prefix: 'By ',
  },

  date: {
    position: 'below-author',
    fontSize: 16,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.5)',
    format: 'short',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 14,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 6,
    padding: '5px 14px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'bottom-right',
    maxHeight: 32,
    margin: 40,
    background: 'white-pill',
  },

  brandColorSlots: [],

  decorations: [
    {
      type: 'accent-dot',
      position: 'top-left-corner',
      width: 250,
      height: 250,
      color: 'rgba(255,255,255,0.06)',
      borderRadius: 125,
    },
    {
      type: 'accent-dot',
      position: 'bottom-right-corner',
      width: 350,
      height: 350,
      color: 'rgba(0,0,0,0.1)',
      borderRadius: 175,
    },
  ],
};

export default config;
