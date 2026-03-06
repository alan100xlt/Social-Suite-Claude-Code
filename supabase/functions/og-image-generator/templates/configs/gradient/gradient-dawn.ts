import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'gradient-dawn',
  name: 'Dawn Gradient',
  category: 'gradient',
  tags: ['warm', 'light', 'centered', 'morning'],
  requiresImage: false,

  layout: {
    archetype: 'centered',
    padding: 72,
    theme: 'light',
  },

  background: {
    type: 'linear-gradient',
    colors: ['#FDF2F8', '#FEFCE8', '#FFF7ED'],
    gradientAngle: 90,
  },

  title: {
    fontSize: 52,
    fontWeight: 700,
    fontFamily: 'serif',
    color: '#1C1917',
    alignment: 'center',
    verticalAlign: 'center',
    lineHeight: 1.25,
    maxLines: 4,
  },

  sourceName: {
    style: 'subtle-text',
    position: 'below-title',
    fontSize: 16,
    fontWeight: 500,
    color: '#D97706',
    letterSpacing: 1,
  },

  author: {
    position: 'below-title',
    fontSize: 18,
    fontWeight: 400,
    color: 'rgba(28,25,23,0.5)',
    prefix: 'By ',
  },

  date: {
    position: 'below-author',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(28,25,23,0.35)',
    format: 'short',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 13,
    fontWeight: 700,
    color: '#9A3412',
    backgroundColor: 'rgba(251,191,36,0.2)',
    borderRadius: 20,
    padding: '4px 14px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-left',
    maxHeight: 30,
    margin: 40,
    background: 'none',
  },

  brandColorSlots: [],

  decorations: [
    {
      type: 'accent-bar',
      position: 'below-title',
      width: 100,
      height: 3,
      color: '#F59E0B',
      borderRadius: 2,
    },
  ],
};

export default config;
