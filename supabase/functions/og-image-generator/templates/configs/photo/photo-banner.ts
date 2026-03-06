import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'photo-banner',
  name: 'Photo Banner',
  category: 'photo',
  tags: ['dark', 'banner', 'bold', 'brand-bar'],
  requiresImage: true,

  layout: {
    archetype: 'banner',
    padding: 48,
    theme: 'dark',
  },

  background: {
    type: 'image-fullbleed',
    colors: [],
  },

  image: {
    position: 'fullbleed',
    overlay: { type: 'dark-gradient-bottom', opacity: 0.85 },
  },

  title: {
    fontSize: 48,
    fontWeight: 800,
    color: '#ffffff',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.15,
    maxLines: 3,
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
    fontSize: 13,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'brandColor',
    borderRadius: 4,
    padding: '5px 12px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-left',
    maxHeight: 30,
    margin: 32,
    background: 'white-pill',
  },

  brandColorSlots: ['banner-bg', 'category-badge'],

  decorations: [
    {
      type: 'banner-bar',
      position: 'bottom',
      width: 1200,
      height: 48,
      color: 'brandColor',
      opacity: 0.95,
    },
  ],
};

export default config;
