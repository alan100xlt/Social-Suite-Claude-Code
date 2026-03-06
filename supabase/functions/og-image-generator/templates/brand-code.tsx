/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from './types.ts';

const config: TemplateConfig = {
  id: 'brand-code',
  name: 'Brand Code',
  category: 'brand',
  requiresImage: false,
  render: (input: TemplateInput) => {
    const accent = '#22C55E';

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: 1200,
          height: 630,
          backgroundColor: '#1E1E1E',
          padding: 80,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Faint grid pattern */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            opacity: 0.04,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Top bar — simulated terminal dots */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginBottom: 48,
          }}
        >
          <div
            style={{
              display: 'flex',
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: '#FF5F57',
            }}
          />
          <div
            style={{
              display: 'flex',
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: '#FEBC2E',
            }}
          />
          <div
            style={{
              display: 'flex',
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: '#28C840',
            }}
          />

          {/* Source name as file path */}
          {input.sourceName && (
            <div
              style={{
                display: 'flex',
                fontSize: 16,
                fontWeight: 400,
                color: '#6B7280',
                marginLeft: 16,
              }}
            >
              ~/{input.sourceName}
            </div>
          )}
        </div>

        {/* Main content area */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
            flexGrow: 1,
          }}
        >
          {/* Opening bracket */}
          <div
            style={{
              display: 'flex',
              fontSize: 120,
              fontWeight: 700,
              color: accent,
              lineHeight: 1,
              marginRight: 32,
              marginTop: -16,
              opacity: 0.6,
            }}
          >
            {'{'}
          </div>

          {/* Title */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              flexGrow: 1,
              flexShrink: 1,
              maxWidth: 860,
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 52,
                fontWeight: 700,
                color: '#E5E7EB',
                lineHeight: 1.25,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxHeight: 270,
              }}
            >
              {input.title}
            </div>
          </div>

          {/* Closing bracket */}
          <div
            style={{
              display: 'flex',
              fontSize: 120,
              fontWeight: 700,
              color: accent,
              lineHeight: 1,
              marginLeft: 32,
              marginTop: -16,
              opacity: 0.6,
            }}
          >
            {'}'}
          </div>
        </div>

        {/* Bottom accent line */}
        <div
          style={{
            display: 'flex',
            width: 80,
            height: 4,
            backgroundColor: accent,
            borderRadius: 2,
            marginTop: 24,
          }}
        />
      </div>
    );
  },
};

export default config;
