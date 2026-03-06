/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from './types.ts';

const config: TemplateConfig = {
  id: 'photo-split',
  name: 'Photo Split',
  category: 'photo',
  requiresImage: true,
  render: (input: TemplateInput) => {
    const { title, description, imageBase64, brandColor = '#6366f1' } = input;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          width: 1200,
          height: 630,
        }}
      >
        {/* Left half — image */}
        <div
          style={{
            display: 'flex',
            width: 600,
            height: 630,
            overflow: 'hidden',
          }}
        >
          <img
            src={imageBase64}
            style={{
              width: 600,
              height: 630,
              objectFit: 'cover',
            }}
          />
        </div>

        {/* Right half — text content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            width: 600,
            height: 630,
            backgroundColor: '#0f0f0f',
          }}
        >
          {/* Brand color accent bar */}
          <div
            style={{
              display: 'flex',
              width: 6,
              height: 630,
              backgroundColor: brandColor,
            }}
          />

          {/* Text content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              width: 544,
              height: 630,
              padding: '0 48px',
            }}
          >
            {/* Title */}
            <div
              style={{
                display: 'flex',
                color: '#ffffff',
                fontSize: 38,
                fontWeight: 700,
                lineHeight: 1.25,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxHeight: 240,
              }}
            >
              {title}
            </div>

            {/* Description */}
            {description && (
              <div
                style={{
                  display: 'flex',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: 20,
                  fontWeight: 400,
                  lineHeight: 1.5,
                  marginTop: 24,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxHeight: 90,
                }}
              >
                {description}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
};

export default config;
