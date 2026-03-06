/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from '../types.ts';
import { resolveColor } from './brand-color.ts';

/** Build alternating highlighted/plain word segments (for quote-highlight) */
function buildHighlightSegments(text: string, highlightColor: string): any[] {
  const words = text.split(' ');
  const segments: Array<{ text: string; highlight: boolean }> = [];
  let i = 0;
  while (i < words.length) {
    const chunkSize = 2 + Math.floor(Math.random() * 3);
    const chunk = words.slice(i, i + chunkSize).join(' ');
    segments.push({ text: chunk, highlight: segments.length % 2 === 0 });
    i += chunkSize;
  }
  return segments.map((seg, idx) => (
    <span
      key={idx}
      style={{
        display: 'inline',
        backgroundColor: seg.highlight ? highlightColor : 'transparent',
        padding: seg.highlight ? '4px 8px' : '0',
        borderRadius: seg.highlight ? 4 : 0,
      }}
    >
      {seg.text}{' '}
    </span>
  ));
}

export function renderTitle(config: TemplateConfig['title'], input: TemplateInput, brandHighlightColor?: string): any {
  if (!input.visibility.showTitle) return null;

  const color = resolveColor(config.color, input);
  const maxHeight = Math.round(config.fontSize * config.lineHeight * config.maxLines);

  if (config.treatment === 'highlight-segments' && brandHighlightColor) {
    const hlColor = resolveColor(brandHighlightColor, input);
    return (
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        fontSize: config.fontSize,
        fontWeight: config.fontWeight,
        color,
        lineHeight: config.lineHeight,
        textAlign: config.alignment,
        maxHeight,
        overflow: 'hidden',
      }}>
        {buildHighlightSegments(input.title, hlColor)}
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      fontSize: config.fontSize,
      fontWeight: config.fontWeight,
      color,
      textAlign: config.alignment,
      lineHeight: config.lineHeight,
      maxHeight,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      textShadow: config.textShadow || 'none',
    }}>
      {input.title}
    </div>
  );
}
