import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'photo-mosaic',
  name: 'Photo Mosaic',
  category: 'photo',
  tags: ['dark', 'card', 'mosaic', 'framed'],
  requiresImage: true,

  layout: {
    archetype: 'card',
    padding: 0,
    theme: 'dark',
  },

  background: {
    type: 'solid',
    colors: ['#0a0a0a'],
  },

  image: {
    position: 'framed',
    borderRadius: 16,
  },

  title: {
    fontSize: 40,
    fontWeight: 700,
    color: '#ffffff',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.2,
    maxLines: 3,
  },

  description: {
    fontSize: 18,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 1.5,
    maxLines: 2,
    marginTop: 16,
  },

  sourceName: {
    style: 'badge',
    position: 'top-right',
    fontSize: 14,
    fontWeight: 700,
    color: '#ffffff',
    badgeBg: 'brandColor',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 12,
    fontWeight: 700,
    color: 'brandColor',
    borderRadius: 0,
    padding: '0',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'bottom-left',
    maxHeight: 24,
    margin: 32,
    background: 'none',
  },

  brandColorSlots: ['badge-bg', 'category-badge', 'card-border'],

  decorations: [],

  card: {
    backgroundColor: '#151515',
    borderRadius: 20,
    border: '1px solid rgba(255,255,255,0.08)',
    padding: 40,
    maxWidth: 920,
  },
};

export default config;
