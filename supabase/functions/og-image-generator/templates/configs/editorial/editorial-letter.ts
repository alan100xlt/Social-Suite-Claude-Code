import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'editorial-letter',
  name: 'Editorial Letter',
  category: 'editorial',
  tags: ['light', 'letter', 'centered', 'serif', 'personal', 'elegant'],
  requiresImage: false,

  layout: {
    archetype: 'centered',
    padding: [80, 120, 80, 120],
    theme: 'light',
  },

  background: {
    type: 'solid',
    colors: ['#F7F5F0'],
  },

  title: {
    fontSize: 40,
    fontWeight: 400,
    fontFamily: 'serif',
    color: '#2C2825',
    alignment: 'center',
    verticalAlign: 'center',
    lineHeight: 1.5,
    maxLines: 5,
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'above-title',
    fontSize: 12,
    fontWeight: 600,
    color: '#A09890',
    letterSpacing: 6,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-title',
    fontSize: 20,
    fontWeight: 400,
    color: '#5C5550',
    prefix: '',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  date: {
    position: 'below-author',
    fontSize: 14,
    fontWeight: 400,
    color: '#B0A8A0',
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
    position: 'bottom-left',
    maxHeight: 22,
    margin: 40,
    background: 'none',
  },

  brandColorSlots: ['divider', 'accent-dot', 'category-badge'],

  decorations: [
    {
      type: 'ornamental-rule',
      position: 'above-title',
      width: 80,
      height: 1,
      color: '#C0B8B0',
    },
    {
      type: 'accent-dot',
      position: 'center-above-title',
      width: 6,
      height: 6,
      borderRadius: 3,
      color: 'brandColor',
    },
    {
      type: 'ornamental-rule',
      position: 'below-title',
      width: 80,
      height: 1,
      color: '#C0B8B0',
    },
    {
      type: 'border-frame',
      position: 'inset',
      color: '#D8D0C8',
      opacity: 0.5,
    },
  ],

  staticLabels: [
    {
      text: 'A Letter From The Editor',
      position: 'top-center',
      fontSize: 10,
      fontWeight: 600,
      color: '#B0A8A0',
      textTransform: 'uppercase',
    },
  ],
};

export default config;
