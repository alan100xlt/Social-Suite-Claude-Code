import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'gradient-sunset',
  name: 'Sunset Gradient',
  category: 'gradient',
  tags: ['warm', 'vibrant', 'text-forward', 'sunset'],
  requiresImage: false,

  layout: {
    archetype: 'text-forward',
    padding: 72,
    theme: 'dark',
  },

  background: {
    type: 'linear-gradient',
    colors: ['#FF6B35', '#F7418F', '#5D3FD3'],
    gradientAngle: 135,
  },

  title: {
    fontSize: 64,
    fontWeight: 700,
    fontFamily: 'sans',
    color: '#FFFFFF',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.15,
    maxLines: 4,
    textShadow: '0 2px 20px rgba(0,0,0,0.3)',
  },

  description: {
    fontSize: 24,
    fontWeight: 400,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 1.5,
    maxLines: 2,
    marginTop: 20,
  },

  sourceName: {
    style: 'badge',
    position: 'above-title',
    fontSize: 16,
    fontWeight: 700,
    color: '#FFFFFF',
    badgeBg: 'rgba(0,0,0,0.25)',
  },

  author: {
    position: 'below-title',
    fontSize: 20,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.75)',
    prefix: 'By ',
  },

  date: {
    position: 'below-author',
    fontSize: 16,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.5)',
    format: 'relative',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 13,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    padding: '4px 14px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-right',
    maxHeight: 32,
    margin: 40,
    background: 'white-pill',
  },

  brandColorSlots: [],

  decorations: [
    {
      type: 'accent-bar',
      position: 'below-title',
      width: 60,
      height: 4,
      color: 'rgba(255,255,255,0.6)',
      borderRadius: 2,
    },
  ],
};

export default config;
