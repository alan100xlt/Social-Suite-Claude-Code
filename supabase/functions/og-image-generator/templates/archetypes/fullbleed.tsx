/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from '../types.ts';
import { resolveColor } from '../shared/brand-color.ts';
import { renderTitle } from '../shared/title.tsx';
import { renderLogo } from '../shared/logo.tsx';
import { renderSourceName } from '../shared/source-name.tsx';
import { renderAuthor, renderDate, renderCategoryTag, renderDescription } from '../shared/meta-layers.tsx';
import { renderDecorations } from '../shared/decorations.tsx';

function buildOverlay(overlay: NonNullable<TemplateConfig['image']>['overlay'], input: TemplateInput): Record<string, unknown> {
  if (!overlay) return {};
  const opacity = overlay.opacity ?? 0.7;

  switch (overlay.type) {
    case 'dark-gradient-bottom':
      return { background: `linear-gradient(to bottom, rgba(0,0,0,0) 30%, rgba(0,0,0,${opacity}) 100%)` };
    case 'dark-gradient-top':
      return { background: `linear-gradient(to top, rgba(0,0,0,0) 30%, rgba(0,0,0,${opacity}) 100%)` };
    case 'dark-gradient-radial':
      return { background: `radial-gradient(circle at center, rgba(0,0,0,0) 20%, rgba(0,0,0,${opacity}) 100%)` };
    case 'solid-dim':
      return { backgroundColor: `rgba(0,0,0,${opacity})` };
    case 'brand-duotone': {
      const brand = resolveColor('brandColor', input);
      return { backgroundColor: brand, opacity, mixBlendMode: 'multiply' };
    }
    case 'brand-tint': {
      const brand = resolveColor('brandColor', input);
      return { backgroundColor: brand, opacity: opacity * 0.4 };
    }
    case 'vignette':
      return { background: `radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,${opacity}) 100%)` };
    default:
      return {};
  }
}

export function renderFullbleed(config: TemplateConfig, input: TemplateInput): any {
  const padArr = typeof config.layout.padding === 'number'
    ? [config.layout.padding, config.layout.padding, config.layout.padding, config.layout.padding]
    : config.layout.padding;

  const overlayStyle = config.image?.overlay ? buildOverlay(config.image.overlay, input) : {};
  const imgFilter = config.image?.filter || undefined;
  const vertJustify = config.title.verticalAlign === 'bottom' ? 'flex-end'
    : config.title.verticalAlign === 'center' ? 'center' : 'flex-start';

  return (
    <div style={{ display: 'flex', width: 1200, height: 630, position: 'relative' }}>
      {/* Background image */}
      {input.imageBase64 && (
        <img
          src={input.imageBase64}
          style={{
            width: 1200, height: 630, objectFit: 'cover',
            position: 'absolute', top: 0, left: 0,
            filter: imgFilter,
          }}
        />
      )}

      {/* Overlay */}
      <div style={{
        display: 'flex', position: 'absolute', top: 0, left: 0,
        width: 1200, height: 630, ...overlayStyle,
      }} />

      {/* Content */}
      <div style={{
        display: 'flex', flexDirection: 'column', justifyContent: vertJustify,
        width: 1200, height: 630, position: 'relative',
        padding: `${padArr[0]}px ${padArr[1]}px ${padArr[2]}px ${padArr[3]}px`,
      }}>
        {/* Category tag (if position is above-title or top-left) */}
        {renderCategoryTag(config.categoryTag, input)}

        {/* Source name (if position is above-title) */}
        {config.sourceName.position === 'above-title' && renderSourceName(config.sourceName, input)}

        {/* Title */}
        {renderTitle(config.title, input)}

        {/* Description */}
        {renderDescription(config.description, input)}

        {/* Author + Date */}
        {renderAuthor(config.author, input)}
        {renderDate(config.date, input)}

        {/* Source name (if position is below-title) */}
        {config.sourceName.position === 'below-title' && renderSourceName(config.sourceName, input)}
      </div>

      {/* Source name badge (absolute positioned) */}
      {(config.sourceName.position === 'top-left' || config.sourceName.position === 'top-right') && (
        <div style={{
          display: 'flex', position: 'absolute',
          ...(config.sourceName.position === 'top-left' ? { top: 32, left: 32 } : { top: 32, right: 32 }),
        }}>
          {renderSourceName(config.sourceName, input)}
        </div>
      )}

      {/* Decorations */}
      {renderDecorations(config.decorations, input)}

      {/* Logo */}
      {renderLogo(config.logo, config.layout.theme, input)}
    </div>
  );
}
