import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'brand-update',
  name: 'Brand Update',
  category: 'brand',
  tags: ['light', 'update', 'text-forward', 'clean', 'professional'],
  requiresImage: false,

  layout: {
    archetype: 'text-forward',
    padding: [72, 80, 72, 80],
    theme: 'light',
  },

  background: {
    type: 'solid',
    colors: ['#F8FAFC'],
  },

  title: {
    fontSize: 52,
    fontWeight: 700,
    fontFamily: 'sans',
    color: '#0F172A',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.2,
    maxLines: 4,
  },

  description: {
    fontSize: 19,
    fontWeight: 400,
    color: '#64748B',
    lineHeight: 1.5,
    maxLines: 2,
    marginTop: 20,
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'above-title',
    fontSize: 13,
    fontWeight: 700,
    color: 'brandColor',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-title',
    fontSize: 16,
    fontWeight: 400,
    color: '#94A3B8',
    prefix: 'By ',
  },

  date: {
    position: 'below-author',
    fontSize: 14,
    fontWeight: 400,
    color: '#CBD5E1',
    format: 'short',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 12,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'brandColor',
    borderRadius: 4,
    padding: '4px 12px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-left',
    maxHeight: 28,
    margin: 40,
    background: 'none',
  },

  brandColorSlots: ['source-text', 'category-badge', 'accent-bar', 'card-border'],

  decorations: [
    {
      type: 'accent-bar',
      position: 'left',
      width: 4,
      height: 120,
      color: 'brandColor',
      borderRadius: 2,
    },
    {
      type: 'rule',
      position: 'bottom',
      width: 1040,
      height: 1,
      color: '#E2E8F0',
    },
    {
      type: 'dot-pattern',
      position: 'bottom-right',
      width: 200,
      height: 200,
      color: 'brandColor',
      opacity: 0.06,
    },
  ],

  staticLabels: [
    {
      text: 'Update',
      position: 'top-right',
      fontSize: 12,
      fontWeight: 700,
      color: 'brandColor',
      textTransform: 'uppercase',
    },
  ],
};

export default config;
