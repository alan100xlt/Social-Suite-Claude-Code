/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from '../types.ts';
import { resolveColor } from '../shared/brand-color.ts';
import { renderTitle } from '../shared/title.tsx';
import { renderLogo } from '../shared/logo.tsx';
import { renderSourceName } from '../shared/source-name.tsx';
import { renderAuthor, renderDate, renderDescription } from '../shared/meta-layers.tsx';
import { renderDecorations } from '../shared/decorations.tsx';

/** Calendar date block layout -- date block on left, text on right */
function renderCalendar(config: TemplateConfig, input: TemplateInput): any {
  const brand = resolveColor('brandColor', input);
  const bgColors = config.background.colors;
  const angle = config.background.gradientAngle ?? 135;
  const bgStyle = bgColors.length >= 2
    ? { background: `linear-gradient(${angle}deg, ${resolveColor(bgColors[0], input)} 0%, ${resolveColor(bgColors[1], input)} 100%)` }
    : { backgroundColor: resolveColor(bgColors[0] || '#0F172A', input) };

  const date = input.publishedAt ? new Date(input.publishedAt) : null;
  const month = date ? date.toLocaleString('en-US', { month: 'short' }).toUpperCase() : '';
  const day = date ? date.getDate().toString() : '';
  const year = date ? date.getFullYear().toString() : '';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      width: 1200, height: 630, position: 'relative',
      padding: 80, overflow: 'hidden',
      ...bgStyle,
    }}>
      {/* Main layout: date block + title */}
      <div style={{
        display: 'flex', flexDirection: 'row', alignItems: 'flex-start',
        flexGrow: 1, gap: 60,
      }}>
        {/* Calendar date block */}
        {date && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            width: 160, height: 180,
            backgroundColor: 'rgba(255,255,255,0.12)',
            borderRadius: 20, flexShrink: 0,
          }}>
            <div style={{ display: 'flex', fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: 3 }}>
              {month}
            </div>
            <div style={{ display: 'flex', fontSize: 72, fontWeight: 700, color: '#FFFFFF', lineHeight: 1, marginTop: 4 }}>
              {day}
            </div>
            <div style={{ display: 'flex', fontSize: 16, fontWeight: 400, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
              {year}
            </div>
          </div>
        )}

        {/* Title and description */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1 }}>
          {renderTitle(config.title, input)}
          {renderDescription(config.description, input)}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 32 }}>
        <div style={{ display: 'flex', width: 40, height: 3, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2 }} />
        {renderSourceName(config.sourceName, input)}
      </div>

      {renderDecorations(config.decorations, input)}
      {renderLogo(config.logo, config.layout.theme, input)}
    </div>
  );
}

/** Terminal/code layout -- dots, brackets, grid bg */
function renderTerminal(config: TemplateConfig, input: TemplateInput): any {
  const brand = resolveColor('brandColor', input);
  const bgColors = config.background.colors;
  const bgColor = bgColors.length > 0 ? resolveColor(bgColors[0], input) : '#0F172A';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      width: 1200, height: 630, position: 'relative',
      backgroundColor: bgColor, padding: 80,
    }}>
      {/* Terminal dots */}
      <div style={{ display: 'flex', flexDirection: 'row', gap: 12, marginBottom: 40 }}>
        <div style={{ display: 'flex', width: 16, height: 16, borderRadius: 8, backgroundColor: '#EF4444' }} />
        <div style={{ display: 'flex', width: 16, height: 16, borderRadius: 8, backgroundColor: '#F59E0B' }} />
        <div style={{ display: 'flex', width: 16, height: 16, borderRadius: 8, backgroundColor: '#22C55E' }} />
      </div>

      {/* Content with bracket treatment */}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flexGrow: 1, gap: 24 }}>
        <div style={{ display: 'flex', fontSize: 120, fontWeight: 200, color: brand, lineHeight: 1 }}>
          {'{'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
          {renderSourceName(config.sourceName, input)}
          {renderTitle(config.title, input)}
          {renderDescription(config.description, input)}
          {renderAuthor(config.author, input)}
        </div>
        <div style={{ display: 'flex', fontSize: 120, fontWeight: 200, color: brand, lineHeight: 1 }}>
          {'}'}
        </div>
      </div>

      {renderDecorations(config.decorations, input)}
      {renderLogo(config.logo, config.layout.theme, input)}
    </div>
  );
}

export function renderSpecial(config: TemplateConfig, input: TemplateInput): any {
  // Route based on config id prefix
  if (config.id.startsWith('calendar-') || config.id.startsWith('brand-event')) {
    return renderCalendar(config, input);
  }
  if (config.id.startsWith('terminal-') || config.id.startsWith('brand-code')) {
    return renderTerminal(config, input);
  }

  // Default fallback -- centered layout
  const bgColors = config.background.colors;
  const bgStyle = bgColors.length >= 2
    ? { background: `linear-gradient(135deg, ${resolveColor(bgColors[0], input)} 0%, ${resolveColor(bgColors[1], input)} 100%)` }
    : { backgroundColor: resolveColor(bgColors[0] || '#0F172A', input) };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      width: 1200, height: 630, position: 'relative', padding: 80,
      ...bgStyle,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 960 }}>
        {renderTitle(config.title, input)}
        {renderDescription(config.description, input)}
        {renderSourceName(config.sourceName, input)}
      </div>
      {renderDecorations(config.decorations, input)}
      {renderLogo(config.logo, config.layout.theme, input)}
    </div>
  );
}
