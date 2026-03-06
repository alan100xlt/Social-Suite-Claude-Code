import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'stats-card',
  name: 'Stats Card',
  category: 'stats',
  tags: ['dark', 'data', 'card', 'metric', 'centered'],
  requiresImage: false,

  layout: {
    archetype: 'card',
    padding: 60,
    theme: 'dark',
  },

  background: {
    type: 'solid',
    colors: ['#0F172A'],
  },

  title: {
    fontSize: 32,
    fontWeight: 700,
    color: '#FFFFFF',
    alignment: 'center',
    verticalAlign: 'bottom',
    lineHeight: 1.3,
    maxLines: 2,
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'above-title',
    fontSize: 14,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-title',
    fontSize: 16,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.4)',
    prefix: 'By ',
  },

  date: {
    position: 'below-author',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.3)',
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

  brandColorSlots: ['stat-number', 'divider', 'category-badge'],

  decorations: [
    {
      type: 'divider',
      position: 'above-title',
      width: 640,
      height: 1,
      color: 'rgba(255,255,255,0.08)',
    },
  ],

  card: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    border: '1px solid rgba(255,255,255,0.08)',
    padding: 56,
    maxWidth: 960,
  },
};

export default config;
