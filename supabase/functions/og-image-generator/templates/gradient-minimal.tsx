/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from './types.ts';

const config: TemplateConfig = {
  id: 'gradient-minimal',
  name: 'Minimal Gradient',
  category: 'gradient',
  requiresImage: false,
  render: (input: TemplateInput) => {
    const accent = input.brandColor || '#3B82F6';

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: 1200,
          height: 630,
          backgroundColor: '#FAFAFA',
          padding: 0,
        }}
      >
        {/* Accent bar at top */}
        <div
          style={{
            display: 'flex',
            width: 1200,
            height: 6,
            backgroundColor: accent,
          }}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            flexGrow: 1,
            padding: 80,
            paddingTop: 60,
          }}
        >
          {input.sourceName && (
            <div
              style={{
                display: 'flex',
                fontSize: 18,
                fontWeight: 400,
                color: '#94A3B8',
                letterSpacing: 2,
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
              color: '#0F172A',
              lineHeight: 1.25,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxHeight: 270,
              maxWidth: 960,
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
                color: '#64748B',
                lineHeight: 1.5,
                marginTop: 28,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxHeight: 70,
                maxWidth: 800,
              }}
            >
              {input.description}
            </div>
          )}
        </div>
      </div>
    );
  },
};

export default config;
