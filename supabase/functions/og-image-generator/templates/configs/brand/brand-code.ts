import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'brand-code',
  name: 'Brand Code',
  category: 'brand',
  tags: ['dark', 'tech', 'terminal', 'monospace'],
  requiresImage: false,

  layout: {
    archetype: 'special',
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
    fontFamily: 'mono',
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
    fontSize: 16,
    fontWeight: 400,
    color: '#6B7280',
    prefix: '// ',
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
    background: 'dark-pill',
  },

  brandColorSlots: [],

  decorations: [
    {
      type: 'grid-pattern',
      position: 'fullbleed',
      color: 'rgba(255,255,255,1)',
      opacity: 0.04,
    },
    {
      type: 'terminal-dot',
      position: 'top-bar',
      width: 14,
      height: 14,
      color: '#FF5F57',
      borderRadius: 7,
    },
    {
      type: 'terminal-dot',
      position: 'top-bar',
      width: 14,
      height: 14,
      color: '#FEBC2E',
      borderRadius: 7,
    },
    {
      type: 'terminal-dot',
      position: 'top-bar',
      width: 14,
      height: 14,
      color: '#28C840',
      borderRadius: 7,
    },
    {
      type: 'bracket',
      position: 'left-of-title',
      height: 120,
      color: '#22C55E',
      opacity: 0.6,
    },
    {
      type: 'bracket',
      position: 'right-of-title',
      height: 120,
      color: '#22C55E',
      opacity: 0.6,
    },
    {
      type: 'accent-bar',
      position: 'bottom',
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
