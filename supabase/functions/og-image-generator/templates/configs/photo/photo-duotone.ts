import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'photo-duotone',
  name: 'Photo Duotone',
  category: 'photo',
  tags: ['dark', 'bold', 'duotone', 'centered'],
  requiresImage: true,

  layout: {
    archetype: 'fullbleed',
    padding: 80,
    theme: 'dark',
  },

  background: {
    type: 'image-fullbleed',
    colors: [],
  },

  image: {
    position: 'fullbleed',
    overlay: { type: 'brand-duotone', opacity: 0.75 },
    filter: 'grayscale(100%) contrast(1.2)',
  },

  title: {
    fontSize: 60,
    fontWeight: 700,
    color: '#ffffff',
    alignment: 'center',
    verticalAlign: 'center',
    lineHeight: 1.15,
    maxLines: 4,
    textShadow: '0 2px 20px rgba(0,0,0,0.3)',
  },

  sourceName: {
    style: 'subtle-text',
    position: 'below-title',
    fontSize: 20,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.7)',
  },

  author: {
    position: 'below-title',
    fontSize: 20,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.7)',
    prefix: 'By ',
  },

  date: {
    position: 'below-author',
    fontSize: 16,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.5)',
    format: 'short',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 14,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 4,
    padding: '4px 12px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-right',
    maxHeight: 32,
    margin: 32,
    background: 'frosted',
  },

  brandColorSlots: ['overlay'],

  decorations: [],
};

export default config;
