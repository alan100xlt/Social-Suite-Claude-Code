/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from './types.ts';

const config: TemplateConfig = {
  id: 'photo-caption',
  name: 'Photo Caption',
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
        }}
      >
        {/* Image area — top 60% */}
        <div
          style={{
            display: 'flex',
            width: 1200,
            height: 378,
            overflow: 'hidden',
          }}
        >
          <img
            src={imageBase64}
            style={{
              width: 1200,
              height: 378,
              objectFit: 'cover',
            }}
          />
        </div>

        {/* Caption area — bottom 40% */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            width: 1200,
            height: 252,
            backgroundColor: '#111111',
            padding: '0 60px',
          }}
        >
          {/* Source name */}
          {sourceName && (
            <div
              style={{
                display: 'flex',
                color: brandColor,
                fontSize: 18,
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
              fontSize: 40,
              fontWeight: 700,
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxHeight: 148,
            }}
          >
            {title}
          </div>
        </div>
      </div>
    );
  },
};

export default config;
