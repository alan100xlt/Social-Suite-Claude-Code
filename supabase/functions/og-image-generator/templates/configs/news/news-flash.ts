import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'news-flash',
  name: 'News Flash',
  category: 'news',
  tags: ['dark', 'breaking', 'banner', 'urgent', 'red'],
  requiresImage: false,

  layout: {
    archetype: 'banner',
    padding: [0, 60, 0, 60],
    theme: 'dark',
  },

  background: {
    type: 'linear-gradient',
    colors: ['#7F1D1D', '#0F0F0F'],
    gradientAngle: 180,
  },

  title: {
    fontSize: 58,
    fontWeight: 800,
    fontFamily: 'sans',
    color: '#FFFFFF',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.15,
    maxLines: 4,
  },

  sourceName: {
    style: 'inline-banner',
    position: 'top-right',
    fontSize: 16,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.9)',
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
    fontSize: 15,
    fontWeight: 700,
    color: '#FCA5A5',
    format: 'long',
  },

  categoryTag: {
    position: 'inline-banner',
    fontSize: 14,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: '#DC2626',
    borderRadius: 0,
    padding: '6px 16px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-left',
    maxHeight: 28,
    margin: 48,
    background: 'none',
  },

  brandColorSlots: ['banner-bg'],

  decorations: [
    {
      type: 'accent-bar',
      position: 'top-edge',
      width: 1200,
      height: 6,
      color: '#DC2626',
    },
    {
      type: 'accent-bar',
      position: 'below-banner',
      width: 1200,
      height: 3,
      color: '#DC2626',
      opacity: 0.5,
    },
  ],

  staticLabels: [
    {
      text: 'Flash',
      position: 'banner-left',
      fontSize: 24,
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
