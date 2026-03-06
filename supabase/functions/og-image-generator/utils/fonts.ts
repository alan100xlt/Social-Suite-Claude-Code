// Font loading for Satori — cached in module scope for reuse across invocations

let fontCache: ArrayBuffer | null = null;
let fontBoldCache: ArrayBuffer | null = null;

export async function loadFonts(): Promise<Array<{ name: string; data: ArrayBuffer; weight: number; style: string }>> {
  if (!fontCache) {
    // Use Google Fonts CSS2 API with TTF format (woff2 not supported by resvg-wasm)
    const [regular, bold] = await Promise.all([
      fetch('https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf')
        .then(r => r.arrayBuffer()),
      fetch('https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.ttf')
        .then(r => r.arrayBuffer()),
    ]);
    fontCache = regular;
    fontBoldCache = bold;
  }

  return [
    { name: 'Inter', data: fontCache, weight: 400, style: 'normal' },
    { name: 'Inter', data: fontBoldCache!, weight: 700, style: 'normal' },
  ];
}
