import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'stats-grid',
  name: 'Stats Grid',
  category: 'stats',
  tags: ['dark', 'data', 'grid', 'metrics'],
  requiresImage: false,

  layout: {
    archetype: 'split-tb',
    splitRatio: [35, 65],
    padding: 48,
    theme: 'dark',
  },

  background: {
    type: 'solid',
    colors: ['#0F172A'],
  },

  title: {
    fontSize: 40,
    fontWeight: 700,
    color: '#FFFFFF',
    alignment: 'left',
    verticalAlign: 'top',
    lineHeight: 1.2,
    maxLines: 2,
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'above-title',
    fontSize: 14,
    fontWeight: 700,
    color: 'brandColor',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-title',
    fontSize: 16,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.5)',
    prefix: 'By ',
  },

  date: {
    position: 'top-right',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.4)',
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
    position: 'top-right',
    maxHeight: 28,
    margin: 32,
    background: 'none',
  },

  brandColorSlots: ['source-text', 'stat-number', 'category-badge'],

  decorations: [
    {
      type: 'metric-grid',
      position: 'bottom-panel',
      color: '#1E293B',
      borderRadius: 16,
    },
  ],
};

export default config;
