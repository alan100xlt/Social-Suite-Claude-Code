import type { ChartThemePreset } from '../types';

export const figmaKitPreset: ChartThemePreset = {
  id: 'figma-kit',
  colors: {
    primary: '#855CF8',
    primaryLight: '#B49BFC',
    secondary: '#607D8B',
    series: [
      '#855CF8',           // purple primary
      '#B49BFC',           // purple light
      '#607D8B',           // blue grey
      '#26C6DA',           // cyan
      '#FF7043',           // deep orange
      '#AB47BC',           // purple accent
      '#66BB6A',           // green
      '#FFA726',           // orange
    ],
    success: '#66BB6A',
    warning: '#FFA726',
    error: '#EF5350',
    platforms: {
      linkedin: '#0A66C2',
      instagram: '#E1306C',
      twitter: '#1DA1F2',
      tiktok: '#FF0050',
      facebook: '#4267B2',
    },
  },
  fonts: {
    body: "'IBM Plex Sans', system-ui, sans-serif",
    heading: "'IBM Plex Sans', system-ui, sans-serif",
    mono: "'IBM Plex Mono', monospace",
  },
  card: {
    borderRadius: '0.5rem',
    shadow: '0px 8px 24px 0px rgba(176,190,197,0.32), 0px 3px 5px 0px rgba(176,190,197,0.32)',
    padding: '1rem',
  },
};
