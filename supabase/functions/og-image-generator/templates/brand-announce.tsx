/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from './types.ts';

const config: TemplateConfig = {
  id: 'brand-announce',
  name: 'Brand Announcement',
  category: 'brand',
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
          backgroundColor: brand,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle diagonal pattern overlay */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            opacity: 0.08,
            backgroundImage:
              'repeating-linear-gradient(45deg, #FFFFFF 0, #FFFFFF 2px, transparent 2px, transparent 40px)',
          }}
        />

        {/* Corner accents — top-left */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: 40,
            left: 40,
            width: 60,
            height: 60,
            borderTop: '4px solid rgba(255, 255, 255, 0.3)',
            borderLeft: '4px solid rgba(255, 255, 255, 0.3)',
          }}
        />

        {/* Corner accents — bottom-right */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            bottom: 40,
            right: 40,
            width: 60,
            height: 60,
            borderBottom: '4px solid rgba(255, 255, 255, 0.3)',
            borderRight: '4px solid rgba(255, 255, 255, 0.3)',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            maxWidth: 900,
            padding: 60,
          }}
        >
          {/* Tag */}
          <div
            style={{
              display: 'flex',
              fontSize: 16,
              fontWeight: 700,
              color: brand,
              backgroundColor: '#FFFFFF',
              padding: '10px 28px',
              borderRadius: 40,
              letterSpacing: 4,
              textTransform: 'uppercase',
              marginBottom: 40,
            }}
          >
            ANNOUNCEMENT
          </div>

          {/* Title */}
          <div
            style={{
              display: 'flex',
              fontSize: 52,
              fontWeight: 700,
              color: '#FFFFFF',
              textAlign: 'center',
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxHeight: 260,
            }}
          >
            {input.title}
          </div>

          {/* Source name */}
          {input.sourceName && (
            <div
              style={{
                display: 'flex',
                fontSize: 20,
                fontWeight: 400,
                color: 'rgba(255, 255, 255, 0.7)',
                marginTop: 32,
                letterSpacing: 1,
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
