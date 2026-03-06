import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'gradient-modern',
  name: 'Modern Gradient',
  category: 'gradient',
  tags: ['dark', 'bold', 'geometric'],
  requiresImage: false,

  layout: {
    archetype: 'split-lr',
    splitRatio: [67, 33],
    padding: 72,
    theme: 'dark',
  },

  background: {
    type: 'linear-gradient',
    colors: ['#0F172A', 'brandColor', '#1E293B'],
    gradientAngle: 135,
  },

  title: {
    fontSize: 52,
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
    lineHeight: 1.5,
    maxLines: 2,
    marginTop: 24,
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'above-title',
    fontSize: 18,
    fontWeight: 700,
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 3,
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
    position: 'below-author',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.4)',
    format: 'short',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 13,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 4,
    padding: '4px 10px',
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
      type: 'circle',
      position: 'right-center',
      width: 240,
      height: 240,
      color: 'rgba(255, 255, 255, 0.08)',
      borderRadius: 120,
    },
    {
      type: 'circle',
      position: 'right-offset',
      width: 100,
      height: 100,
      color: 'rgba(255, 255, 255, 0.12)',
      borderRadius: 50,
    },
    {
      type: 'rectangle',
      position: 'right-bottom',
      width: 160,
      height: 40,
      color: 'rgba(255, 255, 255, 0.06)',
      borderRadius: 8,
    },
  ],
};

export default config;
