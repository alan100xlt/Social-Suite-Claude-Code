/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from '../types.ts';
import { resolveColor } from '../shared/brand-color.ts';
import { renderTitle } from '../shared/title.tsx';
import { renderLogo } from '../shared/logo.tsx';
import { renderSourceName } from '../shared/source-name.tsx';
import { renderAuthor, renderDate, renderCategoryTag, renderDescription } from '../shared/meta-layers.tsx';
import { renderDecorations } from '../shared/decorations.tsx';

export function renderBanner(config: TemplateConfig, input: TemplateInput): any {
  const bgColors = config.background.colors;
  const mainBg = bgColors.length > 0 ? resolveColor(bgColors[0], input) : '#0F0F0F';
  const padArr = typeof config.layout.padding === 'number'
    ? [config.layout.padding, config.layout.padding, config.layout.padding, config.layout.padding]
    : config.layout.padding;

  // Top banner bar -- uses staticLabels[0] if available
  const topLabel = config.staticLabels?.[0];
  const topBannerBg = topLabel?.backgroundColor
    ? resolveColor(topLabel.backgroundColor, input)
    : resolveColor('brandColor', input);

  // Bottom bar -- uses staticLabels[1] if available
  const bottomLabel = config.staticLabels?.[1];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      width: 1200, height: 630, position: 'relative',
      backgroundColor: mainBg,
    }}>
      {/* Top banner bar */}
      {topLabel && (
        <div style={{
          display: 'flex', alignItems: 'center',
          width: 1200, height: 72,
          backgroundColor: topBannerBg,
          paddingLeft: 48, paddingRight: 48,
        }}>
          <div style={{
            display: 'flex',
            fontSize: topLabel.fontSize,
            fontWeight: topLabel.fontWeight,
            color: resolveColor(topLabel.color, input),
            letterSpacing: 4,
            textTransform: topLabel.textTransform || 'uppercase',
          }}>
            {topLabel.text}
          </div>
          {input.sourceName && input.visibility.showSourceName && (
            <div style={{
              display: 'flex', marginLeft: 'auto',
              fontSize: 18, fontWeight: 400,
              color: 'rgba(255,255,255,0.85)',
            }}>
              {input.sourceName}
            </div>
          )}
        </div>
      )}

      {/* Thin accent line */}
      {config.decorations.some(d => d.type === 'accent-line') && (
        <div style={{
          display: 'flex', width: 1200, height: 4,
          backgroundColor: resolveColor(
            config.decorations.find(d => d.type === 'accent-line')?.color || '#FBBF24',
            input
          ),
        }} />
      )}

      {/* Main content area */}
      <div style={{
        display: 'flex', flexDirection: 'column', flex: 1,
        justifyContent: 'center',
        padding: `${padArr[0]}px ${padArr[1]}px ${padArr[2]}px ${padArr[3]}px`,
      }}>
        {renderCategoryTag(config.categoryTag, input)}
        {renderTitle(config.title, input)}
        {renderDescription(config.description, input)}
        {renderAuthor(config.author, input)}
        {renderDate(config.date, input)}
      </div>

      {/* Bottom bar */}
      {bottomLabel && (
        <div style={{
          display: 'flex', alignItems: 'center',
          height: 56, paddingLeft: 60, paddingRight: 60,
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{
            display: 'flex',
            fontSize: bottomLabel.fontSize,
            fontWeight: bottomLabel.fontWeight,
            color: resolveColor(bottomLabel.color, input),
          }}>
            {bottomLabel.text}
          </div>
        </div>
      )}

      {/* Source name in bottom-bar position */}
      {config.sourceName.position === 'bottom-bar' && (
        <div style={{
          display: 'flex', alignItems: 'center',
          height: 56, paddingLeft: 60, paddingRight: 60,
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}>
          {renderSourceName(config.sourceName, input)}
          {renderDate(config.date, input)}
        </div>
      )}

      {/* Extra decorations */}
      {renderDecorations(config.decorations.filter(d => d.type !== 'accent-line'), input)}

      {/* Logo */}
      {renderLogo(config.logo, config.layout.theme, input)}
    </div>
  );
}
