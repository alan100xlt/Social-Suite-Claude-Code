import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'photo-sepia',
  name: 'Photo Sepia',
  category: 'photo',
  tags: ['dark', 'sepia', 'vintage', 'warm', 'serif'],
  requiresImage: true,

  layout: {
    archetype: 'fullbleed',
    padding: 72,
    theme: 'dark',
  },

  background: {
    type: 'image-fullbleed',
    colors: [],
  },

  image: {
    position: 'fullbleed',
    overlay: { type: 'dark-gradient-bottom', opacity: 0.75 },
    filter: 'sepia(0.6) contrast(1.1) brightness(0.95)',
  },

  title: {
    fontSize: 46,
    fontWeight: 700,
    fontFamily: 'serif',
    color: '#f5e6d0',
    alignment: 'left',
    verticalAlign: 'bottom',
    lineHeight: 1.2,
    maxLines: 3,
    textShadow: '0 2px 12px rgba(0,0,0,0.5)',
  },

  sourceName: {
    style: 'subtle-text',
    position: 'above-title',
    fontSize: 16,
    fontWeight: 400,
    color: 'rgba(245,230,208,0.6)',
  },

  author: {
    position: 'below-title',
    fontSize: 17,
    fontWeight: 400,
    color: 'rgba(245,230,208,0.6)',
    prefix: 'By ',
  },

  date: {
    position: 'below-author',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(245,230,208,0.4)',
    format: 'long',
  },

  logo: {
    position: 'top-right',
    maxHeight: 28,
    margin: 36,
    background: 'frosted',
  },

  brandColorSlots: [],

  decorations: [
    {
      type: 'accent-bar',
      position: 'bottom-edge',
      width: 1200,
      height: 3,
      color: '#c4a46a',
    },
  ],
};

export default config;
