/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from './types.ts';

const URGENT_KEYWORDS = ['breaking', 'urgent', 'alert', 'exclusive', 'just in', 'developing'];

const config: TemplateConfig = {
  id: 'news-ticker',
  name: 'News Ticker',
  category: 'news',
  requiresImage: false,
  render: (input: TemplateInput) => {
    const { title, sourceName, brandColor = '#DC2626' } = input;
    const isBreaking = URGENT_KEYWORDS.some((kw) =>
      title.toLowerCase().includes(kw)
    );

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: 1200,
          height: 630,
          backgroundColor: '#111827',
        }}
      >
        {/* Top source bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            height: 56,
            paddingLeft: 56,
            paddingRight: 56,
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {sourceName && (
            <div
              style={{
                display: 'flex',
                fontSize: 16,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.6)',
                textTransform: 'uppercase',
                letterSpacing: 3,
              }}
            >
              {sourceName}
            </div>
          )}
        </div>

        {/* Main title area */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            justifyContent: 'center',
            alignItems: 'flex-start',
            padding: 56,
          }}
        >
          {isBreaking && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: brandColor,
                  marginRight: 12,
                }}
              />
              <div
                style={{
                  display: 'flex',
                  fontSize: 18,
                  fontWeight: 700,
                  color: brandColor,
                  letterSpacing: 4,
                  textTransform: 'uppercase',
                }}
              >
                Breaking
              </div>
            </div>
          )}
          <div
            style={{
              display: 'flex',
              fontSize: 52,
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

        {/* Bottom ticker bar */}
        <div
          style={{
            display: 'flex',
            width: 1200,
            height: 72,
            backgroundColor: brandColor,
            alignItems: 'center',
            paddingLeft: 56,
            paddingRight: 56,
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 15,
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: 3,
              textTransform: 'uppercase',
            }}
          >
            Latest Headlines
          </div>
          {/* Decorative dots */}
          <div
            style={{
              display: 'flex',
              marginLeft: 'auto',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)', marginRight: 8 }} />
            <div style={{ display: 'flex', width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.7)', marginRight: 8 }} />
            <div style={{ display: 'flex', width: 6, height: 6, borderRadius: 3, backgroundColor: '#ffffff' }} />
          </div>
        </div>
      </div>
    );
  },
};

export default config;
