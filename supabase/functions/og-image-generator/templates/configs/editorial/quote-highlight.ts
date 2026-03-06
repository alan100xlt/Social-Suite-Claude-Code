import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'quote-highlight',
  name: 'Quote Highlight',
  category: 'editorial',
  tags: ['dark', 'highlight', 'bold', 'centered'],
  requiresImage: false,

  layout: {
    archetype: 'centered',
    padding: 80,
    theme: 'dark',
  },

  background: {
    type: 'solid',
    colors: ['#1C1917'],
  },

  title: {
    fontSize: 44,
    fontWeight: 700,
    color: '#FAFAF9',
    alignment: 'center',
    verticalAlign: 'center',
    lineHeight: 1.6,
    maxLines: 5,
    treatment: 'highlight-segments',
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'below-title',
    fontSize: 18,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-title',
    fontSize: 20,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 2,
    textTransform: 'uppercase',
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
    color: '#1C1917',
    backgroundColor: 'brandColor',
    borderRadius: 4,
    padding: '3px 10px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'bottom-right',
    maxHeight: 28,
    margin: 40,
    background: 'none',
  },

  brandColorSlots: ['highlight-bg', 'divider', 'category-badge'],

  decorations: [
    {
      type: 'divider',
      position: 'below-title',
      width: 40,
      height: 2,
      color: 'brandColor',
    },
  ],
};

export default config;
