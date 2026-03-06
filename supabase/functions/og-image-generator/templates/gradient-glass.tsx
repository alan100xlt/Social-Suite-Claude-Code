/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from './types.ts';

const config: TemplateConfig = {
  id: 'gradient-glass',
  name: 'Glass Gradient',
  category: 'gradient',
  requiresImage: false,
  render: (input: TemplateInput) => {
    const brand = input.brandColor || '#8B5CF6';

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 1200,
          height: 630,
          background: `linear-gradient(160deg, #0F172A 0%, #1E293B 40%, ${brand}33 100%)`,
          padding: 60,
        }}
      >
        {/* Glow effect behind the card */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 1080,
            height: 510,
          }}
        >
          {/* Frosted glass card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              width: 1000,
              height: 430,
              backgroundColor: 'rgba(255, 255, 255, 0.07)',
              borderRadius: 24,
              border: '1px solid rgba(255, 255, 255, 0.12)',
              padding: 64,
            }}
          >
            {/* Subtle glow dot */}
            <div
              style={{
                display: 'flex',
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: brand,
                marginBottom: 28,
                boxShadow: `0 0 30px 10px ${brand}66`,
              }}
            />

            <div
              style={{
                display: 'flex',
                fontSize: 48,
                fontWeight: 700,
                color: '#FFFFFF',
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxHeight: 180,
                maxWidth: 870,
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
                  color: 'rgba(255, 255, 255, 0.55)',
                  lineHeight: 1.5,
                  marginTop: 24,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxHeight: 70,
                  maxWidth: 780,
                }}
              >
                {input.description}
              </div>
            )}

            {input.sourceName && (
              <div
                style={{
                  display: 'flex',
                  fontSize: 18,
                  fontWeight: 400,
                  color: 'rgba(255, 255, 255, 0.4)',
                  marginTop: 28,
                  letterSpacing: 1,
                }}
              >
                {input.sourceName}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
};

export default config;
