import type { TemplateConfig } from '../../types.ts';

const config: TemplateConfig = {
  id: 'photo-minimal',
  name: 'Photo Minimal',
  category: 'photo',
  tags: ['light', 'minimal', 'clean', 'whitespace'],
  requiresImage: true,

  layout: {
    archetype: 'split-lr',
    splitRatio: [45, 55],
    padding: [48, 56, 48, 56],
    theme: 'light',
  },

  background: {
    type: 'solid',
    colors: ['#ffffff'],
  },

  image: {
    position: 'left-panel',
    panelPercent: 45,
    borderRadius: 8,
  },

  title: {
    fontSize: 32,
    fontWeight: 600,
    color: '#1a1a1a',
    alignment: 'left',
    verticalAlign: 'center',
    lineHeight: 1.35,
    maxLines: 4,
  },

  sourceName: {
    style: 'subtle-text',
    position: 'below-title',
    fontSize: 15,
    fontWeight: 400,
    color: '#aaaaaa',
  },

  logo: {
    position: 'top-right',
    maxHeight: 22,
    margin: 36,
    background: 'none',
  },

  brandColorSlots: ['accent-dot'],

  decorations: [
    {
      type: 'accent-dot',
      position: 'left-of-title',
      width: 8,
      height: 8,
      color: 'brandColor',
      borderRadius: 4,
    },
  ],
};

export default config;
