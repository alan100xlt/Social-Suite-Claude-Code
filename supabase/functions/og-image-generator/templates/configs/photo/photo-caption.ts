import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'photo-caption',
  name: 'Photo Caption',
  category: 'photo',
  tags: ['dark', 'split', 'clean'],
  requiresImage: true,

  layout: {
    archetype: 'split-tb',
    splitRatio: [60, 40],
    padding: [0, 60, 0, 60],
    theme: 'dark',
  },

  background: {
    type: 'solid',
    colors: ['#111111'],
  },

  image: {
    position: 'top-panel',
    panelPercent: 60,
  },

  title: {
    fontSize: 40,
    fontWeight: 700,
    color: '#ffffff',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.2,
    maxLines: 3,
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'above-title',
    fontSize: 18,
    fontWeight: 700,
    color: 'brandColor',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-title',
    fontSize: 18,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.6)',
    prefix: 'By ',
  },

  date: {
    position: 'below-author',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.4)',
    format: 'short',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 13,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'brandColor',
    borderRadius: 4,
    padding: '4px 10px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'bottom-right',
    maxHeight: 28,
    margin: 32,
    background: 'none',
  },

  brandColorSlots: ['source-text', 'category-badge'],

  decorations: [],
};

export default config;
