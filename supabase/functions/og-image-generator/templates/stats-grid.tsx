/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from './types.ts';

const METRICS = [
  { label: 'Impressions', value: '1.2M', change: '+18%' },
  { label: 'Engagement', value: '89.4K', change: '+7%' },
  { label: 'Reach', value: '640K', change: '+23%' },
  { label: 'Clicks', value: '34.1K', change: '+11%' },
];

const config: TemplateConfig = {
  id: 'stats-grid',
  name: 'Stats Grid',
  category: 'stats',
  requiresImage: false,
  render: (input: TemplateInput) => {
    const { title, sourceName, brandColor = '#8B5CF6' } = input;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: 1200,
          height: 630,
          backgroundColor: '#0F172A',
          padding: 48,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          {sourceName && (
            <div
              style={{
                display: 'flex',
                fontSize: 14,
                fontWeight: 700,
                color: brandColor,
                textTransform: 'uppercase',
                letterSpacing: 3,
              }}
            >
              {sourceName}
            </div>
          )}
        </div>

        {/* Title spanning full width */}
        <div
          style={{
            display: 'flex',
            fontSize: 40,
            fontWeight: 700,
            color: '#FFFFFF',
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxHeight: 100,
            marginBottom: 36,
          }}
        >
          {title}
        </div>

        {/* 4-column metric grid */}
        <div
          style={{
            display: 'flex',
            flex: 1,
          }}
        >
          {METRICS.map((metric, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                flex: 1,
                backgroundColor: '#1E293B',
                borderRadius: 16,
                marginLeft: i === 0 ? 0 : 16,
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.4)',
                  textTransform: 'uppercase',
                  letterSpacing: 2,
                  marginBottom: 16,
                }}
              >
                {metric.label}
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: 48,
                  fontWeight: 700,
                  color: '#FFFFFF',
                  lineHeight: 1,
                  marginBottom: 12,
                }}
              >
                {metric.value}
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#34D399',
                }}
              >
                {metric.change}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  },
};

export default config;
