import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'editorial-column',
  name: 'Editorial Column',
  category: 'editorial',
  tags: ['light', 'column', 'text-forward', 'serif', 'classic'],
  requiresImage: false,

  layout: {
    archetype: 'text-forward',
    padding: [80, 80, 80, 100],
    theme: 'light',
  },

  background: {
    type: 'solid',
    colors: ['#FFFFF8'],
  },

  title: {
    fontSize: 46,
    fontWeight: 400,
    fontFamily: 'serif',
    color: '#292524',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.35,
    maxLines: 4,
    treatment: 'highlight-segments',
  },

  description: {
    fontSize: 18,
    fontWeight: 400,
    color: '#78716C',
    lineHeight: 1.6,
    maxLines: 3,
    marginTop: 20,
  },

  sourceName: {
    style: 'subtle-text',
    position: 'above-title',
    fontSize: 14,
    fontWeight: 400,
    color: '#A8A29E',
    letterSpacing: 2,
  },

  author: {
    position: 'below-title',
    fontSize: 18,
    fontWeight: 700,
    color: '#44403C',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  date: {
    position: 'below-author',
    fontSize: 14,
    fontWeight: 400,
    color: '#A8A29E',
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
    position: 'top-left',
    maxHeight: 26,
    margin: 40,
    background: 'none',
  },

  brandColorSlots: ['highlight-bg', 'accent-bar', 'category-badge'],

  decorations: [
    {
      type: 'accent-bar',
      position: 'left',
      width: 3,
      height: 160,
      color: 'brandColor',
      borderRadius: 2,
    },
    {
      type: 'rule',
      position: 'top',
      width: 1000,
      height: 3,
      color: '#292524',
    },
    {
      type: 'rule',
      position: 'below-top-rule',
      width: 1000,
      height: 1,
      color: '#292524',
    },
  ],

  staticLabels: [
    {
      text: 'Column',
      position: 'top-right',
      fontSize: 12,
      fontWeight: 700,
      color: '#78716C',
      textTransform: 'uppercase',
    },
  ],
};

export default config;
