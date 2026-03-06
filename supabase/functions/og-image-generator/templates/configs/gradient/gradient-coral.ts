import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'gradient-coral',
  name: 'Coral Gradient',
  category: 'gradient',
  tags: ['warm', 'coral', 'card', 'trendy'],
  requiresImage: false,

  layout: {
    archetype: 'card',
    padding: 48,
    theme: 'dark',
  },

  background: {
    type: 'linear-gradient',
    colors: ['#BE185D', '#9F1239', '#881337'],
    gradientAngle: 160,
  },

  title: {
    fontSize: 46,
    fontWeight: 700,
    fontFamily: 'sans',
    color: '#FFFFFF',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.2,
    maxLines: 3,
  },

  description: {
    fontSize: 20,
    fontWeight: 400,
    color: 'rgba(255, 255, 255, 0.65)',
    lineHeight: 1.5,
    maxLines: 2,
    marginTop: 16,
  },

  sourceName: {
    style: 'subtle-text',
    position: 'below-title',
    fontSize: 16,
    fontWeight: 500,
    color: '#FDA4AF',
    letterSpacing: 1,
  },

  author: {
    position: 'below-description',
    fontSize: 16,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.5)',
    prefix: 'By ',
  },

  date: {
    position: 'below-author',
    fontSize: 14,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.35)',
    format: 'short',
  },

  categoryTag: {
    position: 'above-title',
    fontSize: 12,
    fontWeight: 700,
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: '4px 12px',
    textTransform: 'uppercase',
  },

  logo: {
    position: 'top-left',
    maxHeight: 28,
    margin: 32,
    background: 'white-pill',
  },

  brandColorSlots: [],

  decorations: [],

  card: {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 24,
    border: '1px solid rgba(255,255,255,0.1)',
    padding: 56,
    backdropFilter: 'blur(20px)',
    maxWidth: 960,
  },
};

export default config;
