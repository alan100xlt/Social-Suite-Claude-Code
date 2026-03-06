import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'gradient-minimal',
  name: 'Minimal Gradient',
  category: 'gradient',
  tags: ['light', 'clean', 'minimal'],
  requiresImage: false,

  layout: {
    archetype: 'text-forward',
    padding: [0, 80, 80, 80],
    theme: 'light',
  },

  background: {
    type: 'solid',
    colors: ['#FAFAFA'],
  },

  title: {
    fontSize: 52,
    fontWeight: 700,
    color: '#0F172A',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.25,
    maxLines: 4,
  },

  description: {
    fontSize: 22,
    fontWeight: 400,
    color: '#64748B',
    lineHeight: 1.5,
    maxLines: 2,
    marginTop: 28,
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'above-title',
    fontSize: 18,
    fontWeight: 400,
    color: '#94A3B8',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-description',
    fontSize: 18,
    fontWeight: 400,
    color: '#94A3B8',
    prefix: 'By ',
  },

  date: {
    position: 'below-author',
    fontSize: 14,
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
    maxHeight: 28,
    margin: 40,
    background: 'none',
  },

  brandColorSlots: ['accent-bar', 'category-badge'],

  decorations: [
    {
      type: 'accent-bar',
      position: 'top',
      width: 1200,
      height: 6,
      color: 'brandColor',
    },
  ],
};

export default config;
