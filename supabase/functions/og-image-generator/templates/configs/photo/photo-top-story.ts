import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'photo-top-story',
  name: 'Photo Top Story',
  category: 'photo',
  tags: ['dark', 'bold', 'breaking', 'news', 'fullbleed'],
  requiresImage: true,

  layout: {
    archetype: 'fullbleed',
    padding: 56,
    theme: 'dark',
  },

  background: {
    type: 'image-fullbleed',
    colors: [],
  },

  image: {
    position: 'fullbleed',
    overlay: { type: 'dark-gradient-top', opacity: 0.7 },
    filter: 'contrast(1.1)',
  },

  title: {
    fontSize: 54,
    fontWeight: 800,
    color: '#ffffff',
    alignment: 'left',
    verticalAlign: 'top',
    lineHeight: 1.1,
    maxLines: 3,
    textShadow: '0 2px 16px rgba(0,0,0,0.5)',
  },

  sourceName: {
    style: 'inline-banner',
    position: 'bottom-bar',
    fontSize: 16,
    fontWeight: 700,
    color: '#ffffff',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 14,
    fontWeight: 800,
    color: '#ffffff',
    backgroundColor: '#cc0000',
    borderRadius: 4,
    padding: '6px 14px',
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-title',
    fontSize: 18,
    fontWeight: 500,
    color: 'rgba(255,255,255,0.7)',
    prefix: 'By ',
  },

  date: {
    position: 'inline-with-author',
    fontSize: 16,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.5)',
    format: 'relative',
  },

  logo: {
    position: 'bottom-left',
    maxHeight: 32,
    margin: 32,
    background: 'white-pill',
  },

  brandColorSlots: ['banner-bg'],

  decorations: [
    {
      type: 'banner-bar',
      position: 'bottom',
      width: 1200,
      height: 56,
      color: 'brandColor',
      opacity: 0.9,
    },
  ],

  behavior: {
    detectBreaking: true,
  },
};

export default config;
