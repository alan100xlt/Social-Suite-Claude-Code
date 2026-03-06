import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'brand-statement',
  name: 'Brand Statement',
  category: 'brand',
  tags: ['dark', 'statement', 'centered', 'bold', 'impact'],
  requiresImage: false,

  layout: {
    archetype: 'centered',
    padding: [80, 100, 80, 100],
    theme: 'dark',
  },

  background: {
    type: 'linear-gradient',
    colors: ['#0F172A', '#1E293B'],
    gradientAngle: 160,
  },

  title: {
    fontSize: 58,
    fontWeight: 800,
    fontFamily: 'sans',
    color: '#FFFFFF',
    alignment: 'center',
    verticalAlign: 'center',
    lineHeight: 1.15,
    maxLines: 3,
  },

  description: {
    fontSize: 20,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 1.5,
    maxLines: 2,
    marginTop: 24,
  },

  sourceName: {
    style: 'subtle-text',
    position: 'below-title',
    fontSize: 18,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
  },

  author: {
    position: 'below-title',
    fontSize: 16,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.35)',
  },

  date: {
    position: 'below-author',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.2)',
    format: 'short',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 13,
    fontWeight: 700,
    color: '#0F172A',
    backgroundColor: 'brandColor',
    borderRadius: 40,
    padding: '6px 20px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-left',
    maxHeight: 30,
    margin: 44,
    background: 'frosted',
  },

  brandColorSlots: ['category-badge', 'accent-bar', 'accent-dot'],

  decorations: [
    {
      type: 'accent-bar',
      position: 'bottom',
      width: 1200,
      height: 5,
      color: 'brandColor',
    },
    {
      type: 'accent-dot',
      position: 'center-below-title',
      width: 8,
      height: 8,
      borderRadius: 4,
      color: 'brandColor',
    },
    {
      type: 'grid-pattern',
      position: 'fullbleed',
      color: 'rgba(255,255,255,1)',
      opacity: 0.02,
    },
  ],
};

export default config;
