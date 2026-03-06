import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'brand-product',
  name: 'Brand Product',
  category: 'brand',
  tags: ['light', 'product', 'text-forward', 'clean', 'modern'],
  requiresImage: false,

  layout: {
    archetype: 'text-forward',
    padding: [80, 80, 80, 80],
    theme: 'light',
  },

  background: {
    type: 'solid',
    colors: ['#FFFFFF'],
  },

  title: {
    fontSize: 48,
    fontWeight: 700,
    fontFamily: 'sans',
    color: '#111827',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.25,
    maxLines: 3,
  },

  description: {
    fontSize: 20,
    fontWeight: 400,
    color: '#6B7280',
    lineHeight: 1.5,
    maxLines: 3,
    marginTop: 20,
  },

  sourceName: {
    style: 'badge',
    position: 'above-title',
    fontSize: 13,
    fontWeight: 700,
    color: '#ffffff',
    letterSpacing: 1,
    textTransform: 'uppercase',
    badgeBg: 'brandColor',
  },

  author: {
    position: 'below-title',
    fontSize: 15,
    fontWeight: 400,
    color: '#9CA3AF',
  },

  date: {
    position: 'below-author',
    fontSize: 13,
    fontWeight: 400,
    color: '#D1D5DB',
    format: 'short',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 12,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'brandColor',
    borderRadius: 6,
    padding: '4px 14px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-left',
    maxHeight: 30,
    margin: 40,
    background: 'none',
  },

  brandColorSlots: ['badge-bg', 'category-badge', 'accent-bar', 'card-border'],

  decorations: [
    {
      type: 'accent-bar',
      position: 'top',
      width: 1200,
      height: 4,
      color: 'brandColor',
    },
    {
      type: 'product-mockup-frame',
      position: 'right',
      width: 320,
      height: 240,
      color: '#F3F4F6',
      borderRadius: 16,
      opacity: 0.8,
    },
    {
      type: 'dot-grid',
      position: 'bottom-right',
      width: 160,
      height: 160,
      color: 'brandColor',
      opacity: 0.05,
    },
  ],
};

export default config;
