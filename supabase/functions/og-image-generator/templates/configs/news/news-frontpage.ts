import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'news-frontpage',
  name: 'News Front Page',
  category: 'news',
  tags: ['dark', 'photo', 'fullbleed', 'newspaper', 'classic'],
  requiresImage: true,

  layout: {
    archetype: 'fullbleed',
    padding: [48, 60, 60, 60],
    theme: 'dark',
  },

  background: {
    type: 'image-fullbleed',
    colors: ['#0A0A0A'],
  },

  image: {
    position: 'fullbleed',
    overlay: {
      type: 'dark-gradient-bottom',
      opacity: 0.9,
    },
  },

  title: {
    fontSize: 64,
    fontWeight: 700,
    fontFamily: 'serif',
    color: '#FFFFFF',
    alignment: 'left',
    verticalAlign: 'bottom',
    lineHeight: 1.1,
    maxLines: 4,
  },

  description: {
    fontSize: 20,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 1.5,
    maxLines: 2,
    marginTop: 16,
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'top-left',
    fontSize: 20,
    fontWeight: 700,
    color: '#FFFFFF',
    letterSpacing: 6,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-title',
    fontSize: 16,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.6)',
    prefix: 'By ',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  date: {
    position: 'top-right',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.5)',
    format: 'calendar-block',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 13,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'brandColor',
    borderRadius: 0,
    padding: '5px 14px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-left',
    maxHeight: 36,
    margin: 40,
    background: 'none',
  },

  brandColorSlots: ['category-badge', 'divider'],

  decorations: [
    {
      type: 'divider',
      position: 'below-source',
      width: 1080,
      height: 2,
      color: 'rgba(255,255,255,0.2)',
    },
  ],

  behavior: {
    showDate: true,
  },
};

export default config;
