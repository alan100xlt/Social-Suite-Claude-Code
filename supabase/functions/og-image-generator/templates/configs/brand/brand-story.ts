import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'brand-story',
  name: 'Brand Story',
  category: 'brand',
  tags: ['light', 'story', 'card', 'warm', 'narrative'],
  requiresImage: false,

  layout: {
    archetype: 'card',
    padding: 56,
    theme: 'light',
  },

  background: {
    type: 'solid',
    colors: ['#FFFFFF'],
  },

  title: {
    fontSize: 44,
    fontWeight: 600,
    fontFamily: 'sans',
    color: '#1E293B',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.3,
    maxLines: 4,
  },

  description: {
    fontSize: 18,
    fontWeight: 400,
    color: '#64748B',
    lineHeight: 1.55,
    maxLines: 3,
    marginTop: 16,
  },

  sourceName: {
    style: 'subtle-text',
    position: 'above-title',
    fontSize: 14,
    fontWeight: 500,
    color: '#94A3B8',
    letterSpacing: 1,
  },

  author: {
    position: 'below-title',
    fontSize: 15,
    fontWeight: 500,
    color: '#475569',
    prefix: 'By ',
  },

  date: {
    position: 'below-author',
    fontSize: 13,
    fontWeight: 400,
    color: '#94A3B8',
    format: 'relative',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 11,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'brandColor',
    borderRadius: 4,
    padding: '3px 10px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-left',
    maxHeight: 28,
    margin: 36,
    background: 'none',
  },

  brandColorSlots: ['card-border', 'category-badge', 'accent-dot'],

  decorations: [
    {
      type: 'accent-dot',
      position: 'above-title',
      width: 10,
      height: 10,
      borderRadius: 5,
      color: 'brandColor',
    },
  ],

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    border: '1px solid #E2E8F0',
    padding: 48,
    gradientBorder: { colors: ['brandColor', 'brandColorSecondary'], angle: 135, width: 2 },
    maxWidth: 960,
  },
};

export default config;
