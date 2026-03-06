import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'stats-metric',
  name: 'Stats Metric',
  category: 'stats',
  tags: ['dark', 'data', 'special', 'single-metric', 'hero-number'],
  requiresImage: false,

  layout: {
    archetype: 'special',
    padding: 60,
    theme: 'dark',
  },

  background: {
    type: 'radial-gradient',
    colors: ['#1E293B', '#0F172A'],
  },

  title: {
    fontSize: 32,
    fontWeight: 600,
    fontFamily: 'sans',
    color: '#94A3B8',
    alignment: 'center',
    verticalAlign: 'bottom',
    lineHeight: 1.3,
    maxLines: 2,
  },

  sourceName: {
    style: 'subtle-text',
    position: 'above-title',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(148,163,184,0.5)',
    letterSpacing: 1,
  },

  author: {
    position: 'below-title',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(148,163,184,0.4)',
    prefix: 'By ',
  },

  date: {
    position: 'bottom-bar',
    fontSize: 13,
    fontWeight: 400,
    color: 'rgba(148,163,184,0.3)',
    format: 'short',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 11,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'brandColor',
    borderRadius: 20,
    padding: '3px 10px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-left',
    maxHeight: 24,
    margin: 32,
    background: 'none',
  },

  brandColorSlots: ['stat-number', 'category-badge', 'accent-dot'],

  decorations: [
    {
      type: 'hero-number',
      position: 'center',
      color: 'brandColor',
      opacity: 1,
    },
    {
      type: 'accent-dot',
      position: 'below-number',
      width: 80,
      height: 4,
      color: 'brandColor',
      borderRadius: 2,
      opacity: 0.6,
    },
    {
      type: 'trend-arrow',
      position: 'center-right',
      color: '#22C55E',
      opacity: 0.8,
    },
  ],
};

export default config;
