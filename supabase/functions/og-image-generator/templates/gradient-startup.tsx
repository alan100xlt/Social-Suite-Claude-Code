/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from './types.ts';

const config: TemplateConfig = {
  id: 'gradient-startup',
  name: 'Startup Gradient',
  category: 'gradient',
  requiresImage: false,
  render: (input: TemplateInput) => {
    const brand = input.brandColor || '#06B6D4';

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 1200,
          height: 630,
          backgroundColor: '#0A0A0A',
          padding: 40,
        }}
      >
        {/* Gradient accent border card */}
        <div
          style={{
            display: 'flex',
            width: 1120,
            height: 550,
            borderRadius: 20,
            background: `linear-gradient(135deg, ${brand}, #8B5CF6)`,
            padding: 2,
          }}
        >
          {/* Inner dark card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              width: 1116,
              height: 546,
              backgroundColor: '#0A0A0A',
              borderRadius: 18,
              padding: 64,
            }}
          >
            {/* Top section */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Gradient accent line */}
              <div
                style={{
                  display: 'flex',
                  width: 80,
                  height: 4,
                  borderRadius: 2,
                  background: `linear-gradient(90deg, ${brand}, #8B5CF6)`,
                  marginBottom: 32,
                }}
              />

              <div
                style={{
                  display: 'flex',
                  fontSize: 50,
                  fontWeight: 700,
                  color: '#F1F5F9',
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxHeight: 240,
                  maxWidth: 920,
                }}
              >
                {input.title}
              </div>
            </div>

            {/* Bottom section */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              {input.sourceName && (
                <div
                  style={{
                    display: 'flex',
                    fontSize: 18,
                    fontWeight: 400,
                    fontFamily: 'monospace',
                    color: '#64748B',
                    letterSpacing: 2,
                  }}
                >
                  {`> ${input.sourceName}`}
                </div>
              )}

              {input.publishedAt && (
                <div
                  style={{
                    display: 'flex',
                    fontSize: 16,
                    fontWeight: 400,
                    fontFamily: 'monospace',
                    color: '#475569',
                  }}
                >
                  {input.publishedAt.slice(0, 10)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
};

export default config;
