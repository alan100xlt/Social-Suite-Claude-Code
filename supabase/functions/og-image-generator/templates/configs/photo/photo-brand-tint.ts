import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'photo-brand-tint',
  name: 'Photo Brand Tint',
  category: 'photo',
  tags: ['dark', 'brand', 'tint', 'colorful', 'overlay'],
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
    overlay: { type: 'brand-tint', opacity: 0.55 },
    filter: 'saturate(0.7)',
  },

  title: {
    fontSize: 52,
    fontWeight: 800,
    color: '#ffffff',
    alignment: 'left',
    verticalAlign: 'bottom',
    lineHeight: 1.1,
    maxLines: 3,
    textShadow: '0 3px 20px rgba(0,0,0,0.4)',
  },

  sourceName: {
    style: 'badge',
    position: 'top-left',
    fontSize: 15,
    fontWeight: 700,
    color: '#ffffff',
    badgeBg: 'rgba(0,0,0,0.5)',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 13,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    padding: '4px 12px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-right',
    maxHeight: 32,
    margin: 36,
    background: 'white-pill',
  },

  brandColorSlots: ['overlay'],

  decorations: [],
};

export default config;
