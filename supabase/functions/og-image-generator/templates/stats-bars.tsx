/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from './types.ts';

const BAR_HEIGHTS = [280, 380, 320, 450, 220, 360, 410];
const BAR_COLORS = ['#6366F1', '#818CF8', '#A5B4FC', '#6366F1', '#C7D2FE', '#818CF8', '#6366F1'];

const config: TemplateConfig = {
  id: 'stats-bars',
  name: 'Stats Bars',
  category: 'stats',
  requiresImage: false,
  render: (input: TemplateInput) => {
    const { title, sourceName, brandColor = '#6366F1' } = input;

    return (
      <div
        style={{
          display: 'flex',
          width: 1200,
          height: 630,
          backgroundColor: '#0F172A',
        }}
      >
        {/* Left content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            width: 660,
            padding: 60,
          }}
        >
          {sourceName && (
            <div
              style={{
                display: 'flex',
                fontSize: 15,
                fontWeight: 700,
                color: brandColor,
                textTransform: 'uppercase',
                letterSpacing: 3,
                marginBottom: 20,
              }}
            >
              {sourceName}
            </div>
          )}
          <div
            style={{
              display: 'flex',
              fontSize: 48,
              fontWeight: 700,
              color: '#FFFFFF',
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxHeight: 240,
            }}
          >
            {title}
          </div>
          {/* Decorative underline */}
          <div
            style={{
              display: 'flex',
              width: 80,
              height: 4,
              backgroundColor: brandColor,
              borderRadius: 2,
              marginTop: 32,
            }}
          />
        </div>

        {/* Right decorative bar chart */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            width: 540,
            height: 630,
            paddingBottom: 60,
            paddingRight: 60,
          }}
        >
          {BAR_HEIGHTS.map((h, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                width: 44,
                height: Math.round(h * 0.9),
                backgroundColor: BAR_COLORS[i],
                borderRadius: 6,
                marginLeft: i === 0 ? 0 : 12,
                opacity: 0.85,
              }}
            />
          ))}
        </div>
      </div>
    );
  },
};

export default config;
