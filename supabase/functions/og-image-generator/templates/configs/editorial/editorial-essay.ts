import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'editorial-essay',
  name: 'Editorial Essay',
  category: 'editorial',
  tags: ['dark', 'essay', 'text-forward', 'serif', 'moody'],
  requiresImage: false,

  layout: {
    archetype: 'text-forward',
    padding: [80, 96, 80, 96],
    theme: 'dark',
  },

  background: {
    type: 'linear-gradient',
    colors: ['#1A1A2E', '#16213E'],
    gradientAngle: 180,
  },

  title: {
    fontSize: 50,
    fontWeight: 700,
    fontFamily: 'serif',
    color: '#E8E6E3',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.3,
    maxLines: 4,
  },

  description: {
    fontSize: 19,
    fontWeight: 400,
    color: 'rgba(232,230,227,0.5)',
    lineHeight: 1.55,
    maxLines: 3,
    marginTop: 24,
  },

  sourceName: {
    style: 'subtle-text',
    position: 'above-title',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(232,230,227,0.4)',
    letterSpacing: 3,
  },

  author: {
    position: 'below-title',
    fontSize: 16,
    fontWeight: 600,
    color: 'rgba(232,230,227,0.6)',
    prefix: 'An essay by ',
  },

  date: {
    position: 'below-author',
    fontSize: 13,
    fontWeight: 400,
    color: 'rgba(232,230,227,0.25)',
    format: 'long',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 11,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'brandColor',
    borderRadius: 3,
    padding: '3px 10px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'bottom-right',
    maxHeight: 24,
    margin: 40,
    background: 'frosted',
  },

  brandColorSlots: ['accent-bar', 'category-badge'],

  decorations: [
    {
      type: 'accent-bar',
      position: 'left',
      width: 3,
      height: 180,
      color: 'brandColor',
      borderRadius: 2,
    },
    {
      type: 'rule',
      position: 'bottom',
      width: 1008,
      height: 1,
      color: 'rgba(232,230,227,0.1)',
    },
  ],

  staticLabels: [
    {
      text: 'Essay',
      position: 'bottom-left',
      fontSize: 11,
      fontWeight: 400,
      color: 'rgba(232,230,227,0.3)',
      textTransform: 'uppercase',
    },
  ],
};

export default config;
