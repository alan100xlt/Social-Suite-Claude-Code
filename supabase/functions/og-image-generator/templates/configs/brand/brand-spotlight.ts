import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'brand-spotlight',
  name: 'Brand Spotlight',
  category: 'brand',
  tags: ['dark', 'spotlight', 'text-forward', 'gradient', 'modern'],
  requiresImage: false,

  layout: {
    archetype: 'text-forward',
    padding: [72, 80, 72, 80],
    theme: 'dark',
  },

  background: {
    type: 'radial-gradient',
    colors: ['brandColorSecondary', '#0A0A0F'],
  },

  title: {
    fontSize: 54,
    fontWeight: 700,
    fontFamily: 'sans',
    color: '#FFFFFF',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.2,
    maxLines: 4,
    treatment: 'gradient-text',
  },

  description: {
    fontSize: 18,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 1.5,
    maxLines: 2,
    marginTop: 20,
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'above-title',
    fontSize: 14,
    fontWeight: 600,
    color: 'brandColor',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-title',
    fontSize: 16,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.4)',
    prefix: 'By ',
  },

  date: {
    position: 'below-author',
    fontSize: 13,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.2)',
    format: 'short',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 12,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    padding: '4px 12px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-left',
    maxHeight: 28,
    margin: 40,
    background: 'frosted',
  },

  brandColorSlots: ['source-text', 'gradient-start', 'gradient-end'],

  decorations: [
    {
      type: 'glow-circle',
      position: 'top-right',
      width: 600,
      height: 600,
      borderRadius: 300,
      color: 'brandColor',
      opacity: 0.08,
    },
    {
      type: 'accent-bar',
      position: 'left',
      width: 4,
      height: 140,
      color: 'brandColor',
      borderRadius: 2,
    },
  ],
};

export default config;
