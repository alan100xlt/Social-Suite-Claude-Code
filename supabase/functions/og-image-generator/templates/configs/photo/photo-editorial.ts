import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'photo-editorial',
  name: 'Photo Editorial',
  category: 'photo',
  tags: ['light', 'editorial', 'clean', 'serif', 'classic'],
  requiresImage: true,

  layout: {
    archetype: 'split-tb',
    splitRatio: [50, 50],
    padding: 40,
    theme: 'light',
  },

  background: {
    type: 'solid',
    colors: ['#ffffff'],
  },

  image: {
    position: 'top-panel',
    panelPercent: 50,
    borderRadius: 8,
  },

  title: {
    fontSize: 34,
    fontWeight: 700,
    fontFamily: 'serif',
    color: '#111111',
    alignment: 'left',
    verticalAlign: 'top',
    lineHeight: 1.3,
    maxLines: 3,
  },

  description: {
    fontSize: 18,
    fontWeight: 400,
    color: '#555555',
    lineHeight: 1.5,
    maxLines: 2,
    marginTop: 16,
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'above-title',
    fontSize: 11,
    fontWeight: 800,
    color: 'brandColor',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-description',
    fontSize: 14,
    fontWeight: 500,
    color: '#333333',
    prefix: '',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  date: {
    position: 'inline-with-author',
    fontSize: 14,
    fontWeight: 400,
    color: '#999999',
    format: 'long',
  },

  logo: {
    position: 'top-left',
    maxHeight: 24,
    margin: 40,
    background: 'none',
  },

  brandColorSlots: ['source-text', 'accent-bar'],

  decorations: [
    {
      type: 'accent-bar',
      position: 'top-edge',
      width: 1200,
      height: 4,
      color: 'brandColor',
    },
  ],
};

export default config;
