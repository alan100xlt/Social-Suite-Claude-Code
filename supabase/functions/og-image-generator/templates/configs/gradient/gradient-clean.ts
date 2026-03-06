import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'gradient-clean',
  name: 'Clean Gradient',
  category: 'gradient',
  tags: ['dark', 'centered', 'minimal'],
  requiresImage: false,

  layout: {
    archetype: 'centered',
    padding: 80,
    theme: 'dark',
  },

  background: {
    type: 'linear-gradient',
    colors: ['brandColor', '#0F172A'],
    gradientAngle: 180,
  },

  title: {
    fontSize: 56,
    fontWeight: 700,
    color: '#FFFFFF',
    alignment: 'center',
    verticalAlign: 'center',
    lineHeight: 1.2,
    maxLines: 4,
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'below-title',
    fontSize: 24,
    fontWeight: 400,
    color: 'rgba(255, 255, 255, 0.75)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-title',
    fontSize: 20,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.6)',
    prefix: 'By ',
  },

  date: {
    position: 'below-author',
    fontSize: 16,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.4)',
    format: 'short',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 14,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
    padding: '4px 12px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-left',
    maxHeight: 32,
    margin: 40,
    background: 'none',
  },

  brandColorSlots: ['gradient-start'],

  decorations: [
    {
      type: 'divider',
      position: 'below-title',
      width: 120,
      height: 4,
      color: 'rgba(255, 255, 255, 0.5)',
      borderRadius: 2,
    },
  ],
};

export default config;
