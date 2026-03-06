import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'editorial-longform',
  name: 'Editorial Longform',
  category: 'editorial',
  tags: ['light', 'longform', 'serif', 'text-forward', 'literary'],
  requiresImage: false,

  layout: {
    archetype: 'text-forward',
    padding: [72, 80, 72, 80],
    theme: 'light',
  },

  background: {
    type: 'solid',
    colors: ['#FAF9F6'],
  },

  title: {
    fontSize: 52,
    fontWeight: 400,
    fontFamily: 'serif',
    color: '#1A1A1A',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.35,
    maxLines: 4,
  },

  description: {
    fontSize: 20,
    fontWeight: 400,
    color: '#6B6B6B',
    lineHeight: 1.6,
    maxLines: 3,
    marginTop: 24,
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'above-title',
    fontSize: 13,
    fontWeight: 600,
    color: 'brandColor',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-title',
    fontSize: 16,
    fontWeight: 400,
    color: '#8C8C8C',
    prefix: 'By ',
    letterSpacing: 1,
  },

  date: {
    position: 'below-author',
    fontSize: 14,
    fontWeight: 400,
    color: '#ABABAB',
    format: 'long',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 11,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'brandColor',
    borderRadius: 3,
    padding: '3px 10px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'bottom-right',
    maxHeight: 24,
    margin: 40,
    background: 'none',
  },

  brandColorSlots: ['source-text', 'accent-bar', 'category-badge'],

  decorations: [
    {
      type: 'accent-bar',
      position: 'left',
      width: 4,
      height: 200,
      color: 'brandColor',
      borderRadius: 2,
    },
    {
      type: 'rule',
      position: 'top',
      width: 1040,
      height: 1,
      color: '#E0DDD8',
    },
    {
      type: 'rule',
      position: 'bottom',
      width: 1040,
      height: 1,
      color: '#E0DDD8',
    },
  ],

  staticLabels: [
    {
      text: 'Longform',
      position: 'bottom-left',
      fontSize: 11,
      fontWeight: 400,
      color: '#ABABAB',
      textTransform: 'uppercase',
    },
  ],
};

export default config;
