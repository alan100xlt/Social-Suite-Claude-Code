import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'gradient-startup',
  name: 'Startup Gradient',
  category: 'gradient',
  tags: ['dark', 'tech', 'card', 'gradient-border'],
  requiresImage: false,

  layout: {
    archetype: 'card',
    padding: 40,
    theme: 'dark',
  },

  background: {
    type: 'solid',
    colors: ['#0A0A0A'],
  },

  title: {
    fontSize: 50,
    fontWeight: 700,
    color: '#F1F5F9',
    alignment: 'left',
    verticalAlign: 'top',
    lineHeight: 1.2,
    maxLines: 4,
  },

  sourceName: {
    style: 'monospace-path',
    position: 'bottom-bar',
    fontSize: 18,
    fontWeight: 400,
    color: '#64748B',
    letterSpacing: 2,
  },

  author: {
    position: 'below-title',
    fontSize: 18,
    fontWeight: 400,
    color: '#64748B',
    prefix: 'By ',
  },

  date: {
    position: 'bottom-bar',
    fontSize: 16,
    fontWeight: 400,
    color: '#475569',
    format: 'short',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 12,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'brandColor',
    borderRadius: 4,
    padding: '3px 10px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-left',
    maxHeight: 28,
    margin: 32,
    background: 'none',
  },

  brandColorSlots: ['card-border', 'accent-bar', 'category-badge'],

  decorations: [
    {
      type: 'accent-bar',
      position: 'card-top',
      width: 80,
      height: 4,
      color: 'brandColor',
      borderRadius: 2,
      gradient: 'linear-gradient(90deg, brandColor, #8B5CF6)',
    },
  ],

  card: {
    backgroundColor: '#0A0A0A',
    borderRadius: 18,
    padding: 64,
    gradientBorder: {
      colors: ['brandColor', '#8B5CF6'],
      angle: 135,
      width: 2,
    },
  },

  behavior: {
    monospaceMeta: true,
  },
};

export default config;
