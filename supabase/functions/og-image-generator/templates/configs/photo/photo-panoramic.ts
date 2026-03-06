import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'photo-panoramic',
  name: 'Photo Panoramic',
  category: 'photo',
  tags: ['dark', 'panoramic', 'wide', 'banner'],
  requiresImage: true,

  layout: {
    archetype: 'banner',
    padding: [0, 48, 0, 48],
    theme: 'dark',
  },

  background: {
    type: 'solid',
    colors: ['#000000'],
  },

  image: {
    position: 'top-panel',
    panelPercent: 55,
    edgeBlend: { side: 'bottom', width: 120 },
  },

  title: {
    fontSize: 42,
    fontWeight: 700,
    color: '#ffffff',
    alignment: 'center',
    verticalAlign: 'bottom',
    lineHeight: 1.2,
    maxLines: 2,
  },

  description: {
    fontSize: 20,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 1.4,
    maxLines: 2,
    marginTop: 16,
  },

  sourceName: {
    style: 'subtle-text',
    position: 'below-title',
    fontSize: 16,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.5)',
  },

  logo: {
    position: 'bottom-right',
    maxHeight: 24,
    margin: 28,
    background: 'none',
  },

  brandColorSlots: ['accent-bar'],

  decorations: [
    {
      type: 'accent-bar',
      position: 'center-divider',
      width: 80,
      height: 3,
      color: 'brandColor',
      borderRadius: 2,
    },
  ],
};

export default config;
