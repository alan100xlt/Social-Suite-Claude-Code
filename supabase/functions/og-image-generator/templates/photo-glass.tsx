/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from './types.ts';

const config: TemplateConfig = {
  id: 'photo-glass',
  name: 'Photo Glass',
  category: 'photo',
  requiresImage: true,
  render: (input: TemplateInput) => {
    const { title, description, imageBase64, brandColor = '#6366f1' } = input;

    return (
      <div
        style={{
          display: 'flex',
          width: 1200,
          height: 630,
          position: 'relative',
        }}
      >
        {/* Background image */}
        <img
          src={imageBase64}
          style={{
            width: 1200,
            height: 630,
            objectFit: 'cover',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />

        {/* Dim overlay */}
        <div
          style={{
            display: 'flex',
            width: 1200,
            height: 630,
            position: 'absolute',
            top: 0,
            left: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
          }}
        />

        {/* Centered frosted glass card */}
        <div
          style={{
            display: 'flex',
            width: 1200,
            height: 630,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: 880,
              maxHeight: 420,
              padding: 48,
              borderRadius: 24,
              backgroundColor: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.25)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Accent bar */}
            <div
              style={{
                display: 'flex',
                width: 64,
                height: 6,
                borderRadius: 3,
                backgroundColor: brandColor,
                marginBottom: 24,
              }}
            />

            {/* Title */}
            <div
              style={{
                display: 'flex',
                color: '#ffffff',
                fontSize: 46,
                fontWeight: 700,
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxHeight: 170,
              }}
            >
              {title}
            </div>

            {/* Description */}
            {description && (
              <div
                style={{
                  display: 'flex',
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: 22,
                  fontWeight: 400,
                  lineHeight: 1.4,
                  marginTop: 20,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxHeight: 64,
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
