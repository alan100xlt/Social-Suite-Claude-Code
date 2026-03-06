/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from './types.ts';

const config: TemplateConfig = {
  id: 'editorial-magazine',
  name: 'Editorial Magazine',
  category: 'editorial',
  requiresImage: false,
  render: (input: TemplateInput) => {
    const { title, description, sourceName, brandColor = '#B91C1C' } = input;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: 1200,
          height: 630,
          backgroundColor: '#FFFBEB',
          padding: 64,
        }}
      >
        {/* Top bar: source name in small caps + thin rule */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginBottom: 32,
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
                letterSpacing: 5,
                marginBottom: 16,
              }}
            >
              {sourceName}
            </div>
          )}
          <div
            style={{
              display: 'flex',
              width: 1072,
              height: 2,
              backgroundColor: '#292524',
            }}
          />
        </div>

        {/* Main content area with column dividers */}
        <div
          style={{
            display: 'flex',
            flex: 1,
          }}
        >
          {/* Left column: large serif-style title */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              width: 700,
              paddingRight: 48,
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 56,
                fontWeight: 700,
                color: '#1C1917',
                lineHeight: 1.15,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxHeight: 270,
              }}
            >
              {title}
            </div>
          </div>

          {/* Thin column divider */}
          <div
            style={{
              display: 'flex',
              width: 1,
              backgroundColor: '#D6D3D1',
            }}
          />

          {/* Right column: description or decorative */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              flex: 1,
              paddingLeft: 48,
            }}
          >
            {description ? (
              <div
                style={{
                  display: 'flex',
                  fontSize: 20,
                  fontWeight: 400,
                  color: '#57534E',
                  lineHeight: 1.6,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxHeight: 260,
                }}
              >
                {description}
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                }}
              >
                {/* Decorative lines mimicking text columns */}
                {[180, 220, 160, 200, 140, 190].map((w, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      width: w,
                      height: 3,
                      backgroundColor: '#E7E5E4',
                      borderRadius: 2,
                      marginBottom: 14,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom rule */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: 32,
          }}
        >
          <div
            style={{
              display: 'flex',
              width: 1072,
              height: 2,
              backgroundColor: '#292524',
            }}
          />
          <div
            style={{
              display: 'flex',
              marginTop: 12,
              fontSize: 12,
              fontWeight: 400,
              color: '#A8A29E',
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
          >
            Editorial
          </div>
        </div>
      </div>
    );
  },
};

export default config;
