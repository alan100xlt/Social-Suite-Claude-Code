import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'photo-tilt',
  name: 'Photo Tilt',
  category: 'photo',
  tags: ['dark', 'tilt', 'diagonal', 'dynamic', 'special'],
  requiresImage: true,

  layout: {
    archetype: 'special',
    padding: 56,
    theme: 'dark',
  },

  background: {
    type: 'solid',
    colors: ['#111111'],
  },

  image: {
    position: 'fullbleed',
    overlay: { type: 'dark-gradient-bottom', opacity: 0.7 },
  },

  title: {
    fontSize: 44,
    fontWeight: 700,
    color: '#ffffff',
    alignment: 'left',
    verticalAlign: 'bottom',
    lineHeight: 1.2,
    maxLines: 3,
    textShadow: '0 2px 12px rgba(0,0,0,0.5)',
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'above-title',
    fontSize: 13,
    fontWeight: 700,
    color: '#ffffff',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-title',
    fontSize: 16,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.6)',
    prefix: 'By ',
  },

  logo: {
    position: 'top-right',
    maxHeight: 28,
    margin: 36,
    background: 'frosted',
  },

  brandColorSlots: ['accent-bar', 'background'],

  decorations: [
    {
      type: 'diagonal-shape',
      position: 'left-panel',
      width: 400,
      height: 630,
      color: 'brandColor',
      opacity: 0.15,
    },
    {
      type: 'accent-bar',
      position: 'bottom-edge',
      width: 1200,
      height: 5,
      gradient: 'linear-gradient(90deg, brandColor, transparent)',
    },
  ],
};

export default config;
