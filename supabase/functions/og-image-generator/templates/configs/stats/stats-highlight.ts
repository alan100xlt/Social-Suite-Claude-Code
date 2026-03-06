import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'stats-highlight',
  name: 'Stats Highlight',
  category: 'stats',
  tags: ['dark', 'data', 'special', 'highlight', 'bold-number'],
  requiresImage: false,

  layout: {
    archetype: 'special',
    padding: 60,
    theme: 'dark',
  },

  background: {
    type: 'linear-gradient',
    colors: ['brandColor', '#0F172A'],
    gradientAngle: 145,
  },

  title: {
    fontSize: 34,
    fontWeight: 600,
    fontFamily: 'sans',
    color: 'rgba(255,255,255,0.85)',
    alignment: 'left',
    verticalAlign: 'bottom',
    lineHeight: 1.3,
    maxLines: 3,
  },

  sourceName: {
    style: 'badge',
    position: 'above-title',
    fontSize: 13,
    fontWeight: 700,
    color: '#FFFFFF',
    badgeBg: 'rgba(0,0,0,0.2)',
  },

  author: {
    position: 'below-title',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.45)',
    prefix: 'By ',
  },

  date: {
    position: 'bottom-bar',
    fontSize: 13,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.3)',
    format: 'short',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 11,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 4,
    padding: '3px 8px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'bottom-right',
    maxHeight: 24,
    margin: 32,
    background: 'frosted',
  },

  brandColorSlots: ['gradient-start', 'stat-number', 'highlight-bg'],

  decorations: [
    {
      type: 'hero-number',
      position: 'top-left-panel',
      color: '#FFFFFF',
      opacity: 1,
    },
    {
      type: 'highlight-bar',
      position: 'behind-number',
      color: 'rgba(0,0,0,0.15)',
      borderRadius: 16,
    },
  ],
};

export default config;
