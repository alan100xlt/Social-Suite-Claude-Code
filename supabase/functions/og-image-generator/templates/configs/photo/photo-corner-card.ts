import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'photo-corner-card',
  name: 'Photo Corner Card',
  category: 'photo',
  tags: ['dark', 'card', 'corner', 'overlay', 'compact'],
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
    overlay: { type: 'solid-dim', opacity: 0.25 },
  },

  title: {
    fontSize: 34,
    fontWeight: 700,
    color: '#ffffff',
    alignment: 'left',
    verticalAlign: 'bottom',
    lineHeight: 1.25,
    maxLines: 4,
  },

  description: {
    fontSize: 16,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 1.4,
    maxLines: 2,
    marginTop: 12,
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'above-title',
    fontSize: 12,
    fontWeight: 700,
    color: 'brandColor',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  date: {
    position: 'below-title',
    fontSize: 13,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.4)',
    format: 'relative',
  },

  logo: {
    position: 'top-left',
    maxHeight: 24,
    margin: 20,
    background: 'frosted',
  },

  brandColorSlots: ['source-text', 'card-border'],

  decorations: [],

  card: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.1)',
    padding: 32,
    maxWidth: 520,
  },
};

export default config;
