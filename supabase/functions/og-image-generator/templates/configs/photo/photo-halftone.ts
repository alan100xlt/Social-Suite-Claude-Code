import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'photo-halftone',
  name: 'Photo Halftone',
  category: 'photo',
  tags: ['dark', 'halftone', 'retro', 'contrast', 'bold'],
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
    overlay: { type: 'solid-dim', opacity: 0.5 },
    filter: 'grayscale(1) contrast(1.6) brightness(1.1)',
  },

  title: {
    fontSize: 58,
    fontWeight: 800,
    color: '#ffffff',
    alignment: 'left',
    verticalAlign: 'bottom',
    lineHeight: 1.05,
    maxLines: 3,
    textShadow: '3px 3px 0 rgba(0,0,0,0.8)',
    treatment: 'plain',
  },

  sourceName: {
    style: 'badge',
    position: 'top-left',
    fontSize: 16,
    fontWeight: 800,
    color: '#000000',
    badgeBg: '#ffffff',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 14,
    fontWeight: 800,
    color: '#000000',
    backgroundColor: 'brandColor',
    borderRadius: 0,
    padding: '6px 14px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-right',
    maxHeight: 30,
    margin: 32,
    background: 'white-pill',
  },

  brandColorSlots: ['category-badge'],

  decorations: [
    {
      type: 'dots-grid',
      position: 'top-right-corner',
      width: 120,
      height: 120,
      color: 'brandColor',
      opacity: 0.3,
    },
  ],
};

export default config;
