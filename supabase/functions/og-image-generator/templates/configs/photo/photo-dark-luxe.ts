import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'photo-dark-luxe',
  name: 'Photo Dark Luxe',
  category: 'photo',
  tags: ['dark', 'luxe', 'premium', 'gradient-border', 'card'],
  requiresImage: true,

  layout: {
    archetype: 'card',
    padding: 0,
    theme: 'dark',
  },

  background: {
    type: 'linear-gradient',
    colors: ['#0a0a0a', '#1a1a2e'],
    gradientAngle: 135,
  },

  image: {
    position: 'framed',
    borderRadius: 12,
  },

  title: {
    fontSize: 38,
    fontWeight: 600,
    fontFamily: 'serif',
    color: '#f0e6d4',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.25,
    maxLines: 3,
  },

  description: {
    fontSize: 18,
    fontWeight: 400,
    color: 'rgba(240,230,212,0.5)',
    lineHeight: 1.5,
    maxLines: 2,
    marginTop: 16,
  },

  sourceName: {
    style: 'uppercase-label',
    position: 'above-title',
    fontSize: 11,
    fontWeight: 700,
    color: '#c4a46a',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },

  author: {
    position: 'below-description',
    fontSize: 14,
    fontWeight: 500,
    color: 'rgba(240,230,212,0.5)',
    prefix: 'By ',
  },

  logo: {
    position: 'top-right',
    maxHeight: 26,
    margin: 40,
    background: 'none',
  },

  brandColorSlots: ['card-border', 'accent-bar'],

  decorations: [
    {
      type: 'accent-bar',
      position: 'card-top',
      width: 60,
      height: 3,
      color: '#c4a46a',
      borderRadius: 2,
    },
  ],

  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    border: '1px solid rgba(196,164,106,0.3)',
    padding: 44,
    maxWidth: 900,
  },
};

export default config;
