import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'brand-code',
  name: 'Brand Code',
  category: 'brand',
  tags: ['dark', 'terminal', 'monospace', 'developer'],
  requiresImage: false,

  layout: {
    archetype: 'text-forward',
    padding: 80,
    theme: 'dark',
  },

  background: {
    type: 'solid',
    colors: ['#1E1E1E'],
  },

  title: {
    fontSize: 52,
    fontWeight: 700,
    color: '#E5E7EB',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.25,
    maxLines: 4,
  },

  sourceName: {
    style: 'monospace-path',
    position: 'top-left',
    fontSize: 16,
    fontWeight: 400,
    color: '#6B7280',
  },

  author: {
    position: 'below-title',
    fontSize: 18,
    fontWeight: 400,
    color: '#6B7280',
    prefix: 'By ',
  },

  date: {
    position: 'below-author',
    fontSize: 14,
    fontWeight: 400,
    color: '#4B5563',
    format: 'short',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 12,
    fontWeight: 700,
    color: '#1E1E1E',
    backgroundColor: '#22C55E',
    borderRadius: 4,
    padding: '3px 10px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-right',
    maxHeight: 28,
    margin: 40,
    background: 'none',
  },

  brandColorSlots: ['accent-bar'],

  decorations: [
    {
      type: 'grid-pattern',
      position: 'fullbleed',
      color: 'rgba(255,255,255,1)',
      opacity: 0.04,
    },
    {
      type: 'terminal-dots',
      position: 'top-left',
      width: 14,
      height: 14,
      borderRadius: 7,
    },
    {
      type: 'curly-braces',
      position: 'around-title',
      height: 120,
      color: '#22C55E',
      opacity: 0.6,
    },
    {
      type: 'accent-bar',
      position: 'below-title',
      width: 80,
      height: 4,
      color: '#22C55E',
      borderRadius: 2,
    },
  ],

  behavior: {
    monospaceMeta: true,
  },
};

export default config;
