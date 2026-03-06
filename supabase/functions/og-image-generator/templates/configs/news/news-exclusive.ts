import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'news-exclusive',
  name: 'News Exclusive',
  category: 'news',
  tags: ['dark', 'photo', 'banner', 'exclusive', 'premium'],
  requiresImage: true,

  layout: {
    archetype: 'banner',
    padding: [0, 48, 48, 48],
    theme: 'dark',
  },

  background: {
    type: 'image-fullbleed',
    colors: ['#0A0A0A'],
  },

  image: {
    position: 'fullbleed',
    overlay: {
      type: 'dark-gradient-top',
      opacity: 0.85,
    },
  },

  title: {
    fontSize: 48,
    fontWeight: 700,
    fontFamily: 'serif',
    color: '#FFFFFF',
    alignment: 'left',
    verticalAlign: 'bottom',
    lineHeight: 1.2,
    maxLines: 4,
  },

  sourceName: {
    style: 'badge',
    position: 'top-left',
    fontSize: 14,
    fontWeight: 700,
    color: '#FFFFFF',
    badgeBg: 'rgba(0,0,0,0.6)',
  },

  author: {
    position: 'below-title',
    fontSize: 15,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.6)',
    prefix: 'By ',
  },

  date: {
    position: 'bottom-bar',
    fontSize: 13,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.4)',
    format: 'long',
  },

  categoryTag: {
    position: 'inline-banner',
    fontSize: 13,
    fontWeight: 700,
    color: '#0F172A',
    backgroundColor: '#FBBF24',
    borderRadius: 0,
    padding: '5px 14px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-right',
    maxHeight: 28,
    margin: 40,
    background: 'frosted',
  },

  brandColorSlots: ['banner-bg'],

  decorations: [
    {
      type: 'accent-bar',
      position: 'top-edge',
      width: 1200,
      height: 5,
      gradient: 'linear-gradient(90deg, #FBBF24, #F59E0B)',
    },
  ],

  staticLabels: [
    {
      text: 'Exclusive',
      position: 'banner-left',
      fontSize: 18,
      fontWeight: 700,
      color: '#FBBF24',
      textTransform: 'uppercase',
    },
  ],

  behavior: {
    showDate: true,
  },
};

export default config;
