/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from '../types.ts';
import { resolveColor } from './brand-color.ts';

function shouldRender(condition: string | undefined, input: TemplateInput): boolean {
  if (!condition) return true;
  if (condition === 'no-description') return !input.description;
  if (condition === 'has-category') return !!input.categoryTag;
  if (condition === 'has-image') return !!input.imageBase64;
  return true;
}

export function renderDecorations(
  decorations: TemplateConfig['decorations'],
  input: TemplateInput
): any[] {
  return decorations
    .filter(d => shouldRender(d.condition, input))
    .map((d, i) => {
      const color = d.color ? resolveColor(d.color, input) : undefined;
      const style: Record<string, unknown> = {
        display: 'flex',
        position: 'absolute' as const,
        width: d.width,
        height: d.height,
        backgroundColor: color,
        borderRadius: d.borderRadius,
        opacity: d.opacity,
        boxShadow: d.boxShadow,
      };

      // Map position string to CSS
      if (d.position === 'top') Object.assign(style, { top: 0, left: 0, right: 0 });
      if (d.position === 'bottom') Object.assign(style, { bottom: 0, left: 0, right: 0 });
      if (d.position === 'left') Object.assign(style, { top: 0, left: 0, bottom: 0 });
      if (d.position === 'right') Object.assign(style, { top: 0, right: 0, bottom: 0 });
      if (d.position === 'top-left') Object.assign(style, { top: 0, left: 0 });
      if (d.position === 'top-right') Object.assign(style, { top: 0, right: 0 });
      if (d.position === 'bottom-left') Object.assign(style, { bottom: 0, left: 0 });
      if (d.position === 'bottom-right') Object.assign(style, { bottom: 0, right: 0 });

      if (d.gradient) {
        const resolvedGradient = d.gradient.replace(/brandColor/g, resolveColor('brandColor', input));
        style.backgroundImage = resolvedGradient;
      }

      return <div key={i} style={style} />;
    });
}
