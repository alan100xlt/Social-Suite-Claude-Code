/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from './types.ts';

const config: TemplateConfig = {
  id: 'news-banner',
  name: 'News Banner',
  category: 'news',
  requiresImage: false,
  render: (input: TemplateInput) => {
    const { title, sourceName, publishedAt, brandColor = '#DC2626' } = input;
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
          flexDirection: 'column',
          width: 1200,
          height: 630,
          backgroundColor: '#0F0F0F',
        }}
      >
        {/* Red breaking news banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            width: 1200,
            height: 72,
            backgroundColor: brandColor,
            paddingLeft: 48,
            paddingRight: 48,
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 22,
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: 4,
              textTransform: 'uppercase',
            }}
          >
            Breaking News
          </div>
          {sourceName && (
            <div
              style={{
                display: 'flex',
                marginLeft: 'auto',
                fontSize: 18,
                fontWeight: 400,
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              {sourceName}
            </div>
          )}
        </div>

        {/* Thin accent line */}
        <div
          style={{
            display: 'flex',
            width: 1200,
            height: 4,
            backgroundColor: '#FBBF24',
          }}
        />

        {/* Title area */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            justifyContent: 'center',
            padding: 60,
            paddingTop: 48,
            paddingBottom: 48,
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 54,
              fontWeight: 700,
              color: '#FFFFFF',
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxHeight: 260,
            }}
          >
            {title}
          </div>
        </div>

        {/* Bottom bar with timestamp */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            height: 56,
            paddingLeft: 60,
            paddingRight: 60,
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {dateStr && (
            <div
              style={{
                display: 'flex',
                fontSize: 16,
                fontWeight: 400,
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              {dateStr}
            </div>
          )}
          <div
            style={{
              display: 'flex',
              marginLeft: 'auto',
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: brandColor,
            }}
          />
          <div
            style={{
              display: 'flex',
              marginLeft: 8,
              fontSize: 14,
              fontWeight: 700,
              color: brandColor,
              textTransform: 'uppercase',
              letterSpacing: 2,
            }}
          >
            Live
          </div>
        </div>
      </div>
    );
  },
};

export default config;
