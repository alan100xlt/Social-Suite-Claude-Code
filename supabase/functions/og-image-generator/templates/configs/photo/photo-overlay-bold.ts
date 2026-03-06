import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'photo-overlay-bold',
  name: 'Photo Overlay Bold',
  category: 'photo',
  tags: ['dark', 'bold', 'overlay', 'brand-tint'],
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
    overlay: { type: 'brand-tint', opacity: 0.7 },
    filter: 'contrast(1.1)',
  },

  title: {
    fontSize: 64,
    fontWeight: 800,
    color: '#ffffff',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.05,
    maxLines: 3,
    textShadow: '0 4px 30px rgba(0,0,0,0.4)',
  },

  sourceName: {
    style: 'badge',
    position: 'top-left',
    fontSize: 16,
    fontWeight: 700,
    color: '#ffffff',
    badgeBg: 'rgba(0,0,0,0.4)',
  },

  author: {
    position: 'below-title',
    fontSize: 20,
    fontWeight: 500,
    color: 'rgba(255,255,255,0.8)',
    prefix: 'By ',
  },

  logo: {
    position: 'bottom-right',
    maxHeight: 36,
    margin: 40,
    background: 'white-pill',
  },

  brandColorSlots: ['overlay'],

  decorations: [],
};

export default config;
