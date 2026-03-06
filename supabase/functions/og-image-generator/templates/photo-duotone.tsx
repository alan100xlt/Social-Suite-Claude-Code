/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from './types.ts';

const config: TemplateConfig = {
  id: 'photo-duotone',
  name: 'Photo Duotone',
  category: 'photo',
  requiresImage: true,
  render: (input: TemplateInput) => {
    const { title, imageBase64, brandColor = '#6366f1' } = input;

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
            filter: 'grayscale(100%) contrast(1.2)',
          }}
        />

        {/* Duotone color overlay using brand color */}
        <div
          style={{
            display: 'flex',
            width: 1200,
            height: 630,
            position: 'absolute',
            top: 0,
            left: 0,
            backgroundColor: brandColor,
            opacity: 0.75,
          }}
        />

        {/* Slight dark gradient for text readability */}
        <div
          style={{
            display: 'flex',
            width: 1200,
            height: 630,
            position: 'absolute',
            top: 0,
            left: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.4) 100%)',
          }}
        />

        {/* Centered title */}
        <div
          style={{
            display: 'flex',
            width: 1200,
            height: 630,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 80,
          }}
        >
          <div
            style={{
              display: 'flex',
              color: '#ffffff',
              fontSize: 60,
              fontWeight: 700,
              lineHeight: 1.15,
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxHeight: 280,
              textShadow: '0 2px 20px rgba(0,0,0,0.3)',
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
