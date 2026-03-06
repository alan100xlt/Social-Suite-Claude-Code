import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'brand-announce',
  name: 'Brand Announcement',
  category: 'brand',
  tags: ['bold', 'announcement', 'centered', 'vibrant'],
  requiresImage: false,

  layout: {
    archetype: 'centered',
    padding: 60,
    theme: 'dark',
  },

  background: {
    type: 'solid',
    colors: ['brandColor'],
  },

  title: {
    fontSize: 52,
    fontWeight: 700,
    color: '#FFFFFF',
    alignment: 'center',
    verticalAlign: 'center',
    lineHeight: 1.2,
    maxLines: 4,
  },

  sourceName: {
    style: 'subtle-text',
    position: 'below-title',
    fontSize: 20,
    fontWeight: 400,
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 1,
  },

  author: {
    position: 'below-title',
    fontSize: 18,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.6)',
    prefix: 'By ',
  },

  date: {
    position: 'below-author',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.5)',
    format: 'short',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 12,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 4,
    padding: '3px 10px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-left',
    maxHeight: 32,
    margin: 40,
    background: 'white-pill',
  },

  brandColorSlots: ['background'],

  decorations: [
    {
      type: 'diagonal-pattern',
      position: 'fullbleed',
      color: '#FFFFFF',
      opacity: 0.08,
    },
    {
      type: 'corner-accent',
      position: 'top-left',
      width: 60,
      height: 60,
      color: 'rgba(255, 255, 255, 0.3)',
    },
    {
      type: 'corner-accent',
      position: 'bottom-right',
      width: 60,
      height: 60,
      color: 'rgba(255, 255, 255, 0.3)',
    },
  ],

  staticLabels: [
    {
      text: 'ANNOUNCEMENT',
      position: 'above-title',
      fontSize: 16,
      fontWeight: 700,
      color: 'brandColor',
      backgroundColor: '#FFFFFF',
      textTransform: 'uppercase',
    },
  ],
};

export default config;
