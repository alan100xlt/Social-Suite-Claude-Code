import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'photo-profile',
  name: 'Photo Profile',
  category: 'photo',
  tags: ['light', 'profile', 'split', 'clean', 'author-focused'],
  requiresImage: true,

  layout: {
    archetype: 'split-lr',
    splitRatio: [40, 60],
    padding: [48, 48, 48, 48],
    theme: 'light',
  },

  background: {
    type: 'solid',
    colors: ['#f7f7f7'],
  },

  image: {
    position: 'left-panel',
    panelPercent: 40,
    borderRadius: 12,
  },

  title: {
    fontSize: 30,
    fontWeight: 600,
    color: '#222222',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.3,
    maxLines: 3,
  },

  description: {
    fontSize: 17,
    fontWeight: 400,
    color: '#777777',
    lineHeight: 1.5,
    maxLines: 3,
    marginTop: 16,
  },

  sourceName: {
    style: 'subtle-text',
    position: 'above-title',
    fontSize: 14,
    fontWeight: 400,
    color: '#aaaaaa',
  },

  author: {
    position: 'below-description',
    fontSize: 16,
    fontWeight: 700,
    color: '#333333',
    prefix: '',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  date: {
    position: 'below-author',
    fontSize: 13,
    fontWeight: 400,
    color: '#bbbbbb',
    format: 'long',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 11,
    fontWeight: 700,
    color: 'brandColor',
    borderRadius: 0,
    padding: '0',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'bottom-right',
    maxHeight: 22,
    margin: 32,
    background: 'none',
  },

  brandColorSlots: ['category-badge', 'accent-dot'],

  decorations: [
    {
      type: 'accent-dot',
      position: 'left-of-author',
      width: 10,
      height: 10,
      color: 'brandColor',
      borderRadius: 5,
    },
  ],
};

export default config;
