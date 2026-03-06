import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'gradient-cool',
  name: 'Cool Gradient',
  category: 'gradient',
  tags: ['cool', 'text-forward', 'icy', 'blue'],
  requiresImage: false,

  layout: {
    archetype: 'text-forward',
    padding: 72,
    theme: 'dark',
  },

  background: {
    type: 'linear-gradient',
    colors: ['#1E3A5F', '#0F2027'],
    gradientAngle: 200,
  },

  title: {
    fontSize: 56,
    fontWeight: 600,
    fontFamily: 'sans',
    color: '#E0F2FE',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.2,
    maxLines: 4,
  },

  description: {
    fontSize: 20,
    fontWeight: 400,
    color: 'rgba(224,242,254,0.5)',
    lineHeight: 1.5,
    maxLines: 2,
    marginTop: 16,
  },

  sourceName: {
    style: 'subtle-text',
    position: 'below-title',
    fontSize: 18,
    fontWeight: 500,
    color: '#7DD3FC',
    letterSpacing: 1,
  },

  author: {
    position: 'below-title',
    fontSize: 16,
    fontWeight: 400,
    color: 'rgba(224,242,254,0.45)',
    prefix: 'By ',
  },

  date: {
    position: 'below-author',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(224,242,254,0.3)',
    format: 'relative',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 12,
    fontWeight: 700,
    color: '#E0F2FE',
    backgroundColor: 'rgba(125,211,252,0.15)',
    borderRadius: 4,
    padding: '4px 12px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-left',
    maxHeight: 30,
    margin: 36,
    background: 'none',
  },

  brandColorSlots: [],

  decorations: [
    {
      type: 'accent-dot',
      position: 'bottom-right-corner',
      width: 400,
      height: 400,
      color: 'rgba(56,189,248,0.08)',
      borderRadius: 200,
      boxShadow: '0 0 100px 50px rgba(56,189,248,0.1)',
    },
  ],
};

export default config;
