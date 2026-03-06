import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'brand-launch',
  name: 'Brand Launch',
  category: 'brand',
  tags: ['dark', 'launch', 'card', 'gradient', 'exciting'],
  requiresImage: false,

  layout: {
    archetype: 'card',
    padding: 60,
    theme: 'dark',
  },

  background: {
    type: 'linear-gradient',
    colors: ['brandColor', 'brandColorSecondary'],
    gradientAngle: 135,
  },

  title: {
    fontSize: 48,
    fontWeight: 800,
    fontFamily: 'sans',
    color: '#FFFFFF',
    alignment: 'center',
    verticalAlign: 'center',
    lineHeight: 1.2,
    maxLines: 3,
  },

  description: {
    fontSize: 20,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 1.45,
    maxLines: 2,
    marginTop: 20,
  },

  sourceName: {
    style: 'badge',
    position: 'above-title',
    fontSize: 14,
    fontWeight: 700,
    color: 'brandColor',
    letterSpacing: 1,
    textTransform: 'uppercase',
    badgeBg: '#FFFFFF',
  },

  author: {
    position: 'below-title',
    fontSize: 16,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.6)',
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
    color: 'brandColor',
    backgroundColor: '#FFFFFF',
    borderRadius: 40,
    padding: '6px 20px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-left',
    maxHeight: 32,
    margin: 40,
    background: 'white-pill',
  },

  brandColorSlots: ['gradient-start', 'gradient-end', 'category-badge', 'badge-bg'],

  decorations: [
    {
      type: 'diagonal-pattern',
      position: 'fullbleed',
      color: '#FFFFFF',
      opacity: 0.06,
    },
    {
      type: 'corner-accent',
      position: 'bottom-left',
      width: 80,
      height: 80,
      color: 'rgba(255,255,255,0.2)',
    },
    {
      type: 'corner-accent',
      position: 'top-right',
      width: 80,
      height: 80,
      color: 'rgba(255,255,255,0.2)',
    },
  ],

  card: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 24,
    padding: 56,
    backdropFilter: 'blur(20px)',
    maxWidth: 1000,
  },

  staticLabels: [
    {
      text: 'Now Live',
      position: 'above-title',
      fontSize: 14,
      fontWeight: 700,
      color: '#FFFFFF',
      textTransform: 'uppercase',
    },
  ],
};

export default config;
