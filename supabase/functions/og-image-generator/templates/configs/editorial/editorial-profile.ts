import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'editorial-profile',
  name: 'Editorial Profile',
  category: 'editorial',
  tags: ['light', 'profile', 'fullbleed', 'photo', 'serif', 'portrait'],
  requiresImage: true,

  layout: {
    archetype: 'fullbleed',
    padding: [64, 72, 72, 72],
    theme: 'dark',
  },

  background: {
    type: 'solid',
    colors: ['#0C0C0C'],
  },

  image: {
    position: 'fullbleed',
    overlay: { type: 'dark-gradient-bottom', opacity: 0.75 },
    filter: 'contrast(1.05) brightness(0.95)',
  },

  title: {
    fontSize: 54,
    fontWeight: 700,
    fontFamily: 'serif',
    color: '#FFFFFF',
    alignment: 'left',
    verticalAlign: 'bottom',
    lineHeight: 1.15,
    maxLines: 3,
    textShadow: '0 2px 16px rgba(0,0,0,0.5)',
  },

  sourceName: {
    style: 'badge',
    position: 'above-title',
    fontSize: 13,
    fontWeight: 700,
    color: '#ffffff',
    letterSpacing: 2,
    textTransform: 'uppercase',
    badgeBg: 'brandColor',
  },

  author: {
    position: 'below-title',
    fontSize: 16,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.65)',
    prefix: 'Profile by ',
  },

  date: {
    position: 'below-author',
    fontSize: 13,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.35)',
    format: 'long',
  },

  categoryTag: {
    position: 'top-left',
    fontSize: 11,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
    padding: '4px 12px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-right',
    maxHeight: 28,
    margin: 36,
    background: 'frosted',
  },

  brandColorSlots: ['badge-bg', 'accent-bar'],

  decorations: [
    {
      type: 'accent-bar',
      position: 'bottom',
      width: 1200,
      height: 5,
      color: 'brandColor',
    },
    {
      type: 'rule',
      position: 'above-title',
      width: 60,
      height: 2,
      color: 'rgba(255,255,255,0.3)',
    },
  ],
};

export default config;
