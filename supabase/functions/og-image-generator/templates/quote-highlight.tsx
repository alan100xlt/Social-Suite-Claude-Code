/** @jsxImportSource https://esm.sh/react@18.2.0 */
import type { TemplateConfig, TemplateInput } from './types.ts';

/**
 * Splits the title into segments, highlighting roughly every other word-group
 * to create a "highlighter marker" pull-quote effect.
 */
function buildSegments(text: string): Array<{ text: string; highlighted: boolean }> {
  const words = text.split(' ');
  const segments: Array<{ text: string; highlighted: boolean }> = [];
  let i = 0;
  let highlighted = false;

  while (i < words.length) {
    // Take 2-4 words per segment
    const chunkSize = Math.min(2 + Math.floor(Math.random() * 3), words.length - i);
    const chunk = words.slice(i, i + chunkSize).join(' ');
    segments.push({ text: chunk, highlighted });
    highlighted = !highlighted;
    i += chunkSize;
  }
  return segments;
}

const config: TemplateConfig = {
  id: 'quote-highlight',
  name: 'Quote Highlight',
  category: 'editorial',
  requiresImage: false,
  render: (input: TemplateInput) => {
    const { title, sourceName, brandColor = '#FACC15' } = input;
    const segments = buildSegments(title);

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: 1200,
          height: 630,
          backgroundColor: '#1C1917',
          padding: 80,
        }}
      >
        {/* Pull quote with highlights */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            maxWidth: 1000,
            overflow: 'hidden',
            maxHeight: 340,
          }}
        >
          {segments.map((seg, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                fontSize: 44,
                fontWeight: 700,
                lineHeight: 1.6,
                color: seg.highlighted ? '#1C1917' : '#FAFAF9',
                backgroundColor: seg.highlighted ? brandColor : 'transparent',
                padding: seg.highlighted ? '2px 8px' : '2px 0',
                marginRight: 10,
                borderRadius: seg.highlighted ? 4 : 0,
              }}
            >
              {seg.text}
            </div>
          ))}
        </div>

        {/* Attribution */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: 48,
          }}
        >
          <div
            style={{
              display: 'flex',
              width: 40,
              height: 2,
              backgroundColor: brandColor,
              marginRight: 16,
            }}
          />
          {sourceName && (
            <div
              style={{
                display: 'flex',
                fontSize: 18,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.5)',
                textTransform: 'uppercase',
                letterSpacing: 3,
              }}
            >
              {sourceName}
            </div>
          )}
        </div>
      </div>
    );
  },
};

export default config;
