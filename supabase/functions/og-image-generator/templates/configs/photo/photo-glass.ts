import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'photo-glass',
  name: 'Photo Glass',
  category: 'photo',
  tags: ['dark', 'glass', 'card', 'overlay'],
  requiresImage: true,

  layout: {
    archetype: 'card',
    padding: 0,
    theme: 'dark',
  },

  background: {
    type: 'image-fullbleed',
    colors: [],
  },

  image: {
    position: 'fullbleed',
    overlay: { type: 'solid-dim', opacity: 0.3 },
  },

  title: {
    fontSize: 46,
    fontWeight: 700,
    color: '#ffffff',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.2,
    maxLines: 3,
  },

  description: {
    fontSize: 22,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 1.4,
    maxLines: 2,
    marginTop: 20,
  },

  sourceName: {
    style: 'subtle-text',
    position: 'below-title',
    fontSize: 18,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.6)',
  },

  author: {
    position: 'below-description',
    fontSize: 18,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.6)',
    prefix: 'By ',
  },

  date: {
    position: 'below-author',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.4)',
    format: 'short',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 13,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'brandColor',
    borderRadius: 4,
    padding: '4px 10px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-right',
    maxHeight: 28,
    margin: 32,
    background: 'frosted',
  },

  brandColorSlots: ['accent-bar', 'category-badge'],

  decorations: [
    {
      type: 'accent-bar',
      position: 'card-top',
      width: 64,
      height: 6,
      color: 'brandColor',
      borderRadius: 3,
    },
  ],

  card: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 24,
    border: '1px solid rgba(255,255,255,0.25)',
    padding: 48,
    backdropFilter: 'blur(20px)',
    maxWidth: 880,
  },
};

export default config;
