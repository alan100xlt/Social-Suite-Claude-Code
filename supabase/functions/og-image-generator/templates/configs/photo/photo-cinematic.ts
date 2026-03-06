import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'photo-cinematic',
  name: 'Photo Cinematic',
  category: 'photo',
  tags: ['dark', 'cinematic', 'widescreen', 'bold'],
  requiresImage: true,

  layout: {
    archetype: 'fullbleed',
    padding: 60,
    theme: 'dark',
  },

  background: {
    type: 'image-fullbleed',
    colors: [],
  },

  image: {
    position: 'fullbleed',
    overlay: { type: 'dark-gradient-bottom', opacity: 0.9 },
    filter: 'contrast(1.15) saturate(1.1)',
  },

  title: {
    fontSize: 56,
    fontWeight: 800,
    fontFamily: 'serif',
    color: '#ffffff',
    alignment: 'left',
    verticalAlign: 'bottom',
    lineHeight: 1.1,
    maxLines: 3,
    textShadow: '0 4px 24px rgba(0,0,0,0.6)',
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'above-title',
    fontSize: 14,
    fontWeight: 700,
    color: 'brandColor',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-title',
    fontSize: 18,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.6)',
    prefix: 'By ',
  },

  logo: {
    position: 'top-right',
    maxHeight: 30,
    margin: 40,
    background: 'frosted',
  },

  brandColorSlots: ['source-text', 'accent-bar'],

  decorations: [
    {
      type: 'accent-bar',
      position: 'bottom-edge',
      width: 1200,
      height: 4,
      color: 'brandColor',
    },
  ],
};

export default config;
