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

// ---------------------------------------------------------------------------
// Archetype: Banner
// ---------------------------------------------------------------------------
// News banner / ticker style with horizontal bands, bold typography,
// category tags, and ticker-style info bars. Supports:
// - Top banner bar (from staticLabels[0])
// - Accent lines between sections
// - Main content area with title/description
// - Bottom info bar (from staticLabels[1] or source name bottom-bar)
// - Background image with overlay (for photo-banner variants)
// ---------------------------------------------------------------------------

export function renderBanner(config: TemplateConfig, input: TemplateInput): any {
  const bgColors = config.background.colors;
  const mainBg = bgColors.length > 0 ? resolveColor(bgColors[0], input) : '#0F0F0F';
  const pad = normalizePadding(config.layout.padding);
  const hasImage = !!input.imageBase64 && config.background.type === 'image-fullbleed';
  const overlayStyle = config.image?.overlay ? buildOverlayStyle(config.image.overlay, input) : {};

  // Top banner bar -- uses staticLabels[0] if available
  const topLabel = config.staticLabels?.[0];
  const topBannerBg = topLabel?.backgroundColor
    ? resolveColor(topLabel.backgroundColor, input)
    : resolveColor('brandColor', input);

  // Bottom bar -- uses staticLabels[1] if available
  const bottomLabel = config.staticLabels?.[1];

  // Find accent-line decorations (rendered inline, not via renderDecorations)
  const accentLine = config.decorations.find(d => d.type === 'accent-line');
  const otherDecorations = config.decorations.filter(d => d.type !== 'accent-line');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: 1200,
        height: 630,
        position: 'relative',
        backgroundColor: mainBg,
      }}
    >
      {/* Background image for photo-banner variants */}
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
            filter: config.image?.filter || undefined,
          }}
        />
      )}

      {/* Overlay on background image */}
      {hasImage && Object.keys(overlayStyle).length > 0 && (
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

      {/* Top banner bar */}
      {topLabel && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            width: 1200,
            height: 72,
            backgroundColor: topBannerBg,
            paddingLeft: 48,
            paddingRight: 48,
            position: 'relative',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: topLabel.fontSize,
              fontWeight: topLabel.fontWeight,
              color: resolveColor(topLabel.color, input),
              letterSpacing: 4,
              textTransform: topLabel.textTransform || 'uppercase',
            }}
          >
            {topLabel.text}
          </div>
          {/* Source name in top banner */}
          {input.sourceName && input.visibility.showSourceName && (
            <div
              style={{
                display: 'flex',
                marginLeft: 'auto',
                fontSize: 18,
                fontWeight: 400,
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              {input.sourceName}
            </div>
          )}
        </div>
      )}

      {/* Accent line below banner */}
      {accentLine && (
        <div
          style={{
            display: 'flex',
            width: accentLine.width || 1200,
            height: accentLine.height || 4,
            backgroundColor: resolveColor(accentLine.color || '#FBBF24', input),
            flexShrink: 0,
          }}
        />
      )}

      {/* Main content area */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          justifyContent: 'center',
          padding: `${pad[0]}px ${pad[1]}px ${pad[2]}px ${pad[3]}px`,
          position: 'relative',
        }}
      >
        {/* Category tag (inline-banner or above-title) */}
        {config.categoryTag?.position === 'inline-banner' && (
          <div style={{ display: 'flex', marginBottom: 20 }}>
            {renderCategoryTag(config.categoryTag, input)}
          </div>
        )}
        {config.categoryTag?.position === 'above-title' && (
          <div style={{ display: 'flex', marginBottom: 16 }}>
            {renderCategoryTag(config.categoryTag, input)}
          </div>
        )}

        {/* Source name above title (in content area) */}
        {config.sourceName.position === 'above-title' && (
          <div style={{ display: 'flex', marginBottom: 12 }}>
            {renderSourceName(config.sourceName, input)}
          </div>
        )}

        {/* Title */}
        {renderTitle(config.title, input)}

        {/* Description */}
        {renderDescription(config.description, input)}

        {/* Author + Date inline */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 16 }}>
          {renderAuthor(config.author, input)}
          {config.date?.position === 'inline-with-author' && renderDate(config.date, input)}
        </div>
        {config.date && config.date.position !== 'inline-with-author' && config.date.position !== 'bottom-bar' && config.date.position !== 'top-right' && (
          renderDate(config.date, input)
        )}

        {/* Source name below title */}
        {config.sourceName.position === 'below-title' && (
          <div style={{ display: 'flex', marginTop: 20 }}>
            {renderSourceName(config.sourceName, input)}
          </div>
        )}
      </div>

      {/* Bottom static label bar */}
      {bottomLabel && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            height: 56,
            paddingLeft: 60,
            paddingRight: 60,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            position: 'relative',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: bottomLabel.fontSize,
              fontWeight: bottomLabel.fontWeight,
              color: resolveColor(bottomLabel.color, input),
            }}
          >
            {bottomLabel.text}
          </div>
        </div>
      )}

      {/* Source name in bottom-bar position (separate from staticLabels) */}
      {config.sourceName.position === 'bottom-bar' && !bottomLabel && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            height: 56,
            paddingLeft: 60,
            paddingRight: 60,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            position: 'relative',
            flexShrink: 0,
          }}
        >
          {renderSourceName(config.sourceName, input)}
          <div style={{ display: 'flex', marginLeft: 'auto' }}>
            {config.date?.position === 'bottom-bar' && renderDate(config.date, input)}
          </div>
        </div>
      )}

      {/* Source name + date in bottom-bar position alongside static label */}
      {config.sourceName.position === 'bottom-bar' && bottomLabel && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            height: 48,
            paddingLeft: 60,
            paddingRight: 60,
            position: 'relative',
            flexShrink: 0,
          }}
        >
          {renderSourceName(config.sourceName, input)}
          <div style={{ display: 'flex', marginLeft: 'auto' }}>
            {config.date?.position === 'bottom-bar' && renderDate(config.date, input)}
          </div>
        </div>
      )}

      {/* Category tag at absolute positions */}
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

      {/* Extra decorations (excluding accent-line, rendered above) */}
      {renderDecorations(otherDecorations, input)}

      {/* Logo */}
      {renderLogo(config.logo, config.layout.theme, input)}
    </div>
  );
}
