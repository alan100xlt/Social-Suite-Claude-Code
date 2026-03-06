import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'news-live',
  name: 'News Live',
  category: 'news',
  tags: ['dark', 'photo', 'banner', 'live', 'broadcast'],
  requiresImage: true,

  layout: {
    archetype: 'banner',
    padding: [0, 56, 0, 56],
    theme: 'dark',
  },

  background: {
    type: 'image-fullbleed',
    colors: ['#0F0F0F'],
  },

  image: {
    position: 'fullbleed',
    overlay: {
      type: 'solid-dim',
      opacity: 0.65,
    },
  },

  title: {
    fontSize: 52,
    fontWeight: 700,
    fontFamily: 'sans',
    color: '#FFFFFF',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.2,
    maxLines: 4,
    textShadow: '0 2px 8px rgba(0,0,0,0.5)',
  },

  sourceName: {
    style: 'inline-banner',
    position: 'top-right',
    fontSize: 16,
    fontWeight: 700,
    color: '#FFFFFF',
  },

  author: {
    position: 'bottom-left',
    fontSize: 15,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.6)',
    prefix: 'By ',
  },

  date: {
    position: 'bottom-bar',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.5)',
    format: 'long',
  },

  categoryTag: {
    position: 'inline-banner',
    fontSize: 14,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: '#DC2626',
    borderRadius: 0,
    padding: '5px 14px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-left',
    maxHeight: 28,
    margin: 48,
    background: 'white-pill',
  },

  brandColorSlots: ['banner-bg', 'accent-dot'],

  decorations: [
    {
      type: 'accent-dot',
      position: 'banner-left',
      width: 10,
      height: 10,
      color: '#DC2626',
      borderRadius: 5,
      boxShadow: '0 0 8px 3px rgba(220,38,38,0.6)',
    },
    {
      type: 'accent-bar',
      position: 'below-banner',
      width: 1200,
      height: 3,
      color: '#DC2626',
    },
  ],

  staticLabels: [
    {
      text: 'Live',
      position: 'banner-left',
      fontSize: 22,
      fontWeight: 800,
      color: '#DC2626',
      textTransform: 'uppercase',
    },
  ],

  behavior: {
    detectBreaking: true,
    showDate: true,
  },
};

export default config;
