import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'stats-dashboard',
  name: 'Stats Dashboard',
  category: 'stats',
  tags: ['dark', 'data', 'special', 'dashboard', 'multi-metric'],
  requiresImage: false,

  layout: {
    archetype: 'special',
    padding: 48,
    theme: 'dark',
  },

  background: {
    type: 'linear-gradient',
    colors: ['#0F172A', '#1E293B'],
    gradientAngle: 180,
  },

  title: {
    fontSize: 36,
    fontWeight: 700,
    fontFamily: 'sans',
    color: '#F1F5F9',
    alignment: 'left',
    verticalAlign: 'top',
    lineHeight: 1.2,
    maxLines: 2,
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'above-title',
    fontSize: 13,
    fontWeight: 700,
    color: 'brandColor',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-title',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(241,245,249,0.4)',
    prefix: 'By ',
  },

  date: {
    position: 'top-right',
    fontSize: 13,
    fontWeight: 400,
    color: 'rgba(241,245,249,0.35)',
    format: 'short',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 11,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'brandColor',
    borderRadius: 4,
    padding: '3px 8px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-right',
    maxHeight: 24,
    margin: 32,
    background: 'none',
  },

  brandColorSlots: ['source-text', 'stat-number', 'category-badge', 'accent-bar'],

  decorations: [
    {
      type: 'metric-grid',
      position: 'bottom-panel',
      color: '#1E293B',
      borderRadius: 12,
    },
    {
      type: 'accent-bar',
      position: 'below-title',
      width: 60,
      height: 3,
      color: 'brandColor',
      borderRadius: 2,
    },
    {
      type: 'mini-chart',
      position: 'bottom-right',
      color: 'brandColor',
      opacity: 0.3,
    },
  ],
};

export default config;
