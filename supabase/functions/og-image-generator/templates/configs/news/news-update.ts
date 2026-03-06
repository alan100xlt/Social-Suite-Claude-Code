import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'news-update',
  name: 'News Update',
  category: 'news',
  tags: ['dark', 'photo', 'text-forward', 'update', 'developing'],
  requiresImage: true,

  layout: {
    archetype: 'text-forward',
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
      type: 'blur',
      opacity: 0.8,
    },
    filter: 'blur(8px) brightness(0.4)',
  },

  title: {
    fontSize: 50,
    fontWeight: 700,
    fontFamily: 'sans',
    color: '#FFFFFF',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.2,
    maxLines: 4,
    textShadow: '0 2px 12px rgba(0,0,0,0.4)',
  },

  description: {
    fontSize: 18,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 1.5,
    maxLines: 2,
    marginTop: 16,
  },

  sourceName: {
    style: 'badge',
    position: 'above-title',
    fontSize: 14,
    fontWeight: 700,
    color: '#FFFFFF',
    badgeBg: 'rgba(255,255,255,0.15)',
  },

  author: {
    position: 'below-title',
    fontSize: 15,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.55)',
    prefix: 'By ',
  },

  date: {
    position: 'bottom-bar',
    fontSize: 14,
    fontWeight: 700,
    color: '#93C5FD',
    format: 'relative',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 13,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: '#2563EB',
    borderRadius: 4,
    padding: '4px 12px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-left',
    maxHeight: 28,
    margin: 40,
    background: 'frosted',
  },

  brandColorSlots: ['accent-bar'],

  decorations: [
    {
      type: 'accent-bar',
      position: 'left-edge',
      width: 4,
      height: 200,
      color: '#2563EB',
    },
  ],

  staticLabels: [
    {
      text: 'Update',
      position: 'bottom-right',
      fontSize: 13,
      fontWeight: 700,
      color: '#93C5FD',
      textTransform: 'uppercase',
    },
  ],

  behavior: {
    detectBreaking: true,
    showDate: true,
  },
};

export default config;
