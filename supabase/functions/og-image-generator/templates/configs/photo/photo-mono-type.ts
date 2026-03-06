import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'photo-mono-type',
  name: 'Photo Mono Type',
  category: 'photo',
  tags: ['dark', 'monospace', 'tech', 'developer', 'code'],
  requiresImage: true,

  layout: {
    archetype: 'split-tb',
    splitRatio: [55, 45],
    padding: [0, 48, 0, 48],
    theme: 'dark',
  },

  background: {
    type: 'solid',
    colors: ['#0c0c0c'],
  },

  image: {
    position: 'top-panel',
    panelPercent: 55,
    filter: 'contrast(1.1) saturate(0.9)',
  },

  title: {
    fontSize: 34,
    fontWeight: 500,
    fontFamily: 'mono',
    color: '#e0e0e0',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.3,
    maxLines: 3,
  },

  sourceName: {
    style: 'monospace-path',
    position: 'above-title',
    fontSize: 13,
    fontWeight: 400,
    color: 'brandColor',
  },

  author: {
    position: 'below-title',
    fontSize: 15,
    fontWeight: 400,
    color: 'rgba(224,224,224,0.5)',
    prefix: '// ',
  },

  date: {
    position: 'inline-with-author',
    fontSize: 13,
    fontWeight: 400,
    color: 'rgba(224,224,224,0.3)',
    format: 'calendar-block',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 12,
    fontWeight: 600,
    color: '#0c0c0c',
    backgroundColor: 'brandColor',
    borderRadius: 2,
    padding: '3px 8px',
    textTransform: 'none',
  },

  logo: {
    position: 'bottom-right',
    maxHeight: 22,
    margin: 28,
    background: 'none',
  },

  brandColorSlots: ['source-text', 'category-badge', 'accent-bar'],

  decorations: [
    {
      type: 'accent-bar',
      position: 'image-bottom-edge',
      width: 1200,
      height: 2,
      color: 'brandColor',
    },
  ],

  behavior: {
    monospaceMeta: true,
  },
};

export default config;
