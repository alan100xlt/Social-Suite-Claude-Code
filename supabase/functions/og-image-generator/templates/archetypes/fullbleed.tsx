/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput, OverlayType } from '../types.ts';
import { resolveColor } from '../shared/brand-color.ts';
import { renderTitle } from '../shared/title.tsx';
import { renderLogo } from '../shared/logo.tsx';
import { renderSourceName } from '../shared/source-name.tsx';
import { renderAuthor, renderDate, renderCategoryTag, renderDescription } from '../shared/meta-layers.tsx';
import { renderDecorations } from '../shared/decorations.tsx';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizePadding(p: number | [number, number, number, number]): [number, number, number, number] {
  return Array.isArray(p) ? p : [p, p, p, p];
}

function buildOverlayStyle(
  overlay: { type: OverlayType; opacity?: number } | undefined,
  input: TemplateInput,
): Record<string, unknown> {
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
    case 'blur':
      return { backdropFilter: `blur(${Math.round(opacity * 20)}px)`, backgroundColor: `rgba(0,0,0,${opacity * 0.3})` };
    default:
      return {};
  }
}

function buildBackgroundStyle(config: TemplateConfig, input: TemplateInput): Record<string, unknown> {
  const bg = config.background;
  if (bg.type === 'solid' && bg.colors.length > 0) {
    return { backgroundColor: resolveColor(bg.colors[0], input) };
  }
  if (bg.type === 'linear-gradient' && bg.colors.length >= 2) {
    const angle = bg.gradientAngle ?? 180;
    return {
      background: `linear-gradient(${angle}deg, ${resolveColor(bg.colors[0], input)} 0%, ${resolveColor(bg.colors[1], input)} 100%)`,
    };
  }
  if (bg.type === 'radial-gradient' && bg.colors.length >= 2) {
    return {
      background: `radial-gradient(circle at center, ${resolveColor(bg.colors[0], input)} 0%, ${resolveColor(bg.colors[1], input)} 100%)`,
    };
  }
  return {};
}

function verticalJustify(align: 'top' | 'center' | 'bottom'): string {
  if (align === 'bottom') return 'flex-end';
  if (align === 'center') return 'center';
  return 'flex-start';
}

// ---------------------------------------------------------------------------
// Archetype: Fullbleed
// ---------------------------------------------------------------------------
// Full-bleed image fills entire 1200x630, overlay on top, text positioned
// via verticalAlign. Falls back to solid/gradient background when no image.
// ---------------------------------------------------------------------------

export function renderFullbleed(config: TemplateConfig, input: TemplateInput): any {
  const pad = normalizePadding(config.layout.padding);
  const overlayStyle = config.image?.overlay ? buildOverlayStyle(config.image.overlay, input) : {};
  const imgFilter = config.image?.filter || undefined;
  const justifyContent = verticalJustify(config.title.verticalAlign);
  const hasImage = !!input.imageBase64;
  const bgStyle = !hasImage ? buildBackgroundStyle(config, input) : {};

  return (
    <div style={{ display: 'flex', width: 1200, height: 630, position: 'relative', ...bgStyle }}>
      {/* Background image */}
      {hasImage && (
        <img
          src={input.imageBase64!}
          style={{
            width: 1200,
            height: 630,
            objectFit: 'cover',
            position: 'absolute',
            top: 0,
            left: 0,
            filter: imgFilter,
          }}
        />
      )}

      {/* Overlay layer */}
      {(hasImage || Object.keys(overlayStyle).length > 0) && (
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            ...overlayStyle,
          }}
        />
      )}

      {/* Content layer */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent,
          width: 1200,
          height: 630,
          position: 'relative',
          padding: `${pad[0]}px ${pad[1]}px ${pad[2]}px ${pad[3]}px`,
        }}
      >
        {/* Category tag (above-title or top-left) */}
        {config.categoryTag?.position === 'top-left' && (
          <div style={{ display: 'flex', position: 'absolute', top: pad[0], left: pad[3] }}>
            {renderCategoryTag(config.categoryTag, input)}
          </div>
        )}
        {config.categoryTag?.position === 'top-right' && (
          <div style={{ display: 'flex', position: 'absolute', top: pad[0], right: pad[1] }}>
            {renderCategoryTag(config.categoryTag, input)}
          </div>
        )}
        {config.categoryTag?.position === 'above-title' && renderCategoryTag(config.categoryTag, input)}

        {/* Source name (above-title flow) */}
        {config.sourceName.position === 'above-title' && (
          <div style={{ display: 'flex', marginBottom: 12 }}>
            {renderSourceName(config.sourceName, input)}
          </div>
        )}

        {/* Title */}
        {renderTitle(config.title, input)}

        {/* Description */}
        {renderDescription(config.description, input)}

        {/* Author + Date */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 }}>
          {renderAuthor(config.author, input)}
          {config.date?.position === 'inline-with-author' && renderDate(config.date, input)}
        </div>
        {config.date?.position !== 'inline-with-author' && renderDate(config.date, input)}

        {/* Source name (below-title flow) */}
        {config.sourceName.position === 'below-title' && (
          <div style={{ display: 'flex', marginTop: 20 }}>
            {renderSourceName(config.sourceName, input)}
          </div>
        )}
      </div>

      {/* Source name badge (absolute positioned) */}
      {config.sourceName.position === 'top-left' && (
        <div style={{ display: 'flex', position: 'absolute', top: pad[0], left: pad[3] }}>
          {renderSourceName(config.sourceName, input)}
        </div>
      )}
      {config.sourceName.position === 'top-right' && (
        <div style={{ display: 'flex', position: 'absolute', top: pad[0], right: pad[1] }}>
          {renderSourceName(config.sourceName, input)}
        </div>
      )}

      {/* Bottom bar source name */}
      {config.sourceName.position === 'bottom-bar' && (
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: 1200,
            height: 56,
            alignItems: 'center',
            paddingLeft: pad[3],
            paddingRight: pad[1],
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {renderSourceName(config.sourceName, input)}
          <div style={{ display: 'flex', marginLeft: 'auto' }}>
            {config.date?.position === 'bottom-bar' && renderDate(config.date, input)}
          </div>
        </div>
      )}

      {/* Decorations */}
      {renderDecorations(config.decorations, input)}

      {/* Logo */}
      {renderLogo(config.logo, config.layout.theme, input)}
    </div>
  );
}
