import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'news-bulletin',
  name: 'News Bulletin',
  category: 'news',
  tags: ['dark', 'banner', 'bulletin', 'bold', 'structured'],
  requiresImage: false,

  layout: {
    archetype: 'banner',
    padding: [0, 56, 0, 56],
    theme: 'dark',
  },

  background: {
    type: 'linear-gradient',
    colors: ['#1E293B', '#0F172A'],
    gradientAngle: 180,
  },

  title: {
    fontSize: 50,
    fontWeight: 700,
    fontFamily: 'sans',
    color: '#F1F5F9',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.2,
    maxLines: 4,
  },

  description: {
    fontSize: 18,
    fontWeight: 400,
    color: 'rgba(241,245,249,0.5)',
    lineHeight: 1.5,
    maxLines: 2,
    marginTop: 12,
  },

  sourceName: {
    style: 'inline-banner',
    position: 'top-left',
    fontSize: 16,
    fontWeight: 700,
    color: '#FFFFFF',
  },

  author: {
    position: 'bottom-left',
    fontSize: 15,
    fontWeight: 400,
    color: 'rgba(241,245,249,0.4)',
    prefix: 'By ',
  },

  date: {
    position: 'bottom-bar',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(241,245,249,0.35)',
    format: 'long',
  },

  categoryTag: {
    position: 'inline-banner',
    fontSize: 13,
    fontWeight: 700,
    color: '#0F172A',
    backgroundColor: '#38BDF8',
    borderRadius: 0,
    padding: '5px 14px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-right',
    maxHeight: 28,
    margin: 40,
    background: 'none',
  },

  brandColorSlots: ['banner-bg'],

  decorations: [
    {
      type: 'accent-bar',
      position: 'top-edge',
      width: 1200,
      height: 4,
      color: '#38BDF8',
    },
    {
      type: 'divider',
      position: 'below-banner',
      width: 1200,
      height: 1,
      color: 'rgba(241,245,249,0.1)',
    },
  ],

  staticLabels: [
    {
      text: 'Bulletin',
      position: 'banner-left',
      fontSize: 18,
      fontWeight: 700,
      color: '#38BDF8',
      textTransform: 'uppercase',
    },
  ],

  behavior: {
    showDate: true,
  },
};

export default config;
