import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'gradient-ocean',
  name: 'Ocean Gradient',
  category: 'gradient',
  tags: ['cool', 'deep', 'text-forward', 'ocean'],
  requiresImage: false,

  layout: {
    archetype: 'text-forward',
    padding: 80,
    theme: 'dark',
  },

  background: {
    type: 'linear-gradient',
    colors: ['#0077B6', '#023E8A', '#03045E'],
    gradientAngle: 180,
  },

  title: {
    fontSize: 58,
    fontWeight: 700,
    fontFamily: 'serif',
    color: '#FFFFFF',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.2,
    maxLines: 4,
  },

  description: {
    fontSize: 22,
    fontWeight: 400,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 1.5,
    maxLines: 2,
    marginTop: 20,
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'above-title',
    fontSize: 15,
    fontWeight: 700,
    color: '#48CAE4',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-title',
    fontSize: 18,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.55)',
    prefix: 'By ',
  },

  date: {
    position: 'below-author',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.35)',
    format: 'short',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 13,
    fontWeight: 700,
    color: '#03045E',
    backgroundColor: '#48CAE4',
    borderRadius: 4,
    padding: '4px 12px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-left',
    maxHeight: 30,
    margin: 40,
    background: 'frosted',
  },

  brandColorSlots: [],

  decorations: [
    {
      type: 'divider',
      position: 'below-title',
      width: 100,
      height: 3,
      color: '#48CAE4',
      borderRadius: 2,
    },
  ],
};

export default config;
