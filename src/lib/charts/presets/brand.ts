import type { ChartThemePreset } from '../types';

export const brandPreset: ChartThemePreset = {
  id: 'brand',
  colors: {
    primary: 'hsl(224 71% 25%)',
    primaryLight: 'hsl(224 71% 35%)',
    secondary: 'hsl(12 95% 62%)',
    series: [
      'hsl(224 71% 25%)',   // primary
      'hsl(12 95% 62%)',    // accent
      'hsl(142 71% 45%)',   // success
      'hsl(38 92% 50%)',    // warning
      'hsl(201 100% 35%)',  // linkedin blue
      'hsl(330 80% 55%)',   // accentWarm
      'hsl(203 89% 53%)',   // twitter
      'hsl(329 70% 58%)',   // instagram
    ],
    success: 'hsl(142 71% 45%)',
    warning: 'hsl(38 92% 50%)',
    error: 'hsl(0 84% 60%)',
    platforms: {
      linkedin: 'hsl(201 100% 35%)',
      instagram: 'hsl(329 70% 58%)',
      twitter: 'hsl(203 89% 53%)',
      tiktok: 'hsl(349 100% 50%)',
      facebook: 'hsl(221 44% 41%)',
    },
  },
  fonts: {
    body: "'Inter', system-ui, sans-serif",
    heading: "'Space Grotesk', system-ui, sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  card: {
    borderRadius: '0.75rem',
    shadow: '0 10px 25px -5px hsl(224 71% 25% / 0.12), 0 4px 10px -3px hsl(220 13% 91% / 0.4)',
    padding: '1.5rem',
  },
};
