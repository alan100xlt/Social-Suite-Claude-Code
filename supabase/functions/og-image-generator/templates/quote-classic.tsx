/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from './types.ts';

const config: TemplateConfig = {
  id: 'quote-classic',
  name: 'Quote Classic',
  category: 'editorial',
  requiresImage: false,
  render: (input: TemplateInput) => {
    const { title, sourceName, brandColor = '#6366F1' } = input;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: 1200,
          height: 630,
          backgroundColor: '#FAFAF9',
          padding: 80,
        }}
      >
        {/* Opening quotation mark */}
        <div
          style={{
            display: 'flex',
            fontSize: 160,
            fontWeight: 700,
            color: brandColor,
            lineHeight: 0.6,
            marginBottom: 8,
          }}
        >
          {'\u201C'}
        </div>

        {/* Quote text (title) */}
        <div
          style={{
            display: 'flex',
            maxWidth: 920,
            fontSize: 42,
            fontWeight: 400,
            color: '#1C1917',
            lineHeight: 1.4,
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxHeight: 240,
          }}
        >
          {title}
        </div>

        {/* Closing quotation mark */}
        <div
          style={{
            display: 'flex',
            fontSize: 160,
            fontWeight: 700,
            color: brandColor,
            lineHeight: 0.4,
            marginTop: 16,
          }}
        >
          {'\u201D'}
        </div>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            width: 60,
            height: 3,
            backgroundColor: brandColor,
            borderRadius: 2,
            marginTop: 32,
            marginBottom: 24,
          }}
        />

        {/* Attribution */}
        {sourceName && (
          <div
            style={{
              display: 'flex',
              fontSize: 18,
              fontWeight: 700,
              color: '#78716C',
              textTransform: 'uppercase',
              letterSpacing: 3,
            }}
          >
            {sourceName}
          </div>
        )}
      </div>
    );
  },
};

export default config;
