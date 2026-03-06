/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from '../types.ts';
import { resolveColor, resolveFont } from './brand-color.ts';

export function renderSourceName(config: TemplateConfig['sourceName'], input: TemplateInput): any {
  if (!input.visibility.showSourceName || !input.sourceName || config.style === 'none') return null;

  const color = resolveColor(config.color, input);
  const fontFamily = config.style === 'monospace-path'
    ? 'JetBrains Mono'
    : resolveFont(input);

  if (config.style === 'badge') {
    const bg = resolveColor(config.badgeBg || 'brandColor', input);
    return (
      <div style={{
        display: 'flex',
        fontFamily,
        backgroundColor: bg,
        color: '#ffffff',
        fontSize: config.fontSize,
        fontWeight: config.fontWeight,
        padding: '8px 20px',
        borderRadius: 8,
        letterSpacing: config.letterSpacing || 0,
        textTransform: config.textTransform || 'none',
      }}>
        {input.sourceName}
      </div>
    );
  }

  if (config.style === 'monospace-path') {
    return (
      <div style={{
        display: 'flex',
        fontFamily,
        fontSize: config.fontSize,
        fontWeight: config.fontWeight,
        color,
        letterSpacing: config.letterSpacing || 0,
      }}>
        ~/{input.sourceName}
      </div>
    );
  }

  // uppercase-label, subtle-text, inline-banner
  return (
    <div style={{
      display: 'flex',
      fontFamily,
      fontSize: config.fontSize,
      fontWeight: config.fontWeight,
      color,
      letterSpacing: config.letterSpacing || 0,
      textTransform: config.textTransform || 'none',
    }}>
      {input.sourceName}
    </div>
  );
}
