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

function buildBackgroundStyle(config: TemplateConfig, input: TemplateInput): Record<string, unknown> {
  const bg = config.background;
  if (bg.type === 'solid' && bg.colors.length > 0) {
    return { backgroundColor: resolveColor(bg.colors[0], input) };
  }
  if (bg.type === 'linear-gradient' && bg.colors.length >= 2) {
    const angle = bg.gradientAngle ?? 160;
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

function verticalJustify(align: 'top' | 'center' | 'bottom'): string {
  if (align === 'bottom') return 'flex-end';
  if (align === 'center') return 'center';
  return 'flex-start';
}

// ---------------------------------------------------------------------------
// Archetype: Card
// ---------------------------------------------------------------------------
// A card with config.card styling floating over a background or image.
// Card contains all text content. Supports gradient borders, frosted glass,
// backdrop blur, and flexible card sizing.
// ---------------------------------------------------------------------------

export function renderCard(config: TemplateConfig, input: TemplateInput): any {
  const bgStyle = buildBackgroundStyle(config, input);
  const overlayStyle = config.image?.overlay ? buildOverlayStyle(config.image.overlay, input) : {};
  const hasImage = !!input.imageBase64 && !!config.image;

  const cardConfig = config.card || {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 24,
    border: '1px solid rgba(255,255,255,0.12)',
    padding: 64,
  };

  const cardBg = resolveColor(cardConfig.backgroundColor, input);
  const cardMaxW = cardConfig.maxWidth || 1000;
  const justifyContent = verticalJustify(config.title.verticalAlign);

  // Gradient border: render an outer wrapper with gradient background and inner card
  const hasGradientBorder = !!cardConfig.gradientBorder;
  const gradientBorderConfig = cardConfig.gradientBorder;

  const cardContent = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent,
        width: '100%',
        backgroundColor: cardBg,
        borderRadius: hasGradientBorder
          ? cardConfig.borderRadius - (gradientBorderConfig?.width || 2)
          : cardConfig.borderRadius,
        border: hasGradientBorder ? 'none' : (cardConfig.border || 'none'),
        padding: cardConfig.padding,
        backdropFilter: cardConfig.backdropFilter || undefined,
        position: 'relative',
      }}
    >
      {/* Category tag */}
      {config.categoryTag?.position === 'above-title' && (
        <div style={{ display: 'flex', marginBottom: 16 }}>
          {renderCategoryTag(config.categoryTag, input)}
        </div>
      )}

      {/* Source name above title */}
      {config.sourceName.position === 'above-title' && (
        <div style={{ display: 'flex', marginBottom: 16 }}>
          {renderSourceName(config.sourceName, input)}
        </div>
      )}

      {/* Title */}
      {renderTitle(config.title, input)}

      {/* Description */}
      {renderDescription(config.description, input)}

      {/* Author + Date */}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 16 }}>
        {renderAuthor(config.author, input)}
        {config.date?.position === 'inline-with-author' && renderDate(config.date, input)}
      </div>
      {config.date && config.date.position !== 'inline-with-author' && config.date.position !== 'top-right' && config.date.position !== 'bottom-bar' && (
        <div style={{ display: 'flex', marginTop: 8 }}>
          {renderDate(config.date, input)}
        </div>
      )}

      {/* Source name below title */}
      {config.sourceName.position === 'below-title' && (
        <div style={{ display: 'flex', marginTop: 28 }}>
          {renderSourceName(config.sourceName, input)}
        </div>
      )}
    </div>
  );

  // Wrap in gradient border if configured
  const cardElement = hasGradientBorder ? (
    <div
      style={{
        display: 'flex',
        width: cardMaxW,
        maxWidth: cardMaxW,
        background: `linear-gradient(${gradientBorderConfig!.angle}deg, ${resolveColor(gradientBorderConfig!.colors[0], input)}, ${resolveColor(gradientBorderConfig!.colors[1], input)})`,
        borderRadius: cardConfig.borderRadius,
        padding: gradientBorderConfig!.width,
        position: 'relative',
      }}
    >
      {cardContent}
    </div>
  ) : (
    <div style={{ display: 'flex', width: cardMaxW, maxWidth: cardMaxW }}>
      {cardContent}
    </div>
  );

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 1200,
        height: 630,
        position: 'relative',
        ...bgStyle,
      }}
    >
      {/* Background image if present */}
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

      {/* Overlay */}
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

      {/* Category tag at absolute positions (outside card) */}
      {config.categoryTag?.position === 'top-left' && (
        <div style={{ display: 'flex', position: 'absolute', top: 32, left: 32 }}>
          {renderCategoryTag(config.categoryTag, input)}
        </div>
      )}
      {config.categoryTag?.position === 'top-right' && (
        <div style={{ display: 'flex', position: 'absolute', top: 32, right: 32 }}>
          {renderCategoryTag(config.categoryTag, input)}
        </div>
      )}

      {/* Source name at absolute positions (outside card) */}
      {config.sourceName.position === 'top-left' && (
        <div style={{ display: 'flex', position: 'absolute', top: 32, left: 32 }}>
          {renderSourceName(config.sourceName, input)}
        </div>
      )}
      {config.sourceName.position === 'top-right' && (
        <div style={{ display: 'flex', position: 'absolute', top: 32, right: 32 }}>
          {renderSourceName(config.sourceName, input)}
        </div>
      )}

      {/* Date at top-right absolute */}
      {config.date?.position === 'top-right' && (
        <div style={{ display: 'flex', position: 'absolute', top: 32, right: 32 }}>
          {renderDate(config.date, input)}
        </div>
      )}

      {/* Card element */}
      {cardElement}

      {/* Decorations */}
      {renderDecorations(config.decorations, input)}

      {/* Logo */}
      {renderLogo(config.logo, config.layout.theme, input)}
    </div>
  );
}
