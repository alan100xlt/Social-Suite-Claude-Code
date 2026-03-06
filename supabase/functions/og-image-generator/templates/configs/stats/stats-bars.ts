import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'stats-bars',
  name: 'Stats Bars',
  category: 'stats',
  tags: ['dark', 'data', 'chart', 'split'],
  requiresImage: false,

  layout: {
    archetype: 'split-lr',
    splitRatio: [55, 45],
    padding: 60,
    theme: 'dark',
  },

  background: {
    type: 'solid',
    colors: ['#0F172A'],
  },

  title: {
    fontSize: 48,
    fontWeight: 700,
    color: '#FFFFFF',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.2,
    maxLines: 4,
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'above-title',
    fontSize: 15,
    fontWeight: 700,
    color: 'brandColor',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-title',
    fontSize: 18,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.5)',
    prefix: 'By ',
  },

  date: {
    position: 'below-author',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.4)',
    format: 'short',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 13,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'brandColor',
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

  brandColorSlots: ['source-text', 'accent-bar', 'stat-number', 'category-badge'],

  decorations: [
    {
      type: 'accent-bar',
      position: 'below-title',
      width: 80,
      height: 4,
      color: 'brandColor',
      borderRadius: 2,
    },
    {
      type: 'bar-chart',
      position: 'right-panel',
      color: '#6366F1',
      opacity: 0.85,
    },
  ],
};

export default config;
