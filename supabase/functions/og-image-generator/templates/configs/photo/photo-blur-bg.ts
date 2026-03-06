import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'photo-blur-bg',
  name: 'Photo Blur Background',
  category: 'photo',
  tags: ['dark', 'blur', 'card', 'glass', 'modern'],
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
    overlay: { type: 'blur', opacity: 0.6 },
  },

  title: {
    fontSize: 42,
    fontWeight: 700,
    color: '#ffffff',
    alignment: 'center',
    verticalAlign: 'center',
    lineHeight: 1.2,
    maxLines: 3,
  },

  description: {
    fontSize: 20,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.75)',
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

  categoryTag: {
    position: 'above-title',
    fontSize: 12,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'brandColor',
    borderRadius: 20,
    padding: '5px 14px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-right',
    maxHeight: 28,
    margin: 36,
    background: 'frosted',
  },

  brandColorSlots: ['category-badge', 'card-border'],

  decorations: [],

  card: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 20,
    border: '1px solid rgba(255,255,255,0.12)',
    padding: 48,
    backdropFilter: 'blur(30px)',
    maxWidth: 860,
  },
};

export default config;
