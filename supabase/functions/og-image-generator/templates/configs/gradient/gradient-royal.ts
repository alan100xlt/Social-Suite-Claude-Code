import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'gradient-royal',
  name: 'Royal Gradient',
  category: 'gradient',
  tags: ['dark', 'luxury', 'card', 'regal'],
  requiresImage: false,

  layout: {
    archetype: 'card',
    padding: 56,
    theme: 'dark',
  },

  background: {
    type: 'linear-gradient',
    colors: ['brandColor', '#1E1B4B'],
    gradientAngle: 145,
  },

  title: {
    fontSize: 48,
    fontWeight: 700,
    fontFamily: 'serif',
    color: '#FFFFFF',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.2,
    maxLines: 4,
  },

  description: {
    fontSize: 20,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 1.5,
    maxLines: 2,
    marginTop: 20,
  },

  sourceName: {
    style: 'badge',
    position: 'above-title',
    fontSize: 14,
    fontWeight: 700,
    color: '#FBBF24',
    badgeBg: 'rgba(251,191,36,0.1)',
  },

  author: {
    position: 'below-description',
    fontSize: 16,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.5)',
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
    color: '#FBBF24',
    backgroundColor: 'rgba(251,191,36,0.1)',
    borderRadius: 4,
    padding: '3px 10px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-right',
    maxHeight: 28,
    margin: 32,
    background: 'none',
  },

  brandColorSlots: ['gradient-start'],

  decorations: [
    {
      type: 'accent-bar',
      position: 'card-top',
      width: 80,
      height: 3,
      gradient: 'linear-gradient(90deg, #FBBF24, #F59E0B)',
      borderRadius: 2,
    },
  ],

  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 20,
    border: '1px solid rgba(251,191,36,0.15)',
    padding: 56,
    maxWidth: 980,
  },
};

export default config;
