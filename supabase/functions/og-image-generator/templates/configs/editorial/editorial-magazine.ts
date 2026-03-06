import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'editorial-magazine',
  name: 'Editorial Magazine',
  category: 'editorial',
  tags: ['light', 'editorial', 'magazine', 'serif', 'elegant'],
  requiresImage: false,

  layout: {
    archetype: 'split-lr',
    splitRatio: [65, 35],
    padding: 64,
    theme: 'light',
  },

  background: {
    type: 'solid',
    colors: ['#FFFBEB'],
  },

  title: {
    fontSize: 56,
    fontWeight: 700,
    color: '#1C1917',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.15,
    maxLines: 4,
  },

  description: {
    fontSize: 20,
    fontWeight: 400,
    color: '#57534E',
    lineHeight: 1.6,
    maxLines: 8,
    marginTop: 0,
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'above-title',
    fontSize: 14,
    fontWeight: 700,
    color: 'brandColor',
    letterSpacing: 5,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-title',
    fontSize: 16,
    fontWeight: 400,
    color: '#78716C',
    prefix: 'By ',
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
    fontSize: 12,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'brandColor',
    borderRadius: 4,
    padding: '3px 10px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-left',
    maxHeight: 28,
    margin: 32,
    background: 'none',
  },

  brandColorSlots: ['source-text', 'category-badge'],

  decorations: [
    {
      type: 'rule',
      position: 'top',
      width: 1072,
      height: 2,
      color: '#292524',
    },
    {
      type: 'column-divider',
      position: 'center-vertical',
      width: 1,
      color: '#D6D3D1',
    },
    {
      type: 'rule',
      position: 'bottom',
      width: 1072,
      height: 2,
      color: '#292524',
    },
    {
      type: 'decorative-lines',
      position: 'right-column',
      color: '#E7E5E4',
      condition: 'no-description',
    },
  ],

  staticLabels: [
    {
      text: 'Editorial',
      position: 'bottom-left',
      fontSize: 12,
      fontWeight: 400,
      color: '#A8A29E',
      textTransform: 'uppercase',
    },
  ],
};

export default config;
