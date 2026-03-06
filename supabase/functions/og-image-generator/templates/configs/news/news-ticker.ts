import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'news-ticker',
  name: 'News Ticker',
  category: 'news',
  tags: ['dark', 'ticker', 'breaking', 'minimal'],
  requiresImage: false,

  layout: {
    archetype: 'banner',
    padding: 56,
    theme: 'dark',
  },

  background: {
    type: 'solid',
    colors: ['#111827'],
  },

  title: {
    fontSize: 52,
    fontWeight: 700,
    color: '#FFFFFF',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.2,
    maxLines: 4,
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'top-left',
    fontSize: 16,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-title',
    fontSize: 18,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.5)',
    prefix: 'By ',
  },

  date: {
    position: 'bottom-bar',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.4)',
    format: 'short',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 14,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'brandColor',
    borderRadius: 4,
    padding: '4px 12px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-right',
    maxHeight: 28,
    margin: 32,
    background: 'none',
  },

  brandColorSlots: ['banner-bg', 'accent-dot', 'category-badge'],

  decorations: [
    {
      type: 'ticker-dots',
      position: 'bottom-bar-right',
      width: 6,
      height: 6,
      color: 'rgba(255,255,255,0.5)',
      borderRadius: 3,
    },
  ],

  staticLabels: [
    {
      text: 'Latest Headlines',
      position: 'bottom-bar-left',
      fontSize: 15,
      fontWeight: 700,
      color: '#ffffff',
      textTransform: 'uppercase',
    },
  ],

  behavior: {
    detectBreaking: true,
  },
};

export default config;
