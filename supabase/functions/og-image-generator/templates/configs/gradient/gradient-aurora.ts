import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'gradient-aurora',
  name: 'Aurora Gradient',
  category: 'gradient',
  tags: ['dark', 'aurora', 'centered', 'ethereal'],
  requiresImage: false,

  layout: {
    archetype: 'centered',
    padding: 80,
    theme: 'dark',
  },

  background: {
    type: 'radial-gradient',
    colors: ['#064E3B', '#0F172A', '#1E1B4B'],
  },

  title: {
    fontSize: 54,
    fontWeight: 600,
    fontFamily: 'sans',
    color: '#FFFFFF',
    alignment: 'center',
    verticalAlign: 'center',
    lineHeight: 1.25,
    maxLines: 4,
    textShadow: '0 2px 30px rgba(52,211,153,0.2)',
  },

  description: {
    fontSize: 20,
    fontWeight: 400,
    color: 'rgba(255, 255, 255, 0.5)',
    lineHeight: 1.5,
    maxLines: 2,
    marginTop: 20,
  },

  sourceName: {
    style: 'subtle-text',
    position: 'below-title',
    fontSize: 17,
    fontWeight: 400,
    color: '#34D399',
    letterSpacing: 1,
  },

  author: {
    position: 'below-title',
    fontSize: 17,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.45)',
    prefix: 'By ',
  },

  date: {
    position: 'below-author',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.3)',
    format: 'short',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 12,
    fontWeight: 700,
    color: '#D1FAE5',
    backgroundColor: 'rgba(52,211,153,0.15)',
    borderRadius: 20,
    padding: '4px 14px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-left',
    maxHeight: 28,
    margin: 40,
    background: 'none',
  },

  brandColorSlots: [],

  decorations: [
    {
      type: 'accent-dot',
      position: 'top-center',
      width: 600,
      height: 200,
      color: 'rgba(52,211,153,0.08)',
      borderRadius: 100,
      boxShadow: '0 0 150px 80px rgba(52,211,153,0.12)',
    },
    {
      type: 'accent-dot',
      position: 'bottom-left-corner',
      width: 300,
      height: 300,
      color: 'rgba(129,140,248,0.06)',
      borderRadius: 150,
      boxShadow: '0 0 100px 50px rgba(129,140,248,0.1)',
    },
  ],
};

export default config;
