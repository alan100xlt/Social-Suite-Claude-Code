import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'news-column',
  name: 'News Column',
  category: 'news',
  tags: ['dark', 'photo', 'split', 'column', 'editorial'],
  requiresImage: true,

  layout: {
    archetype: 'split-lr',
    splitRatio: [50, 50],
    padding: 0,
    theme: 'dark',
  },

  background: {
    type: 'solid',
    colors: ['#111827'],
  },

  image: {
    position: 'left-panel',
    panelPercent: 50,
    overlay: {
      type: 'vignette',
      opacity: 0.3,
    },
  },

  title: {
    fontSize: 40,
    fontWeight: 700,
    fontFamily: 'serif',
    color: '#F9FAFB',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.3,
    maxLines: 5,
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'above-title',
    fontSize: 12,
    fontWeight: 700,
    color: 'rgba(249,250,251,0.5)',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-title',
    fontSize: 15,
    fontWeight: 400,
    color: 'rgba(249,250,251,0.45)',
    prefix: 'By ',
  },

  date: {
    position: 'below-author',
    fontSize: 13,
    fontWeight: 400,
    color: 'rgba(249,250,251,0.3)',
    format: 'long',
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
    maxHeight: 24,
    margin: 40,
    background: 'none',
  },

  brandColorSlots: ['category-badge', 'accent-bar'],

  decorations: [
    {
      type: 'accent-bar',
      position: 'below-title',
      width: 50,
      height: 3,
      color: 'brandColor',
      borderRadius: 2,
    },
  ],

  behavior: {
    showDate: true,
  },
};

export default config;
