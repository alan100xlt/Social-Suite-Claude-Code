import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'news-wire',
  name: 'News Wire',
  category: 'news',
  tags: ['dark', 'text-forward', 'wire', 'monospace', 'minimal'],
  requiresImage: false,

  layout: {
    archetype: 'text-forward',
    padding: 64,
    theme: 'dark',
  },

  background: {
    type: 'solid',
    colors: ['#18181B'],
  },

  title: {
    fontSize: 48,
    fontWeight: 700,
    fontFamily: 'mono',
    color: '#FAFAFA',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.3,
    maxLines: 4,
  },

  sourceName: {
    style: 'monospace-path',
    position: 'above-title',
    fontSize: 14,
    fontWeight: 400,
    color: '#A1A1AA',
    letterSpacing: 2,
  },

  author: {
    position: 'below-title',
    fontSize: 16,
    fontWeight: 400,
    color: '#71717A',
    prefix: '-- ',
    letterSpacing: 1,
  },

  date: {
    position: 'top-right',
    fontSize: 14,
    fontWeight: 400,
    color: '#52525B',
    format: 'long',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 12,
    fontWeight: 700,
    color: '#FAFAFA',
    backgroundColor: '#3F3F46',
    borderRadius: 0,
    padding: '3px 10px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-left',
    maxHeight: 24,
    margin: 40,
    background: 'none',
  },

  brandColorSlots: ['accent-bar'],

  decorations: [
    {
      type: 'accent-bar',
      position: 'left-edge',
      width: 3,
      height: 630,
      color: '#52525B',
    },
    {
      type: 'divider',
      position: 'above-title',
      width: 1080,
      height: 1,
      color: '#27272A',
    },
  ],

  staticLabels: [
    {
      text: 'Wire Service',
      position: 'bottom-left',
      fontSize: 12,
      fontWeight: 400,
      color: '#52525B',
      textTransform: 'uppercase',
    },
  ],

  behavior: {
    monospaceMeta: true,
    showDate: true,
  },
};

export default config;
