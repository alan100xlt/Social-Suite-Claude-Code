import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'news-photo-banner',
  name: 'News Photo Banner',
  category: 'news',
  tags: ['dark', 'breaking', 'photo', 'split'],
  requiresImage: true,

  layout: {
    archetype: 'split-lr',
    splitRatio: [60, 40],
    padding: 48,
    theme: 'dark',
  },

  background: {
    type: 'solid',
    colors: ['#0F0F0F'],
  },

  image: {
    position: 'right-panel',
    panelPercent: 40,
    edgeBlend: { side: 'left', width: 80 },
  },

  title: {
    fontSize: 44,
    fontWeight: 700,
    color: '#FFFFFF',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.25,
    maxLines: 5,
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'bottom-bar',
    fontSize: 15,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  author: {
    position: 'bottom-left',
    fontSize: 15,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.5)',
    prefix: 'By ',
  },

  date: {
    position: 'bottom-bar',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.4)',
    format: 'long',
  },

  categoryTag: {
    position: 'inline-banner',
    fontSize: 14,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'brandColor',
    borderRadius: 0,
    padding: '4px 12px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-left',
    maxHeight: 28,
    margin: 48,
    background: 'none',
  },

  brandColorSlots: ['banner-bg', 'category-badge'],

  decorations: [
    {
      type: 'accent-bar',
      position: 'below-banner',
      width: 720,
      height: 3,
      color: '#FBBF24',
    },
  ],

  staticLabels: [
    {
      text: 'Breaking News',
      position: 'banner-left',
      fontSize: 20,
      fontWeight: 700,
      color: '#ffffff',
      textTransform: 'uppercase',
    },
  ],

  behavior: {
    detectBreaking: true,
    showDate: true,
  },
};

export default config;
