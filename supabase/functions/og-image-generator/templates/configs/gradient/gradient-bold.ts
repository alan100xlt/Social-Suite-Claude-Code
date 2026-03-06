import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'gradient-bold',
  name: 'Bold Gradient',
  category: 'gradient',
  tags: ['bold', 'vibrant', 'large-text'],
  requiresImage: false,

  layout: {
    archetype: 'text-forward',
    padding: 80,
    theme: 'dark',
  },

  background: {
    type: 'linear-gradient',
    colors: ['#EC4899', '#F97316'],
    gradientAngle: 135,
  },

  title: {
    fontSize: 72,
    fontWeight: 700,
    color: '#FFFFFF',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.1,
    maxLines: 5,
  },

  sourceName: {
    style: 'subtle-text',
    position: 'below-title',
    fontSize: 22,
    fontWeight: 700,
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 1,
  },

  author: {
    position: 'below-title',
    fontSize: 20,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.7)',
    prefix: 'By ',
  },

  date: {
    position: 'below-author',
    fontSize: 16,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.5)',
    format: 'short',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 14,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.9)',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 4,
    padding: '4px 12px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-right',
    maxHeight: 32,
    margin: 40,
    background: 'white-pill',
  },

  brandColorSlots: [],

  decorations: [],
};

export default config;
