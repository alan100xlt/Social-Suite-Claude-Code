/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from './types.ts';

const config: TemplateConfig = {
  id: 'news-photo-banner',
  name: 'News Photo Banner',
  category: 'news',
  requiresImage: true,
  render: (input: TemplateInput) => {
    const { title, sourceName, publishedAt, imageBase64, brandColor = '#DC2626' } = input;
    const dateStr = publishedAt
      ? new Date(publishedAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '';

    return (
      <div
        style={{
          display: 'flex',
          width: 1200,
          height: 630,
          backgroundColor: '#0F0F0F',
        }}
      >
        {/* Left content (60%) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: 720,
            height: 630,
          }}
        >
          {/* Red banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              height: 64,
              backgroundColor: brandColor,
              paddingLeft: 48,
              paddingRight: 48,
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 20,
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: 4,
                textTransform: 'uppercase',
              }}
            >
              Breaking News
            </div>
          </div>

          {/* Accent line */}
          <div
            style={{
              display: 'flex',
              width: 720,
              height: 3,
              backgroundColor: '#FBBF24',
            }}
          />

          {/* Title */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              justifyContent: 'center',
              padding: 48,
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 44,
                fontWeight: 700,
                color: '#FFFFFF',
                lineHeight: 1.25,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxHeight: 280,
              }}
            >
              {title}
            </div>
          </div>

          {/* Bottom info */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              height: 52,
              paddingLeft: 48,
              paddingRight: 48,
              borderTop: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {sourceName && (
              <div
                style={{
                  display: 'flex',
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.7)',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                {sourceName}
              </div>
            )}
            {dateStr && (
              <div
                style={{
                  display: 'flex',
                  marginLeft: 'auto',
                  fontSize: 14,
                  fontWeight: 400,
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                {dateStr}
              </div>
            )}
          </div>
        </div>

        {/* Right image (40%) */}
        <div
          style={{
            display: 'flex',
            width: 480,
            height: 630,
            position: 'relative',
          }}
        >
          <img
            src={imageBase64}
            style={{
              width: 480,
              height: 630,
              objectFit: 'cover',
            }}
          />
          {/* Left-edge gradient blend */}
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              top: 0,
              left: 0,
              width: 80,
              height: 630,
              background: 'linear-gradient(to right, #0F0F0F, rgba(15,15,15,0))',
            }}
          />
        </div>
      </div>
    );
  },
};

export default config;
