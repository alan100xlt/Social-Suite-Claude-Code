import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'news-banner',
  name: 'News Banner',
  category: 'news',
  tags: ['dark', 'breaking', 'banner', 'urgent'],
  requiresImage: false,

  layout: {
    archetype: 'banner',
    padding: [0, 60, 0, 60],
    theme: 'dark',
  },

  background: {
    type: 'solid',
    colors: ['#0F0F0F'],
  },

  title: {
    fontSize: 54,
    fontWeight: 700,
    color: '#FFFFFF',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.2,
    maxLines: 4,
  },

  sourceName: {
    style: 'inline-banner',
    position: 'top-right',
    fontSize: 18,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.85)',
  },

  author: {
    position: 'bottom-left',
    fontSize: 16,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.5)',
    prefix: 'By ',
  },

  date: {
    position: 'bottom-bar',
    fontSize: 16,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.5)',
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

  brandColorSlots: ['banner-bg', 'accent-dot'],

  decorations: [
    {
      type: 'accent-bar',
      position: 'below-banner',
      width: 1200,
      height: 4,
      color: '#FBBF24',
    },
  ],

  staticLabels: [
    {
      text: 'Breaking News',
      position: 'banner-left',
      fontSize: 22,
      fontWeight: 700,
      color: '#ffffff',
      textTransform: 'uppercase',
    },
    {
      text: 'Live',
      position: 'bottom-right',
      fontSize: 14,
      fontWeight: 700,
      color: 'brandColor',
      textTransform: 'uppercase',
    },
  ],

  behavior: {
    detectBreaking: true,
    showDate: true,
  },
};

export default config;
