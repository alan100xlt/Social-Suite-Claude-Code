import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'news-headline',
  name: 'News Headline',
  category: 'news',
  tags: ['dark', 'photo', 'fullbleed', 'dramatic'],
  requiresImage: true,

  layout: {
    archetype: 'fullbleed',
    padding: 60,
    theme: 'dark',
  },

  background: {
    type: 'image-fullbleed',
    colors: ['#0F0F0F'],
  },

  image: {
    position: 'fullbleed',
    overlay: {
      type: 'dark-gradient-bottom',
      opacity: 0.85,
    },
  },

  title: {
    fontSize: 60,
    fontWeight: 800,
    fontFamily: 'serif',
    color: '#FFFFFF',
    alignment: 'left',
    verticalAlign: 'bottom',
    lineHeight: 1.15,
    maxLines: 4,
    textShadow: '0 2px 10px rgba(0,0,0,0.5)',
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'above-title',
    fontSize: 16,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-title',
    fontSize: 16,
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
    position: 'above-title',
    fontSize: 14,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'brandColor',
    borderRadius: 0,
    padding: '5px 14px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-left',
    maxHeight: 32,
    margin: 40,
    background: 'frosted',
  },

  brandColorSlots: ['category-badge'],

  decorations: [],

  behavior: {
    showDate: true,
  },
};

export default config;
