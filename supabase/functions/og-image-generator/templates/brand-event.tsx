/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from './types.ts';

const config: TemplateConfig = {
  id: 'brand-event',
  name: 'Brand Event',
  category: 'brand',
  requiresImage: false,
  render: (input: TemplateInput) => {
    const brand = input.brandColor || '#8B5CF6';

    // Parse date from publishedAt
    const date = input.publishedAt ? new Date(input.publishedAt) : null;
    const month = date
      ? date.toLocaleString('en-US', { month: 'short' }).toUpperCase()
      : '';
    const day = date ? date.getDate().toString() : '';
    const year = date ? date.getFullYear().toString() : '';

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: 1200,
          height: 630,
          background: `linear-gradient(135deg, ${brand} 0%, #0F172A 100%)`,
          padding: 80,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Large faded circle decoration */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: -120,
            right: -120,
            width: 500,
            height: 500,
            borderRadius: 250,
            border: '2px solid rgba(255, 255, 255, 0.08)',
          }}
        />
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: -80,
            right: -80,
            width: 420,
            height: 420,
            borderRadius: 210,
            border: '2px solid rgba(255, 255, 255, 0.05)',
          }}
        />

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
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                borderRadius: 20,
                flexShrink: 0,
              }}
            >
              {/* Month */}
              <div
                style={{
                  display: 'flex',
                  fontSize: 20,
                  fontWeight: 700,
                  color: 'rgba(255, 255, 255, 0.7)',
                  letterSpacing: 3,
                }}
              >
                {month}
              </div>

              {/* Day */}
              <div
                style={{
                  display: 'flex',
                  fontSize: 72,
                  fontWeight: 700,
                  color: '#FFFFFF',
                  lineHeight: 1,
                  marginTop: 4,
                }}
              >
                {day}
              </div>

              {/* Year */}
              <div
                style={{
                  display: 'flex',
                  fontSize: 16,
                  fontWeight: 400,
                  color: 'rgba(255, 255, 255, 0.5)',
                  marginTop: 4,
                }}
              >
                {year}
              </div>
            </div>
          )}

          {/* Title and source */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              flexGrow: 1,
            }}
          >
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
              {input.title}
            </div>

            {input.description && (
              <div
                style={{
                  display: 'flex',
                  fontSize: 22,
                  fontWeight: 400,
                  color: 'rgba(255, 255, 255, 0.65)',
                  lineHeight: 1.4,
                  marginTop: 20,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxHeight: 64,
                }}
              >
                {input.description}
              </div>
            )}
          </div>
        </div>

        {/* Bottom bar: source name + divider */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 20,
            marginTop: 32,
          }}
        >
          <div
            style={{
              display: 'flex',
              width: 40,
              height: 3,
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              borderRadius: 2,
            }}
          />

          {input.sourceName && (
            <div
              style={{
                display: 'flex',
                fontSize: 18,
                fontWeight: 400,
                color: 'rgba(255, 255, 255, 0.6)',
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
            >
              {input.sourceName}
            </div>
          )}
        </div>
      </div>
    );
  },
};

export default config;
