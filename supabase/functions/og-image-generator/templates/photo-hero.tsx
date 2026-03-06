/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from './types.ts';

const config: TemplateConfig = {
  id: 'photo-hero',
  name: 'Photo Hero',
  category: 'photo',
  requiresImage: true,
  render: (input: TemplateInput) => {
    const { title, sourceName, imageBase64, brandColor = '#6366f1' } = input;

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

        {/* Dark gradient overlay at bottom */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            width: 1200,
            height: 630,
            padding: 60,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0) 30%, rgba(0,0,0,0.85) 100%)',
          }}
        >
          {/* Source badge top-left */}
          {sourceName && (
            <div
              style={{
                display: 'flex',
                position: 'absolute',
                top: 32,
                left: 32,
                backgroundColor: brandColor,
                color: '#ffffff',
                fontSize: 18,
                fontWeight: 700,
                padding: '8px 20px',
                borderRadius: 8,
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
              fontSize: 52,
              fontWeight: 700,
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxHeight: 192,
              textShadow: '0 2px 12px rgba(0,0,0,0.5)',
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
