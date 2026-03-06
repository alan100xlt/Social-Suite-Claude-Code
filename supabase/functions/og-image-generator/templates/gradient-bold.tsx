/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from './types.ts';

const config: TemplateConfig = {
  id: 'gradient-bold',
  name: 'Bold Gradient',
  category: 'gradient',
  requiresImage: false,
  render: (input: TemplateInput) => {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          width: 1200,
          height: 630,
          background: 'linear-gradient(135deg, #EC4899 0%, #F97316 100%)',
          padding: 80,
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 72,
            fontWeight: 700,
            color: '#FFFFFF',
            lineHeight: 1.1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxHeight: 400,
            maxWidth: 1040,
          }}
        >
          {input.title}
        </div>

        {input.sourceName && (
          <div
            style={{
              display: 'flex',
              fontSize: 22,
              fontWeight: 700,
              color: 'rgba(255, 255, 255, 0.85)',
              marginTop: 40,
              letterSpacing: 1,
            }}
          >
            {input.sourceName}
          </div>
        )}
      </div>
    );
  },
};

export default config;
