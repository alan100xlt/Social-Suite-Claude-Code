import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'gradient-neon',
  name: 'Neon Gradient',
  category: 'gradient',
  tags: ['dark', 'neon', 'text-forward', 'cyberpunk'],
  requiresImage: false,

  layout: {
    archetype: 'text-forward',
    padding: 72,
    theme: 'dark',
  },

  background: {
    type: 'linear-gradient',
    colors: ['#0A0A0A', '#1A0030'],
    gradientAngle: 160,
  },

  title: {
    fontSize: 66,
    fontWeight: 700,
    fontFamily: 'sans',
    color: '#FFFFFF',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.1,
    maxLines: 4,
    textShadow: '0 0 40px rgba(0,255,136,0.3)',
    treatment: 'gradient-text',
  },

  sourceName: {
    style: 'monospace-path',
    position: 'above-title',
    fontSize: 16,
    fontWeight: 400,
    color: '#00FF88',
    letterSpacing: 2,
  },

  author: {
    position: 'below-title',
    fontSize: 18,
    fontWeight: 400,
    color: 'rgba(0,255,136,0.5)',
    prefix: '// ',
    letterSpacing: 1,
  },

  date: {
    position: 'below-author',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.3)',
    format: 'short',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 12,
    fontWeight: 700,
    color: '#00FF88',
    backgroundColor: 'rgba(0,255,136,0.1)',
    borderRadius: 0,
    padding: '4px 12px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-right',
    maxHeight: 28,
    margin: 40,
    background: 'none',
  },

  brandColorSlots: [],

  decorations: [
    {
      type: 'accent-bar',
      position: 'left-edge',
      width: 4,
      height: 200,
      color: '#00FF88',
      boxShadow: '0 0 20px rgba(0,255,136,0.5)',
    },
    {
      type: 'accent-dot',
      position: 'top-right-corner',
      width: 300,
      height: 300,
      color: 'rgba(139,92,246,0.15)',
      borderRadius: 150,
      boxShadow: '0 0 120px 60px rgba(139,92,246,0.2)',
    },
  ],

  behavior: {
    monospaceMeta: true,
  },
};

export default config;
