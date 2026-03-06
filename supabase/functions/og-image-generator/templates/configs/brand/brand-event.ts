import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'brand-event',
  name: 'Brand Event',
  category: 'brand',
  tags: ['dark', 'event', 'calendar', 'gradient'],
  requiresImage: false,

  layout: {
    archetype: 'special',
    padding: 80,
    theme: 'dark',
  },

  background: {
    type: 'linear-gradient',
    colors: ['brandColor', '#0F172A'],
    gradientAngle: 135,
  },

  title: {
    fontSize: 48,
    fontWeight: 700,
    color: '#FFFFFF',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.2,
    maxLines: 4,
  },

  description: {
    fontSize: 22,
    fontWeight: 400,
    color: 'rgba(255, 255, 255, 0.65)',
    lineHeight: 1.4,
    maxLines: 2,
    marginTop: 20,
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'bottom-bar',
    fontSize: 18,
    fontWeight: 400,
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-description',
    fontSize: 18,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.5)',
    prefix: 'By ',
  },

  date: {
    position: 'inline-with-author',
    fontSize: 72,
    fontWeight: 700,
    color: '#FFFFFF',
    format: 'calendar-block',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 12,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
    padding: '3px 10px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-left',
    maxHeight: 32,
    margin: 40,
    background: 'frosted',
  },

  brandColorSlots: ['gradient-start'],

  decorations: [
    {
      type: 'circle',
      position: 'top-right',
      width: 500,
      height: 500,
      color: 'rgba(255, 255, 255, 0.08)',
      borderRadius: 250,
    },
    {
      type: 'circle',
      position: 'top-right-inner',
      width: 420,
      height: 420,
      color: 'rgba(255, 255, 255, 0.05)',
      borderRadius: 210,
    },
    {
      type: 'divider',
      position: 'bottom-bar',
      width: 40,
      height: 3,
      color: 'rgba(255, 255, 255, 0.3)',
      borderRadius: 2,
    },
  ],

  behavior: {
    showDate: true,
  },
};

export default config;
