import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'news-digest',
  name: 'News Digest',
  category: 'news',
  tags: ['dark', 'photo', 'split', 'digest', 'editorial'],
  requiresImage: true,

  layout: {
    archetype: 'split-lr',
    splitRatio: [55, 45],
    padding: 48,
    theme: 'dark',
  },

  background: {
    type: 'solid',
    colors: ['#1A1A2E'],
  },

  image: {
    position: 'right-panel',
    panelPercent: 45,
    borderRadius: 16,
    overlay: {
      type: 'brand-tint',
      opacity: 0.15,
    },
  },

  title: {
    fontSize: 42,
    fontWeight: 700,
    fontFamily: 'serif',
    color: '#FFFFFF',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.25,
    maxLines: 5,
  },

  description: {
    fontSize: 18,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 1.5,
    maxLines: 3,
    marginTop: 16,
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'above-title',
    fontSize: 13,
    fontWeight: 700,
    color: 'brandColor',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-title',
    fontSize: 15,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.45)',
    prefix: 'By ',
  },

  date: {
    position: 'bottom-bar',
    fontSize: 13,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.35)',
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
    position: 'bottom-left',
    maxHeight: 24,
    margin: 40,
    background: 'none',
  },

  brandColorSlots: ['source-text', 'category-badge'],

  decorations: [
    {
      type: 'accent-bar',
      position: 'below-title',
      width: 60,
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
