import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'photo-hero',
  name: 'Photo Hero',
  category: 'photo',
  tags: ['dark', 'bold', 'overlay'],
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
    overlay: { type: 'dark-gradient-bottom', opacity: 0.85 },
  },

  title: {
    fontSize: 52,
    fontWeight: 700,
    color: '#ffffff',
    alignment: 'left',
    verticalAlign: 'bottom',
    lineHeight: 1.2,
    maxLines: 3,
    textShadow: '0 2px 12px rgba(0,0,0,0.5)',
  },

  sourceName: {
    style: 'badge',
    position: 'top-left',
    fontSize: 18,
    fontWeight: 700,
    color: '#ffffff',
    badgeBg: 'brandColor',
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
    backgroundColor: 'category-coded',
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

  brandColorSlots: ['badge-bg', 'category-badge'],

  decorations: [],
};

export default config;
