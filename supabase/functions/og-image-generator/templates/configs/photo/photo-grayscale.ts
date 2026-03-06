import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'photo-grayscale',
  name: 'Photo Grayscale',
  category: 'photo',
  tags: ['dark', 'grayscale', 'mono', 'dramatic'],
  requiresImage: true,

  layout: {
    archetype: 'fullbleed',
    padding: 64,
    theme: 'dark',
  },

  background: {
    type: 'image-fullbleed',
    colors: [],
  },

  image: {
    position: 'fullbleed',
    overlay: { type: 'dark-gradient-bottom', opacity: 0.8 },
    filter: 'grayscale(1) contrast(1.2)',
  },

  title: {
    fontSize: 50,
    fontWeight: 700,
    color: '#ffffff',
    alignment: 'left',
    verticalAlign: 'bottom',
    lineHeight: 1.15,
    maxLines: 3,
    textShadow: '0 2px 16px rgba(0,0,0,0.6)',
  },

  sourceName: {
    style: 'monospace-path',
    position: 'above-title',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.5)',
  },

  author: {
    position: 'below-title',
    fontSize: 18,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.6)',
    prefix: 'By ',
  },

  date: {
    position: 'inline-with-author',
    fontSize: 16,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.4)',
    format: 'short',
  },

  logo: {
    position: 'top-left',
    maxHeight: 28,
    margin: 36,
    background: 'none',
  },

  brandColorSlots: ['accent-bar'],

  decorations: [
    {
      type: 'accent-bar',
      position: 'left-of-title',
      width: 4,
      height: 80,
      color: 'brandColor',
    },
  ],
};

export default config;
