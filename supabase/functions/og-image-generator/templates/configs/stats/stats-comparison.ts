import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'stats-comparison',
  name: 'Stats Comparison',
  category: 'stats',
  tags: ['dark', 'data', 'special', 'comparison', 'versus'],
  requiresImage: false,

  layout: {
    archetype: 'special',
    padding: 48,
    theme: 'dark',
  },

  background: {
    type: 'solid',
    colors: ['#0F172A'],
  },

  title: {
    fontSize: 38,
    fontWeight: 700,
    fontFamily: 'sans',
    color: '#F1F5F9',
    alignment: 'center',
    verticalAlign: 'top',
    lineHeight: 1.2,
    maxLines: 2,
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'above-title',
    fontSize: 12,
    fontWeight: 700,
    color: 'rgba(241,245,249,0.4)',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },

  author: {
    position: 'bottom-left',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(241,245,249,0.35)',
    prefix: 'By ',
  },

  date: {
    position: 'bottom-right',
    fontSize: 13,
    fontWeight: 400,
    color: 'rgba(241,245,249,0.3)',
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

  brandColorSlots: ['stat-number', 'category-badge', 'divider'],

  decorations: [
    {
      type: 'comparison-columns',
      position: 'center-panel',
      color: '#1E293B',
      borderRadius: 16,
    },
    {
      type: 'divider',
      position: 'center-vertical',
      width: 2,
      height: 280,
      color: 'rgba(241,245,249,0.08)',
    },
    {
      type: 'vs-badge',
      position: 'center',
      width: 48,
      height: 48,
      color: '#334155',
      borderRadius: 24,
    },
  ],
};

export default config;
