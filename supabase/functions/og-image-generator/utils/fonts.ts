// Font loading for Satori — cached in module scope for reuse across invocations

let fontCache: ArrayBuffer | null = null;
let fontBoldCache: ArrayBuffer | null = null;
let serifCache: ArrayBuffer | null = null;
let serifBoldCache: ArrayBuffer | null = null;
let monoCache: ArrayBuffer | null = null;

/** Font family name mapping for config-driven templates */
export const FONT_FAMILY_MAP: Record<string, string> = {
  sans: 'Inter',
  serif: 'Source Serif 4',
  mono: 'JetBrains Mono',
};

export async function loadFonts(): Promise<Array<{ name: string; data: ArrayBuffer; weight: number; style: string }>> {
  if (!fontCache) {
    // Use fontsource CDN with TTF format (woff2 not supported by resvg-wasm)
    const [regular, bold, serif, serifBold, mono] = await Promise.all([
      fetch('https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf')
        .then(r => r.arrayBuffer()),
      fetch('https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.ttf')
        .then(r => r.arrayBuffer()),
      fetch('https://cdn.jsdelivr.net/fontsource/fonts/source-serif-4@latest/latin-400-normal.ttf')
        .then(r => r.arrayBuffer()),
      fetch('https://cdn.jsdelivr.net/fontsource/fonts/source-serif-4@latest/latin-700-normal.ttf')
        .then(r => r.arrayBuffer()),
      fetch('https://cdn.jsdelivr.net/fontsource/fonts/jetbrains-mono@latest/latin-400-normal.ttf')
        .then(r => r.arrayBuffer()),
    ]);
    fontCache = regular;
    fontBoldCache = bold;
    serifCache = serif;
    serifBoldCache = serifBold;
    monoCache = mono;
  }

  return [
    { name: 'Inter', data: fontCache, weight: 400, style: 'normal' },
    { name: 'Inter', data: fontBoldCache!, weight: 700, style: 'normal' },
    { name: 'Source Serif 4', data: serifCache!, weight: 400, style: 'normal' },
    { name: 'Source Serif 4', data: serifBoldCache!, weight: 700, style: 'normal' },
    { name: 'JetBrains Mono', data: monoCache!, weight: 400, style: 'normal' },
  ];
}
