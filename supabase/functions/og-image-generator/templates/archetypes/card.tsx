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
    const angle = bg.gradientAngle ?? 160;
    return { background: `linear-gradient(${angle}deg, ${resolveColor(bg.colors[0], input)} 0%, ${resolveColor(bg.colors[1], input)} 100%)` };
  }
  if (bg.type === 'radial-gradient' && bg.colors.length >= 2) {
    return { background: `radial-gradient(circle at center, ${resolveColor(bg.colors[0], input)} 0%, ${resolveColor(bg.colors[1], input)} 100%)` };
  }
  return {};
}

export function renderCard(config: TemplateConfig, input: TemplateInput): any {
  const bgStyle = buildBackground(config, input);
  const cardConfig = config.card || {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 24,
    border: '1px solid rgba(255,255,255,0.12)',
    padding: 64,
  };

  const cardBg = resolveColor(cardConfig.backgroundColor, input);
  const cardMaxW = cardConfig.maxWidth || 1000;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: 1200, height: 630, position: 'relative',
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

      {/* Card */}
      <div style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        width: cardMaxW, maxWidth: cardMaxW,
        backgroundColor: cardBg,
        borderRadius: cardConfig.borderRadius,
        border: cardConfig.border || 'none',
        padding: cardConfig.padding,
        backdropFilter: cardConfig.backdropFilter || undefined,
        position: 'relative',
      }}>
        {renderCategoryTag(config.categoryTag, input)}
        {config.sourceName.position === 'above-title' && renderSourceName(config.sourceName, input)}
        {renderTitle(config.title, input)}
        {renderDescription(config.description, input)}
        {renderAuthor(config.author, input)}
        {renderDate(config.date, input)}
        {config.sourceName.position === 'below-title' && (
          <div style={{ display: 'flex', marginTop: 28 }}>
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
