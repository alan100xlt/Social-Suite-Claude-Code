import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'gradient-pastel',
  name: 'Pastel Gradient',
  category: 'gradient',
  tags: ['light', 'soft', 'centered', 'pastel'],
  requiresImage: false,

  layout: {
    archetype: 'centered',
    padding: 80,
    theme: 'light',
  },

  background: {
    type: 'linear-gradient',
    colors: ['#FFDEE9', '#B5FFFC'],
    gradientAngle: 135,
  },

  title: {
    fontSize: 54,
    fontWeight: 700,
    fontFamily: 'serif',
    color: '#2D3436',
    alignment: 'center',
    verticalAlign: 'center',
    lineHeight: 1.25,
    maxLines: 4,
  },

  description: {
    fontSize: 22,
    fontWeight: 400,
    color: 'rgba(45, 52, 54, 0.65)',
    lineHeight: 1.5,
    maxLines: 2,
    marginTop: 16,
  },

  sourceName: {
    style: 'subtle-text',
    position: 'below-title',
    fontSize: 18,
    fontWeight: 500,
    color: 'rgba(45, 52, 54, 0.5)',
    letterSpacing: 1,
  },

  author: {
    position: 'below-title',
    fontSize: 18,
    fontWeight: 400,
    color: 'rgba(45, 52, 54, 0.5)',
    prefix: 'By ',
  },

  date: {
    position: 'below-author',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(45, 52, 54, 0.35)',
    format: 'short',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 13,
    fontWeight: 700,
    color: '#2D3436',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 20,
    padding: '4px 14px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-left',
    maxHeight: 32,
    margin: 40,
    background: 'white-pill',
  },

  brandColorSlots: [],

  decorations: [
    {
      type: 'divider',
      position: 'below-title',
      width: 80,
      height: 3,
      color: 'rgba(45, 52, 54, 0.2)',
      borderRadius: 2,
    },
  ],
};

export default config;
