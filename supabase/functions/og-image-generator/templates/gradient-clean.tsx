/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from './types.ts';

const config: TemplateConfig = {
  id: 'gradient-clean',
  name: 'Clean Gradient',
  category: 'gradient',
  requiresImage: false,
  render: (input: TemplateInput) => {
    const brand = input.brandColor || '#3B82F6';

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: 1200,
          height: 630,
          background: `linear-gradient(180deg, ${brand} 0%, #0F172A 100%)`,
          padding: 80,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            maxWidth: 960,
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 56,
              fontWeight: 700,
              color: '#FFFFFF',
              textAlign: 'center',
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxHeight: 270,
            }}
          >
            {input.title}
          </div>

          {/* Divider line */}
          <div
            style={{
              display: 'flex',
              width: 120,
              height: 4,
              backgroundColor: 'rgba(255, 255, 255, 0.5)',
              borderRadius: 2,
              marginTop: 40,
              marginBottom: 40,
            }}
          />

          {input.sourceName && (
            <div
              style={{
                display: 'flex',
                fontSize: 24,
                fontWeight: 400,
                color: 'rgba(255, 255, 255, 0.75)',
                letterSpacing: 2,
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
