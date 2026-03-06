import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'brand-milestone',
  name: 'Brand Milestone',
  category: 'brand',
  tags: ['dark', 'milestone', 'centered', 'celebratory', 'gradient'],
  requiresImage: false,

  layout: {
    archetype: 'centered',
    padding: [72, 80, 72, 80],
    theme: 'dark',
  },

  background: {
    type: 'linear-gradient',
    colors: ['#0F172A', 'brandColor'],
    gradientAngle: 170,
  },

  title: {
    fontSize: 56,
    fontWeight: 800,
    fontFamily: 'sans',
    color: '#FFFFFF',
    alignment: 'center',
    verticalAlign: 'center',
    lineHeight: 1.15,
    maxLines: 3,
  },

  description: {
    fontSize: 22,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 1.4,
    maxLines: 2,
    marginTop: 20,
  },

  sourceName: {
    style: 'badge',
    position: 'above-title',
    fontSize: 15,
    fontWeight: 700,
    color: '#0F172A',
    letterSpacing: 1,
    textTransform: 'uppercase',
    badgeBg: '#FFFFFF',
  },

  author: {
    position: 'below-title',
    fontSize: 16,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.45)',
  },

  date: {
    position: 'below-author',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.25)',
    format: 'long',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 12,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 40,
    padding: '5px 16px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'center-top',
    maxHeight: 36,
    margin: 40,
    background: 'white-pill',
  },

  brandColorSlots: ['gradient-end', 'badge-bg'],

  decorations: [
    {
      type: 'circle',
      position: 'center-behind',
      width: 480,
      height: 480,
      borderRadius: 240,
      color: 'rgba(255,255,255,0.04)',
    },
    {
      type: 'circle',
      position: 'center-behind-outer',
      width: 640,
      height: 640,
      borderRadius: 320,
      color: 'rgba(255,255,255,0.02)',
    },
    {
      type: 'sparkle',
      position: 'top-right',
      width: 24,
      height: 24,
      color: 'rgba(255,255,255,0.3)',
    },
    {
      type: 'sparkle',
      position: 'bottom-left',
      width: 16,
      height: 16,
      color: 'rgba(255,255,255,0.2)',
    },
  ],
};

export default config;
