/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from '../types.ts';
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
// Archetype: Text-Forward
// ---------------------------------------------------------------------------
// Text-dominant layout with gradient/solid background. Large text takes
// priority. Small decorative elements only -- no prominent image.
// Good for brand announcements, minimal designs, and startup-style graphics.
// ---------------------------------------------------------------------------

export function renderTextForward(config: TemplateConfig, input: TemplateInput): any {
  const pad = normalizePadding(config.layout.padding);
  const bgStyle = buildBackgroundStyle(config, input);
  const justifyContent = verticalJustify(config.title.verticalAlign);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent,
        width: 1200,
        height: 630,
        position: 'relative',
        padding: `${pad[0]}px ${pad[1]}px ${pad[2]}px ${pad[3]}px`,
        ...bgStyle,
      }}
    >
      {/* Source name at absolute top positions */}
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

      {/* Date at top-right absolute */}
      {config.date?.position === 'top-right' && (
        <div style={{ display: 'flex', position: 'absolute', top: pad[0], right: pad[1] }}>
          {renderDate(config.date, input)}
        </div>
      )}

      {/* Main content stack */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          maxWidth: 960,
          flexGrow: 1,
          justifyContent,
        }}
      >
        {/* Category tag inline */}
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

        {/* Title (dominant element) */}
        {renderTitle(config.title, input)}

        {/* Description */}
        {renderDescription(config.description, input)}

        {/* Author + Date */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 16 }}>
          {renderAuthor(config.author, input)}
          {config.date?.position === 'inline-with-author' && renderDate(config.date, input)}
        </div>
        {config.date && config.date.position !== 'inline-with-author' && config.date.position !== 'top-right' && config.date.position !== 'bottom-bar' && (
          renderDate(config.date, input)
        )}

        {/* Source name below title */}
        {config.sourceName.position === 'below-title' && (
          <div style={{ display: 'flex', marginTop: 24 }}>
            {renderSourceName(config.sourceName, input)}
          </div>
        )}
      </div>

      {/* Bottom bar source name + date */}
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

      {/* Decorations (accent bars, dividers, etc.) */}
      {renderDecorations(config.decorations, input)}

      {/* Logo */}
      {renderLogo(config.logo, config.layout.theme, input)}
    </div>
  );
}
