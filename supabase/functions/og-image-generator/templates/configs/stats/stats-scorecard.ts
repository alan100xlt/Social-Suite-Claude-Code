import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'stats-scorecard',
  name: 'Stats Scorecard',
  category: 'stats',
  tags: ['dark', 'data', 'card', 'scorecard', 'rows'],
  requiresImage: false,

  layout: {
    archetype: 'card',
    padding: 48,
    theme: 'dark',
  },

  background: {
    type: 'solid',
    colors: ['#020617'],
  },

  title: {
    fontSize: 34,
    fontWeight: 700,
    fontFamily: 'sans',
    color: '#F8FAFC',
    alignment: 'left',
    verticalAlign: 'top',
    lineHeight: 1.25,
    maxLines: 2,
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'above-title',
    fontSize: 12,
    fontWeight: 700,
    color: 'brandColor',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-title',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(248,250,252,0.4)',
    prefix: 'By ',
  },

  date: {
    position: 'top-right',
    fontSize: 12,
    fontWeight: 400,
    color: 'rgba(248,250,252,0.3)',
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

  brandColorSlots: ['source-text', 'stat-number', 'category-badge', 'card-border'],

  decorations: [
    {
      type: 'score-rows',
      position: 'bottom-panel',
      color: '#0F172A',
      borderRadius: 12,
    },
    {
      type: 'divider',
      position: 'below-title',
      width: 40,
      height: 3,
      color: 'brandColor',
      borderRadius: 2,
    },
  ],

  card: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    border: '1px solid rgba(248,250,252,0.06)',
    padding: 48,
    maxWidth: 1000,
  },
};

export default config;
