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
    const angle = bg.gradientAngle ?? 135;
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
// Stats grid renderer
// ---------------------------------------------------------------------------
// Renders input.stats as a responsive grid of metric cards.
// Supports 1-6 stats. Layout adapts: 1-3 in a row, 4+ in 2 rows.
// ---------------------------------------------------------------------------

function renderStatsGrid(
  stats: Array<{ label: string; value: string; change?: string }>,
  brandColor: string,
  cardBgColor: string,
  cardRadius: number,
): any {
  if (!stats || stats.length === 0) return null;

  // Determine grid layout: up to 3 per row
  const perRow = stats.length <= 3 ? stats.length : Math.ceil(stats.length / 2);
  const rows: Array<typeof stats> = [];
  for (let i = 0; i < stats.length; i += perRow) {
    rows.push(stats.slice(i, i + perRow));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', flexDirection: 'row', gap: 16, width: '100%' }}>
          {row.map((stat, si) => (
            <div
              key={si}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                backgroundColor: cardBgColor,
                borderRadius: cardRadius,
                padding: '24px 16px',
              }}
            >
              {/* Stat value */}
              <div
                style={{
                  display: 'flex',
                  fontSize: 44,
                  fontWeight: 700,
                  color: brandColor,
                  lineHeight: 1,
                }}
              >
                {stat.value}
              </div>
              {/* Stat label */}
              <div
                style={{
                  display: 'flex',
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.6)',
                  marginTop: 8,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                {stat.label}
              </div>
              {/* Change indicator */}
              {stat.change && (
                <div
                  style={{
                    display: 'flex',
                    fontSize: 13,
                    fontWeight: 600,
                    color: stat.change.startsWith('-') ? '#EF4444' : '#22C55E',
                    marginTop: 6,
                  }}
                >
                  {stat.change.startsWith('-') || stat.change.startsWith('+') ? stat.change : `+${stat.change}`}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stats bar chart renderer
// ---------------------------------------------------------------------------
// Renders input.stats as horizontal bars (bar-chart style).
// ---------------------------------------------------------------------------

function renderStatsBars(
  stats: Array<{ label: string; value: string; change?: string }>,
  brandColor: string,
): any {
  if (!stats || stats.length === 0) return null;

  // Parse numeric values for relative bar widths
  const numericValues = stats.map(s => {
    const num = parseFloat(s.value.replace(/[^0-9.\-]/g, ''));
    return isNaN(num) ? 0 : Math.abs(num);
  });
  const maxVal = Math.max(...numericValues, 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
      {stats.map((stat, i) => {
        const barPct = Math.max(15, (numericValues[i] / maxVal) * 100);
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Label + value row */}
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>
                {stat.label}
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', fontSize: 20, fontWeight: 700, color: '#FFFFFF' }}>
                  {stat.value}
                </div>
                {stat.change && (
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 13,
                      fontWeight: 600,
                      color: stat.change.startsWith('-') ? '#EF4444' : '#22C55E',
                    }}
                  >
                    {stat.change}
                  </div>
                )}
              </div>
            </div>
            {/* Bar */}
            <div
              style={{
                display: 'flex',
                width: '100%',
                height: 8,
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  width: `${barPct}%`,
                  height: 8,
                  backgroundColor: brandColor,
                  borderRadius: 4,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calendar date block sub-layout
// ---------------------------------------------------------------------------

function renderCalendar(config: TemplateConfig, input: TemplateInput): any {
  const bgStyle = buildBackgroundStyle(config, input);
  const date = input.publishedAt ? new Date(input.publishedAt) : null;
  const month = date ? date.toLocaleString('en-US', { month: 'short' }).toUpperCase() : '';
  const day = date ? date.getDate().toString() : '';
  const year = date ? date.getFullYear().toString() : '';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: 1200,
        height: 630,
        position: 'relative',
        padding: 80,
        overflow: 'hidden',
        ...bgStyle,
      }}
    >
      {/* Main layout: date block + title */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
          flexGrow: 1,
          gap: 60,
        }}
      >
        {/* Calendar date block */}
        {date && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: 160,
              height: 180,
              backgroundColor: 'rgba(255,255,255,0.12)',
              borderRadius: 20,
              flexShrink: 0,
            }}
          >
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

// ---------------------------------------------------------------------------
// Terminal / code block sub-layout
// ---------------------------------------------------------------------------

function renderTerminal(config: TemplateConfig, input: TemplateInput): any {
  const brand = resolveColor('brandColor', input);
  const bgColors = config.background.colors;
  const bgColor = bgColors.length > 0 ? resolveColor(bgColors[0], input) : '#0F172A';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: 1200,
        height: 630,
        position: 'relative',
        backgroundColor: bgColor,
        padding: 80,
      }}
    >
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

// ---------------------------------------------------------------------------
// Stats-focused sub-layout
// ---------------------------------------------------------------------------
// Primary purpose: renders stat grids and number-heavy layouts from input.stats.
// Routes to grid or bar chart based on decoration hints in config.
// ---------------------------------------------------------------------------

function renderStats(config: TemplateConfig, input: TemplateInput): any {
  const pad = normalizePadding(config.layout.padding);
  const bgStyle = buildBackgroundStyle(config, input);
  const brand = resolveColor('brandColor', input);
  const justifyContent = verticalJustify(config.title.verticalAlign);

  // Determine stats visualization style from decorations
  const hasBarChart = config.decorations.some(d => d.type === 'bar-chart');
  const hasMetricGrid = config.decorations.some(d => d.type === 'metric-grid');

  // Find metric-grid decoration for card styling
  const metricGridDeco = config.decorations.find(d => d.type === 'metric-grid');
  const gridCardBg = metricGridDeco?.color || '#1E293B';
  const gridCardRadius = metricGridDeco?.borderRadius || 16;

  // Filter out stat-specific decorations handled inline
  const otherDecorations = config.decorations.filter(d => d.type !== 'bar-chart' && d.type !== 'metric-grid');

  // If using split-tb layout with stats in bottom panel
  if (config.layout.splitRatio) {
    const [topPct] = config.layout.splitRatio;
    const topH = Math.round(630 * topPct / 100);
    const bottomH = 630 - topH;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: 1200, height: 630, position: 'relative', ...bgStyle }}>
        {/* Top: text content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent,
            width: 1200,
            height: topH,
            padding: `${pad[0]}px ${pad[1]}px 24px ${pad[3]}px`,
            flexShrink: 0,
          }}
        >
          {config.categoryTag?.position === 'above-title' && (
            <div style={{ display: 'flex', marginBottom: 12 }}>
              {renderCategoryTag(config.categoryTag, input)}
            </div>
          )}
          {config.sourceName.position === 'above-title' && (
            <div style={{ display: 'flex', marginBottom: 12 }}>
              {renderSourceName(config.sourceName, input)}
            </div>
          )}
          {renderTitle(config.title, input)}
          {renderDescription(config.description, input)}
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 }}>
            {renderAuthor(config.author, input)}
          </div>
        </div>

        {/* Bottom: stats grid */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: 1200,
            height: bottomH,
            padding: `16px ${pad[1]}px ${pad[2]}px ${pad[3]}px`,
            flexShrink: 0,
          }}
        >
          {input.stats && input.stats.length > 0 ? (
            hasBarChart
              ? renderStatsBars(input.stats, brand)
              : renderStatsGrid(input.stats, brand, gridCardBg, gridCardRadius)
          ) : (
            // Fallback when no stats provided -- show placeholder grid
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                gap: 16,
                width: '100%',
                flex: 1,
              }}
            >
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flex: 1,
                    backgroundColor: gridCardBg,
                    borderRadius: gridCardRadius,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ display: 'flex', fontSize: 36, fontWeight: 700, color: 'rgba(255,255,255,0.15)' }}>
                    --
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Date at top-right */}
        {config.date?.position === 'top-right' && (
          <div style={{ display: 'flex', position: 'absolute', top: pad[0], right: pad[1] }}>
            {renderDate(config.date, input)}
          </div>
        )}

        {renderDecorations(otherDecorations, input)}
        {renderLogo(config.logo, config.layout.theme, input)}
      </div>
    );
  }

  // Default: single-panel stats layout (centered or left-aligned)
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: 1200,
        height: 630,
        position: 'relative',
        padding: `${pad[0]}px ${pad[1]}px ${pad[2]}px ${pad[3]}px`,
        ...bgStyle,
      }}
    >
      {/* Header area */}
      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 24 }}>
        {config.categoryTag?.position === 'above-title' && (
          <div style={{ display: 'flex', marginBottom: 12 }}>
            {renderCategoryTag(config.categoryTag, input)}
          </div>
        )}
        {config.sourceName.position === 'above-title' && (
          <div style={{ display: 'flex', marginBottom: 12 }}>
            {renderSourceName(config.sourceName, input)}
          </div>
        )}
        {renderTitle(config.title, input)}
        {renderDescription(config.description, input)}
      </div>

      {/* Stats area -- fills remaining space */}
      <div style={{ display: 'flex', flex: 1, alignItems: 'center' }}>
        {input.stats && input.stats.length > 0 ? (
          hasBarChart
            ? renderStatsBars(input.stats, brand)
            : renderStatsGrid(input.stats, brand, gridCardBg, gridCardRadius)
        ) : null}
      </div>

      {/* Bottom meta */}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 16 }}>
        {renderAuthor(config.author, input)}
        {config.sourceName.position === 'below-title' && renderSourceName(config.sourceName, input)}
      </div>

      {/* Date at top-right */}
      {config.date?.position === 'top-right' && (
        <div style={{ display: 'flex', position: 'absolute', top: pad[0], right: pad[1] }}>
          {renderDate(config.date, input)}
        </div>
      )}

      {renderDecorations(otherDecorations, input)}
      {renderLogo(config.logo, config.layout.theme, input)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Archetype: Special
// ---------------------------------------------------------------------------
// Multipurpose archetype that routes to specialized sub-layouts based on
// template id or content type:
// - Stats templates: renders stat grids, bar charts from input.stats
// - Calendar/event templates: date block + text
// - Terminal/code templates: bracket-wrapped content
// - Fallback: centered layout
// ---------------------------------------------------------------------------

export function renderSpecial(config: TemplateConfig, input: TemplateInput): any {
  // Route based on config id prefix or category
  if (config.id.startsWith('calendar-') || config.id.startsWith('brand-event')) {
    return renderCalendar(config, input);
  }
  if (config.id.startsWith('terminal-') || config.id.startsWith('brand-code')) {
    return renderTerminal(config, input);
  }
  if (config.category === 'stats' || config.id.startsWith('stats-') || (input.stats && input.stats.length > 0)) {
    return renderStats(config, input);
  }

  // Default fallback -- centered layout with decorations
  const bgStyle = buildBackgroundStyle(config, input);
  const pad = normalizePadding(config.layout.padding);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: 1200,
        height: 630,
        position: 'relative',
        padding: `${pad[0]}px ${pad[1]}px ${pad[2]}px ${pad[3]}px`,
        ...bgStyle,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 960 }}>
        {config.sourceName.position === 'above-title' && (
          <div style={{ display: 'flex', marginBottom: 16 }}>
            {renderSourceName(config.sourceName, input)}
          </div>
        )}
        {renderTitle(config.title, input)}
        {renderDescription(config.description, input)}
        {config.sourceName.position === 'below-title' && (
          <div style={{ display: 'flex', marginTop: 24 }}>
            {renderSourceName(config.sourceName, input)}
          </div>
        )}
      </div>
      {renderDecorations(config.decorations, input)}
      {renderLogo(config.logo, config.layout.theme, input)}
    </div>
  );
}
