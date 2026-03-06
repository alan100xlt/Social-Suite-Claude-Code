import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'brand-minimal',
  name: 'Brand Minimal',
  category: 'brand',
  tags: ['light', 'clean', 'minimal', 'professional'],
  requiresImage: false,

  layout: {
    archetype: 'text-forward',
    padding: 80,
    theme: 'light',
  },

  background: {
    type: 'solid',
    colors: ['#FFFFFF'],
  },

  title: {
    fontSize: 64,
    fontWeight: 700,
    color: '#0F172A',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.15,
    maxLines: 4,
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'top-right',
    fontSize: 18,
    fontWeight: 400,
    color: '#94A3B8',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-title',
    fontSize: 20,
    fontWeight: 400,
    color: '#94A3B8',
    prefix: 'By ',
  },

  date: {
    position: 'below-author',
    fontSize: 16,
    fontWeight: 400,
    color: '#B0B8C4',
    format: 'short',
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
    maxHeight: 32,
    margin: 48,
    background: 'none',
  },

  brandColorSlots: ['accent-bar', 'category-badge'],

  decorations: [
    {
      type: 'accent-bar',
      position: 'bottom',
      width: 1200,
      height: 6,
      color: 'brandColor',
    },
  ],
};

export default config;
