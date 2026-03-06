import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'stats-chart',
  name: 'Stats Chart',
  category: 'stats',
  tags: ['dark', 'data', 'card', 'chart', 'visualization'],
  requiresImage: false,

  layout: {
    archetype: 'card',
    padding: 40,
    theme: 'dark',
  },

  background: {
    type: 'linear-gradient',
    colors: ['#020617', '#0F172A'],
    gradientAngle: 160,
  },

  title: {
    fontSize: 36,
    fontWeight: 700,
    fontFamily: 'sans',
    color: '#E2E8F0',
    alignment: 'left',
    verticalAlign: 'top',
    lineHeight: 1.2,
    maxLines: 2,
  },

  description: {
    fontSize: 16,
    fontWeight: 400,
    color: 'rgba(226,232,240,0.45)',
    lineHeight: 1.5,
    maxLines: 1,
    marginTop: 8,
  },

  sourceName: {
    style: 'subtle-text',
    position: 'above-title',
    fontSize: 13,
    fontWeight: 500,
    color: 'rgba(226,232,240,0.4)',
    letterSpacing: 1,
  },

  author: {
    position: 'below-title',
    fontSize: 13,
    fontWeight: 400,
    color: 'rgba(226,232,240,0.3)',
    prefix: 'By ',
  },

  date: {
    position: 'top-right',
    fontSize: 12,
    fontWeight: 400,
    color: 'rgba(226,232,240,0.25)',
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
    position: 'top-left',
    maxHeight: 22,
    margin: 32,
    background: 'none',
  },

  brandColorSlots: ['stat-number', 'category-badge', 'accent-bar'],

  decorations: [
    {
      type: 'area-chart',
      position: 'bottom-panel',
      color: 'brandColor',
      opacity: 0.5,
      height: 220,
    },
    {
      type: 'grid-lines',
      position: 'bottom-panel',
      color: 'rgba(226,232,240,0.04)',
    },
  ],

  card: {
    backgroundColor: 'rgba(15,23,42,0.8)',
    borderRadius: 16,
    border: '1px solid rgba(226,232,240,0.06)',
    padding: 40,
    backdropFilter: 'blur(10px)',
    maxWidth: 1020,
  },
};

export default config;
