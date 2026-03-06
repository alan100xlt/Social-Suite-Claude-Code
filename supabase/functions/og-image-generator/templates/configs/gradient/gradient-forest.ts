import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'gradient-forest',
  name: 'Forest Gradient',
  category: 'gradient',
  tags: ['dark', 'nature', 'centered', 'earthy'],
  requiresImage: false,

  layout: {
    archetype: 'centered',
    padding: 80,
    theme: 'dark',
  },

  background: {
    type: 'linear-gradient',
    colors: ['#14532D', '#052E16', '#022C22'],
    gradientAngle: 170,
  },

  title: {
    fontSize: 52,
    fontWeight: 700,
    fontFamily: 'serif',
    color: '#ECFDF5',
    alignment: 'center',
    verticalAlign: 'center',
    lineHeight: 1.25,
    maxLines: 4,
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'above-title',
    fontSize: 14,
    fontWeight: 700,
    color: '#86EFAC',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-title',
    fontSize: 18,
    fontWeight: 400,
    color: 'rgba(236,253,245,0.5)',
    prefix: 'By ',
  },

  date: {
    position: 'below-author',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(236,253,245,0.35)',
    format: 'short',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 12,
    fontWeight: 700,
    color: '#052E16',
    backgroundColor: '#86EFAC',
    borderRadius: 4,
    padding: '3px 10px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-right',
    maxHeight: 28,
    margin: 40,
    background: 'none',
  },

  brandColorSlots: [],

  decorations: [
    {
      type: 'divider',
      position: 'below-title',
      width: 80,
      height: 3,
      color: '#86EFAC',
      borderRadius: 2,
      opacity: 0.6,
    },
  ],
};

export default config;
