import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'editorial-opinion',
  name: 'Editorial Opinion',
  category: 'editorial',
  tags: ['dark', 'opinion', 'centered', 'bold', 'highlight'],
  requiresImage: false,

  layout: {
    archetype: 'centered',
    padding: 72,
    theme: 'dark',
  },

  background: {
    type: 'solid',
    colors: ['#141218'],
  },

  title: {
    fontSize: 48,
    fontWeight: 700,
    fontFamily: 'serif',
    color: '#F5F5F5',
    alignment: 'center',
    verticalAlign: 'center',
    lineHeight: 1.5,
    maxLines: 4,
    treatment: 'highlight-segments',
  },

  description: {
    fontSize: 18,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 1.5,
    maxLines: 2,
    marginTop: 20,
  },

  sourceName: {
    style: 'badge',
    position: 'above-title',
    fontSize: 14,
    fontWeight: 700,
    color: '#ffffff',
    letterSpacing: 2,
    textTransform: 'uppercase',
    badgeBg: 'brandColor',
  },

  author: {
    position: 'below-title',
    fontSize: 18,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
  },

  date: {
    position: 'below-author',
    fontSize: 13,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.3)',
    format: 'short',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 12,
    fontWeight: 700,
    color: '#141218',
    backgroundColor: 'brandColor',
    borderRadius: 4,
    padding: '4px 12px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-left',
    maxHeight: 28,
    margin: 40,
    background: 'frosted',
  },

  brandColorSlots: ['highlight-bg', 'badge-bg', 'category-badge'],

  decorations: [
    {
      type: 'accent-dot',
      position: 'above-title',
      width: 10,
      height: 10,
      borderRadius: 5,
      color: 'brandColor',
    },
    {
      type: 'divider',
      position: 'below-title',
      width: 48,
      height: 2,
      color: 'rgba(255,255,255,0.15)',
      borderRadius: 1,
    },
  ],

  staticLabels: [
    {
      text: 'Opinion',
      position: 'top-right',
      fontSize: 12,
      fontWeight: 700,
      color: 'brandColor',
      textTransform: 'uppercase',
    },
  ],
};

export default config;
