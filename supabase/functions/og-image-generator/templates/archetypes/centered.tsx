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
  if (bg.type === 'radial-gradient' && bg.colors.length >= 2) {
    return { background: `radial-gradient(circle at center, ${resolveColor(bg.colors[0], input)} 0%, ${resolveColor(bg.colors[1], input)} 100%)` };
  }
  return {};
}

export function renderCentered(config: TemplateConfig, input: TemplateInput): any {
  const padArr = typeof config.layout.padding === 'number'
    ? [config.layout.padding, config.layout.padding, config.layout.padding, config.layout.padding]
    : config.layout.padding;

  const bgStyle = buildBackground(config, input);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      width: 1200, height: 630, position: 'relative',
      padding: `${padArr[0]}px ${padArr[1]}px ${padArr[2]}px ${padArr[3]}px`,
      ...bgStyle,
    }}>
      {/* Background image if present */}
      {input.imageBase64 && config.image && (
        <img
          src={input.imageBase64}
          style={{
            width: 1200, height: 630, objectFit: 'cover',
            position: 'absolute', top: 0, left: 0,
            filter: config.image.filter || undefined,
          }}
        />
      )}

      {/* Overlay for image backgrounds */}
      {input.imageBase64 && config.image?.overlay && (
        <div style={{
          display: 'flex', position: 'absolute', top: 0, left: 0,
          width: 1200, height: 630,
          backgroundColor: `rgba(0,0,0,${config.image.overlay.opacity ?? 0.5})`,
        }} />
      )}

      {/* Centered content container */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', maxWidth: 960, position: 'relative',
      }}>
        {renderCategoryTag(config.categoryTag, input)}
        {config.sourceName.position === 'above-title' && (
          <div style={{ display: 'flex', marginBottom: 16 }}>
            {renderSourceName(config.sourceName, input)}
          </div>
        )}
        {renderTitle(config.title, input)}
        {renderDescription(config.description, input)}
        {renderAuthor(config.author, input)}
        {renderDate(config.date, input)}
        {config.sourceName.position === 'below-title' && (
          <div style={{ display: 'flex', marginTop: 24 }}>
            {renderSourceName(config.sourceName, input)}
          </div>
        )}
      </div>

      {/* Decorations */}
      {renderDecorations(config.decorations, input)}

      {/* Logo */}
      {renderLogo(config.logo, config.layout.theme, input)}
    </div>
  );
}
