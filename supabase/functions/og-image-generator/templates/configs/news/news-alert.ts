import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'news-alert',
  name: 'News Alert',
  category: 'news',
  tags: ['dark', 'photo', 'fullbleed', 'alert', 'breaking'],
  requiresImage: true,

  layout: {
    archetype: 'fullbleed',
    padding: 56,
    theme: 'dark',
  },

  background: {
    type: 'image-fullbleed',
    colors: ['#0F0F0F'],
  },

  image: {
    position: 'fullbleed',
    overlay: {
      type: 'dark-gradient-radial',
      opacity: 0.8,
    },
    filter: 'saturate(0.7)',
  },

  title: {
    fontSize: 56,
    fontWeight: 700,
    fontFamily: 'sans',
    color: '#FFFFFF',
    alignment: 'center',
    verticalAlign: 'center',
    lineHeight: 1.2,
    maxLines: 4,
    textShadow: '0 2px 15px rgba(0,0,0,0.6)',
  },

  sourceName: {
    style: 'badge',
    position: 'above-title',
    fontSize: 14,
    fontWeight: 700,
    color: '#FFFFFF',
    badgeBg: 'rgba(220,38,38,0.8)',
  },

  author: {
    position: 'below-title',
    fontSize: 16,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.7)',
    prefix: 'By ',
  },

  date: {
    position: 'bottom-bar',
    fontSize: 14,
    fontWeight: 700,
    color: '#FCA5A5',
    format: 'long',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 13,
    fontWeight: 700,
    color: '#FFFFFF',
    backgroundColor: '#DC2626',
    borderRadius: 4,
    padding: '4px 12px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-left',
    maxHeight: 28,
    margin: 40,
    background: 'white-pill',
  },

  brandColorSlots: ['accent-bar'],

  decorations: [
    {
      type: 'accent-bar',
      position: 'top-edge',
      width: 1200,
      height: 4,
      color: '#DC2626',
    },
    {
      type: 'accent-bar',
      position: 'bottom-edge',
      width: 1200,
      height: 4,
      color: '#DC2626',
    },
  ],

  staticLabels: [
    {
      text: 'Alert',
      position: 'top-right',
      fontSize: 16,
      fontWeight: 700,
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
