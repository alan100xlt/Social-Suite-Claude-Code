/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from '../types.ts';
import { resolveColor, resolveFont } from './brand-color.ts';

function formatDate(iso: string, format: 'relative' | 'short' | 'long' | 'calendar-block'): string {
  const d = new Date(iso);
  if (format === 'short') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (format === 'long') return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  // 'relative' -- approximate
  const diff = Date.now() - d.getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function renderAuthor(config: TemplateConfig['author'], input: TemplateInput): any {
  if (!config || !input.visibility.showAuthor || !input.author) return null;
  const color = resolveColor(config.color, input);
  const fontFamily = resolveFont(input);
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
      {config.prefix || ''}{input.author}
    </div>
  );
}

export function renderDate(config: TemplateConfig['date'], input: TemplateInput): any {
  if (!config || !input.visibility.showDate || !input.publishedAt) return null;
  const color = resolveColor(config.color, input);
  const fontFamily = resolveFont(input);
  return (
    <div style={{
      display: 'flex',
      fontFamily,
      fontSize: config.fontSize,
      fontWeight: config.fontWeight,
      color,
    }}>
      {formatDate(input.publishedAt, config.format)}
    </div>
  );
}

export function renderCategoryTag(config: TemplateConfig['categoryTag'], input: TemplateInput): any {
  if (!config || !input.visibility.showCategoryTag || !input.categoryTag) return null;
  const color = resolveColor(config.color, input);
  const bg = config.backgroundColor ? resolveColor(config.backgroundColor, input) : undefined;
  const fontFamily = resolveFont(input);
  return (
    <div style={{
      display: 'flex',
      fontFamily,
      fontSize: config.fontSize,
      fontWeight: config.fontWeight,
      color,
      backgroundColor: bg,
      borderRadius: config.borderRadius || 0,
      padding: config.padding || '0',
      textTransform: config.textTransform || 'none',
    }}>
      {input.categoryTag}
    </div>
  );
}

export function renderDescription(config: TemplateConfig['description'], input: TemplateInput): any {
  if (!config || !input.visibility.showDescription || !input.description) return null;
  const color = resolveColor(config.color, input);
  const fontFamily = resolveFont(input);
  return (
    <div style={{
      display: 'flex',
      fontFamily,
      fontSize: config.fontSize,
      fontWeight: config.fontWeight,
      color,
      lineHeight: config.lineHeight,
      maxHeight: config.maxLines * config.fontSize * config.lineHeight,
      overflow: 'hidden',
      marginTop: config.marginTop,
    }}>
      {input.description}
    </div>
  );
}
