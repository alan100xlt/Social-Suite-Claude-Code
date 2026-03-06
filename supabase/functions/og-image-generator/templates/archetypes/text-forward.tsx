/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from '../types.ts';
import { resolveColor } from '../shared/brand-color.ts';
import { renderTitle } from '../shared/title.tsx';
import { renderLogo } from '../shared/logo.tsx';
import { renderSourceName } from '../shared/source-name.tsx';
import { renderAuthor, renderDate, renderCategoryTag, renderDescription } from '../shared/meta-layers.tsx';
import { renderDecorations } from '../shared/decorations.tsx';

function buildBackground(config: TemplateConfig, input: TemplateInput): Record<string, unknown> {
  const bg = config.background;
  if (bg.type === 'solid' && bg.colors.length > 0) {
    return { backgroundColor: resolveColor(bg.colors[0], input) };
  }
  if (bg.type === 'linear-gradient' && bg.colors.length >= 2) {
    const angle = bg.gradientAngle ?? 180;
    return { background: `linear-gradient(${angle}deg, ${resolveColor(bg.colors[0], input)} 0%, ${resolveColor(bg.colors[1], input)} 100%)` };
  }
  return {};
}

export function renderTextForward(config: TemplateConfig, input: TemplateInput): any {
  const padArr = typeof config.layout.padding === 'number'
    ? [config.layout.padding, config.layout.padding, config.layout.padding, config.layout.padding]
    : config.layout.padding;

  const bgStyle = buildBackground(config, input);
  const vertJustify = config.title.verticalAlign === 'bottom' ? 'flex-end'
    : config.title.verticalAlign === 'center' ? 'center' : 'flex-start';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: vertJustify,
      width: 1200, height: 630, position: 'relative',
      padding: `${padArr[0]}px ${padArr[1]}px ${padArr[2]}px ${padArr[3]}px`,
      ...bgStyle,
    }}>
      {/* Source name top area */}
      {(config.sourceName.position === 'top-right' || config.sourceName.position === 'top-left') && (
        <div style={{
          display: 'flex', position: 'absolute',
          ...(config.sourceName.position === 'top-left'
            ? { top: padArr[0], left: padArr[3] }
            : { top: padArr[0], right: padArr[1] }),
        }}>
          {renderSourceName(config.sourceName, input)}
        </div>
      )}

      {/* Main content stack */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        maxWidth: 960, flexGrow: 1, justifyContent: vertJustify,
      }}>
        {renderCategoryTag(config.categoryTag, input)}
        {config.sourceName.position === 'above-title' && renderSourceName(config.sourceName, input)}
        {renderTitle(config.title, input)}
        {renderDescription(config.description, input)}
        {renderAuthor(config.author, input)}
        {renderDate(config.date, input)}
        {config.sourceName.position === 'below-title' && renderSourceName(config.sourceName, input)}
      </div>

      {/* Decorations (accent bars, dividers, etc.) */}
      {renderDecorations(config.decorations, input)}

      {/* Logo */}
      {renderLogo(config.logo, config.layout.theme, input)}
    </div>
  );
}
