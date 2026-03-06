/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from '../types.ts';
import { resolveColor } from '../shared/brand-color.ts';
import { renderTitle } from '../shared/title.tsx';
import { renderLogo } from '../shared/logo.tsx';
import { renderSourceName } from '../shared/source-name.tsx';
import { renderAuthor, renderDate, renderCategoryTag, renderDescription } from '../shared/meta-layers.tsx';
import { renderDecorations } from '../shared/decorations.tsx';

export function renderSplitTB(config: TemplateConfig, input: TemplateInput): any {
  const [topPct, bottomPct] = config.layout.splitRatio || [50, 50];
  const topH = Math.round(630 * topPct / 100);
  const bottomH = 630 - topH;
  const padArr = typeof config.layout.padding === 'number'
    ? [config.layout.padding, config.layout.padding, config.layout.padding, config.layout.padding]
    : config.layout.padding;

  const imgOnTop = config.image?.position === 'top-panel';
  const imgH = imgOnTop ? topH : bottomH;
  const textH = imgOnTop ? bottomH : topH;

  const bgColors = config.background.colors;
  const bgStyle: Record<string, unknown> = {};
  if (config.background.type === 'solid' && bgColors.length > 0) {
    bgStyle.backgroundColor = resolveColor(bgColors[0], input);
  } else if (config.background.type === 'linear-gradient' && bgColors.length >= 2) {
    const angle = config.background.gradientAngle ?? 180;
    bgStyle.background = `linear-gradient(${angle}deg, ${resolveColor(bgColors[0], input)} 0%, ${resolveColor(bgColors[1], input)} 100%)`;
  }

  const vertJustify = config.title.verticalAlign === 'bottom' ? 'flex-end'
    : config.title.verticalAlign === 'center' ? 'center' : 'flex-start';

  const imagePanel = input.imageBase64 ? (
    <div style={{ display: 'flex', width: 1200, height: imgH, overflow: 'hidden' }}>
      <img
        src={input.imageBase64}
        style={{
          width: 1200, height: imgH, objectFit: 'cover',
          borderRadius: config.image?.borderRadius || 0,
        }}
      />
    </div>
  ) : null;

  const textPanel = (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: vertJustify,
      width: 1200, height: textH, ...bgStyle,
      padding: `${padArr[0]}px ${padArr[1]}px ${padArr[2]}px ${padArr[3]}px`,
    }}>
      {renderCategoryTag(config.categoryTag, input)}
      {config.sourceName.position === 'above-title' && renderSourceName(config.sourceName, input)}
      {renderTitle(config.title, input)}
      {renderDescription(config.description, input)}
      {renderAuthor(config.author, input)}
      {renderDate(config.date, input)}
      {config.sourceName.position === 'below-title' && renderSourceName(config.sourceName, input)}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: 1200, height: 630, position: 'relative' }}>
      {imgOnTop ? imagePanel : textPanel}
      {imgOnTop ? textPanel : imagePanel}
      {renderDecorations(config.decorations, input)}
      {renderLogo(config.logo, config.layout.theme, input)}
    </div>
  );
}
