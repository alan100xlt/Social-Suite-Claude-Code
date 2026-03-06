/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from './types.ts';

const config: TemplateConfig = {
  id: 'stats-card',
  name: 'Stats Card',
  category: 'stats',
  requiresImage: false,
  render: (input: TemplateInput) => {
    const { title, sourceName, brandColor = '#10B981' } = input;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: 1200,
          height: 630,
          backgroundColor: '#0F172A',
          padding: 60,
        }}
      >
        {/* Metric card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: 960,
            backgroundColor: '#1E293B',
            borderRadius: 24,
            padding: 56,
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {sourceName && (
            <div
              style={{
                display: 'flex',
                fontSize: 14,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.4)',
                textTransform: 'uppercase',
                letterSpacing: 3,
                marginBottom: 24,
              }}
            >
              {sourceName}
            </div>
          )}

          {/* Large stat number */}
          <div
            style={{
              display: 'flex',
              fontSize: 96,
              fontWeight: 700,
              color: brandColor,
              lineHeight: 1,
              marginBottom: 16,
            }}
          >
            2.4M
          </div>

          {/* Trend indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: 32,
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 20,
                fontWeight: 700,
                color: '#34D399',
              }}
            >
              +12.5%
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 16,
                fontWeight: 400,
                color: 'rgba(255,255,255,0.4)',
                marginLeft: 12,
              }}
            >
              vs last month
            </div>
          </div>

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              width: 640,
              height: 1,
              backgroundColor: 'rgba(255,255,255,0.08)',
              marginBottom: 28,
            }}
          />

          {/* Title */}
          <div
            style={{
              display: 'flex',
              fontSize: 32,
              fontWeight: 700,
              color: '#FFFFFF',
              lineHeight: 1.3,
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxHeight: 88,
            }}
          >
            {title}
          </div>
        </div>
      </div>
    );
  },
};

export default config;
