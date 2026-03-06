/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from './types.ts';

const config: TemplateConfig = {
  id: 'gradient-modern',
  name: 'Modern Gradient',
  category: 'gradient',
  requiresImage: false,
  render: (input: TemplateInput) => {
    const brand = input.brandColor || '#6366F1';

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          width: 1200,
          height: 630,
          background: `linear-gradient(135deg, #0F172A 0%, ${brand} 50%, #1E293B 100%)`,
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {/* Left content area */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: 72,
            paddingRight: 40,
            width: 800,
          }}
        >
          {input.sourceName && (
            <div
              style={{
                display: 'flex',
                fontSize: 18,
                fontWeight: 700,
                color: 'rgba(255, 255, 255, 0.6)',
                letterSpacing: 3,
                textTransform: 'uppercase',
                marginBottom: 24,
              }}
            >
              {input.sourceName}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              fontSize: 52,
              fontWeight: 700,
              color: '#FFFFFF',
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxHeight: 250,
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
                lineHeight: 1.5,
                marginTop: 24,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxHeight: 70,
              }}
            >
              {input.description}
            </div>
          )}
        </div>

        {/* Right decorative area */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: 400,
          }}
        >
          {/* Large circle */}
          <div
            style={{
              display: 'flex',
              width: 240,
              height: 240,
              borderRadius: 120,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              marginBottom: -60,
            }}
          />
          {/* Small circle */}
          <div
            style={{
              display: 'flex',
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              marginLeft: 120,
            }}
          />
          {/* Rectangle */}
          <div
            style={{
              display: 'flex',
              width: 160,
              height: 40,
              borderRadius: 8,
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              marginTop: 30,
              marginLeft: -40,
            }}
          />
        </div>
      </div>
    );
  },
};

export default config;
