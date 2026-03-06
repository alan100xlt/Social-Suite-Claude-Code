/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from './types.ts';

const config: TemplateConfig = {
  id: 'photo-frame',
  name: 'Photo Frame',
  category: 'photo',
  requiresImage: true,
  render: (input: TemplateInput) => {
    const { title, sourceName, imageBase64, brandColor = '#6366f1' } = input;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: 1200,
          height: 630,
          backgroundColor: '#ffffff',
          padding: 32,
        }}
      >
        {/* Framed image area */}
        <div
          style={{
            display: 'flex',
            width: 1136,
            height: 420,
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <img
            src={imageBase64}
            style={{
              width: 1136,
              height: 420,
              objectFit: 'cover',
            }}
          />
        </div>

        {/* Title area below frame */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            width: 1136,
            height: 146,
            paddingTop: 20,
          }}
        >
          {/* Accent dot */}
          <div
            style={{
              display: 'flex',
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: brandColor,
              marginRight: 20,
              flexShrink: 0,
            }}
          />

          {/* Title and source */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                color: '#111111',
                fontSize: 32,
                fontWeight: 700,
                lineHeight: 1.25,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxHeight: 80,
              }}
            >
              {title}
            </div>

            {sourceName && (
              <div
                style={{
                  display: 'flex',
                  color: '#888888',
                  fontSize: 18,
                  fontWeight: 400,
                  marginTop: 8,
                }}
              >
                {sourceName}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
};

export default config;
