/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from './types.ts';

const config: TemplateConfig = {
  id: 'brand-minimal',
  name: 'Brand Minimal',
  category: 'brand',
  requiresImage: false,
  render: (input: TemplateInput) => {
    const brand = input.brandColor || '#3B82F6';

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: 1200,
          height: 630,
          backgroundColor: '#FFFFFF',
          padding: 80,
          position: 'relative',
        }}
      >
        {/* Source name — top right */}
        {input.sourceName && (
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              top: 48,
              right: 80,
              fontSize: 18,
              fontWeight: 400,
              color: '#94A3B8',
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            {input.sourceName}
          </div>
        )}

        {/* Title — vertically centered, large bold text */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            flexGrow: 1,
            maxWidth: 960,
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 64,
              fontWeight: 700,
              color: '#0F172A',
              lineHeight: 1.15,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxHeight: 300,
            }}
          >
            {input.title}
          </div>
        </div>

        {/* Thin brand-color line at bottom */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: 1200,
            height: 6,
            backgroundColor: brand,
          }}
        />
      </div>
    );
  },
};

export default config;
