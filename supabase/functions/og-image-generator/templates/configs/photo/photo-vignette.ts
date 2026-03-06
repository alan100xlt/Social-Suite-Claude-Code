import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'photo-vignette',
  name: 'Photo Vignette',
  category: 'photo',
  tags: ['dark', 'vignette', 'centered', 'elegant'],
  requiresImage: true,

  layout: {
    archetype: 'centered',
    padding: 80,
    theme: 'dark',
  },

  background: {
    type: 'image-fullbleed',
    colors: [],
  },

  image: {
    position: 'fullbleed',
    overlay: { type: 'dark-gradient-radial', opacity: 0.8 },
  },

  title: {
    fontSize: 44,
    fontWeight: 600,
    fontFamily: 'serif',
    color: '#ffffff',
    alignment: 'center',
    verticalAlign: 'center',
    lineHeight: 1.25,
    maxLines: 4,
    textShadow: '0 2px 20px rgba(0,0,0,0.5)',
  },

  sourceName: {
    style: 'subtle-text',
    position: 'below-title',
    fontSize: 18,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.6)',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 12,
    fontWeight: 700,
    color: 'brandColor',
    borderRadius: 0,
    padding: '4px 0',
    textTransform: 'uppercase',
  },

  date: {
    position: 'below-title',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.4)',
    format: 'short',
  },

  logo: {
    position: 'bottom-right',
    maxHeight: 28,
    margin: 32,
    background: 'frosted',
  },

  brandColorSlots: ['category-badge'],

  decorations: [
    {
      type: 'accent-bar',
      position: 'above-title-center',
      width: 48,
      height: 2,
      color: 'brandColor',
      borderRadius: 1,
    },
    {
      type: 'accent-bar',
      position: 'below-title-center',
      width: 48,
      height: 2,
      color: 'brandColor',
      borderRadius: 1,
    },
  ],
};

export default config;
