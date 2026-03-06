import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'brand-event',
  name: 'Brand Event',
  category: 'brand',
  tags: ['dark', 'event', 'gradient', 'calendar'],
  requiresImage: false,

  layout: {
    archetype: 'split-lr',
    splitRatio: [25, 75],
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
    position: 'below-title',
    fontSize: 18,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.5)',
    prefix: 'By ',
  },

  date: {
    position: 'below-author',
    fontSize: 16,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.4)',
    format: 'calendar-block',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 12,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 4,
    padding: '3px 10px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-right',
    maxHeight: 28,
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
      borderRadius: 250,
      color: 'rgba(255, 255, 255, 0.08)',
    },
    {
      type: 'circle',
      position: 'top-right-offset',
      width: 420,
      height: 420,
      borderRadius: 210,
      color: 'rgba(255, 255, 255, 0.05)',
    },
    {
      type: 'divider',
      position: 'bottom-bar',
      width: 40,
      height: 3,
      color: 'rgba(255, 255, 255, 0.3)',
      borderRadius: 2,
    },
    {
      type: 'calendar-block',
      position: 'left-panel',
      width: 160,
      height: 180,
      color: 'rgba(255, 255, 255, 0.12)',
      borderRadius: 20,
    },
  ],
};

export default config;
