/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from './types.ts';

const config: TemplateConfig = {
  id: 'photo-quote',
  name: 'Photo Quote',
  category: 'editorial',
  requiresImage: true,
  render: (input: TemplateInput) => {
    const { title, sourceName, imageBase64, brandColor = '#6366F1' } = input;

    return (
      <div
        style={{
          display: 'flex',
          width: 1200,
          height: 630,
          backgroundColor: '#1C1917',
        }}
      >
        {/* Left image (40%) */}
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
          {/* Right-edge gradient blend */}
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              top: 0,
              right: 0,
              width: 100,
              height: 630,
              background: 'linear-gradient(to left, #1C1917, rgba(28,25,23,0))',
            }}
          />
        </div>

        {/* Right quote (60%) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            width: 720,
            padding: 56,
            paddingLeft: 40,
          }}
        >
          {/* Large quotation mark */}
          <div
            style={{
              display: 'flex',
              fontSize: 140,
              fontWeight: 700,
              color: brandColor,
              lineHeight: 0.6,
              marginBottom: 16,
            }}
          >
            {'\u201C'}
          </div>

          {/* Quote text */}
          <div
            style={{
              display: 'flex',
              fontSize: 38,
              fontWeight: 400,
              color: '#FAFAF9',
              lineHeight: 1.4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxHeight: 220,
            }}
          >
            {title}
          </div>

          {/* Attribution */}
          {sourceName && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginTop: 36,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  width: 32,
                  height: 2,
                  backgroundColor: brandColor,
                  marginRight: 16,
                }}
              />
              <div
                style={{
                  display: 'flex',
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.5)',
                  textTransform: 'uppercase',
                  letterSpacing: 3,
                }}
              >
                {sourceName}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  },
};

export default config;
