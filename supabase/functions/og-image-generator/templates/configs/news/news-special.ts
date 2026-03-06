import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'news-special',
  name: 'News Special',
  category: 'news',
  tags: ['dark', 'photo', 'fullbleed', 'special-report', 'cinematic'],
  requiresImage: true,

  layout: {
    archetype: 'fullbleed',
    padding: 56,
    theme: 'dark',
  },

  background: {
    type: 'image-fullbleed',
    colors: ['#0A0A0A'],
  },

  image: {
    position: 'fullbleed',
    overlay: {
      type: 'brand-duotone',
      opacity: 0.7,
    },
    filter: 'contrast(1.1)',
  },

  title: {
    fontSize: 52,
    fontWeight: 700,
    fontFamily: 'serif',
    color: '#FFFFFF',
    alignment: 'center',
    verticalAlign: 'bottom',
    lineHeight: 1.2,
    maxLines: 4,
    textShadow: '0 4px 20px rgba(0,0,0,0.6)',
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'top-left',
    fontSize: 14,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-title',
    fontSize: 16,
    fontWeight: 500,
    color: 'rgba(255,255,255,0.7)',
    prefix: 'By ',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  date: {
    position: 'bottom-bar',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.5)',
    format: 'long',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 12,
    fontWeight: 700,
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    padding: '4px 12px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-right',
    maxHeight: 32,
    margin: 40,
    background: 'frosted',
  },

  brandColorSlots: ['overlay'],

  decorations: [
    {
      type: 'divider',
      position: 'above-title',
      width: 120,
      height: 2,
      color: 'rgba(255,255,255,0.4)',
    },
  ],

  staticLabels: [
    {
      text: 'Special Report',
      position: 'above-title',
      fontSize: 14,
      fontWeight: 700,
      color: '#FBBF24',
      textTransform: 'uppercase',
    },
  ],

  behavior: {
    showDate: true,
  },
};

export default config;
