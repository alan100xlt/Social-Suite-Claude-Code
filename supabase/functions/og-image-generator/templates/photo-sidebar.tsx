/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from './types.ts';

const config: TemplateConfig = {
  id: 'photo-sidebar',
  name: 'Photo Sidebar',
  category: 'photo',
  requiresImage: true,
  render: (input: TemplateInput) => {
    const { title, sourceName, imageBase64, brandColor = '#6366f1' } = input;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          width: 1200,
          height: 630,
        }}
      >
        {/* Brand color sidebar */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-end',
            width: 60,
            height: 630,
            backgroundColor: brandColor,
            paddingBottom: 24,
          }}
        >
          {/* Vertical source text hint */}
          {sourceName && (
            <div
              style={{
                display: 'flex',
                color: 'rgba(255,255,255,0.7)',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 3,
                textTransform: 'uppercase' as const,
              }}
            >
              {sourceName.slice(0, 3).toUpperCase()}
            </div>
          )}
        </div>

        {/* Image area with title overlay at bottom */}
        <div
          style={{
            display: 'flex',
            width: 1140,
            height: 630,
            position: 'relative',
          }}
        >
          {/* Background image */}
          <img
            src={imageBase64}
            style={{
              width: 1140,
              height: 630,
              objectFit: 'cover',
              position: 'absolute',
              top: 0,
              left: 0,
            }}
          />

          {/* Bottom gradient overlay with title */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              width: 1140,
              height: 630,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0) 50%, rgba(0,0,0,0.85) 100%)',
              padding: 48,
            }}
          >
            {/* Source name badge */}
            {sourceName && (
              <div
                style={{
                  display: 'flex',
                  color: brandColor,
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: 2,
                  textTransform: 'uppercase' as const,
                  marginBottom: 12,
                }}
              >
                {sourceName}
              </div>
            )}

            {/* Title */}
            <div
              style={{
                display: 'flex',
                color: '#ffffff',
                fontSize: 44,
                fontWeight: 700,
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxHeight: 164,
              }}
            >
              {title}
            </div>
          </div>
        </div>
      </div>
    );
  },
};

export default config;
