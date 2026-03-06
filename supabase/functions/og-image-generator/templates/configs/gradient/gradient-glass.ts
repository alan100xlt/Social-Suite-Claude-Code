import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'gradient-glass',
  name: 'Glass Gradient',
  category: 'gradient',
  tags: ['dark', 'glass', 'card', 'glow'],
  requiresImage: false,

  layout: {
    archetype: 'card',
    padding: 60,
    theme: 'dark',
  },

  background: {
    type: 'linear-gradient',
    colors: ['#0F172A', '#1E293B', 'brandColor'],
    gradientAngle: 160,
  },

  title: {
    fontSize: 48,
    fontWeight: 700,
    color: '#FFFFFF',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.2,
    maxLines: 3,
  },

  description: {
    fontSize: 22,
    fontWeight: 400,
    color: 'rgba(255, 255, 255, 0.55)',
    lineHeight: 1.5,
    maxLines: 2,
    marginTop: 24,
  },

  sourceName: {
    style: 'subtle-text',
    position: 'below-title',
    fontSize: 18,
    fontWeight: 400,
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 1,
  },

  author: {
    position: 'below-description',
    fontSize: 18,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.4)',
    prefix: 'By ',
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
    fontSize: 13,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    padding: '4px 10px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-left',
    maxHeight: 28,
    margin: 32,
    background: 'none',
  },

  brandColorSlots: ['gradient-end', 'accent-dot'],

  decorations: [
    {
      type: 'accent-dot',
      position: 'card-top',
      width: 12,
      height: 12,
      color: 'brandColor',
      borderRadius: 6,
      boxShadow: '0 0 30px 10px rgba(139,92,246,0.4)',
    },
  ],

  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 24,
    border: '1px solid rgba(255, 255, 255, 0.12)',
    padding: 64,
    maxWidth: 1000,
  },
};

export default config;
