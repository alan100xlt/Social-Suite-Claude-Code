import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'stats-trend',
  name: 'Stats Trend',
  category: 'stats',
  tags: ['dark', 'data', 'special', 'trend', 'line-chart'],
  requiresImage: false,

  layout: {
    archetype: 'special',
    padding: 56,
    theme: 'dark',
  },

  background: {
    type: 'linear-gradient',
    colors: ['#0F172A', '#020617'],
    gradientAngle: 180,
  },

  title: {
    fontSize: 40,
    fontWeight: 700,
    fontFamily: 'sans',
    color: '#E2E8F0',
    alignment: 'left',
    verticalAlign: 'top',
    lineHeight: 1.2,
    maxLines: 2,
  },

  description: {
    fontSize: 18,
    fontWeight: 400,
    color: 'rgba(226,232,240,0.45)',
    lineHeight: 1.5,
    maxLines: 2,
    marginTop: 12,
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'above-title',
    fontSize: 13,
    fontWeight: 700,
    color: '#22C55E',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-title',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(226,232,240,0.35)',
    prefix: 'By ',
  },

  date: {
    position: 'top-right',
    fontSize: 13,
    fontWeight: 400,
    color: 'rgba(226,232,240,0.3)',
    format: 'short',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 11,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: '#22C55E',
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

  brandColorSlots: ['stat-number', 'accent-bar'],

  decorations: [
    {
      type: 'sparkline',
      position: 'bottom-panel',
      color: '#22C55E',
      opacity: 0.7,
      height: 200,
    },
    {
      type: 'accent-bar',
      position: 'below-title',
      width: 50,
      height: 3,
      color: '#22C55E',
      borderRadius: 2,
    },
    {
      type: 'trend-arrow',
      position: 'top-right-stat',
      color: '#22C55E',
      opacity: 0.9,
    },
  ],
};

export default config;
