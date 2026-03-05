import React from 'react';

/**
 * Simple markdown renderer that handles bold, italic, inline code, code blocks, and line breaks.
 * No external dependency needed.
 */
export function renderSimpleMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.trimStart().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      result.push(
        <pre
          key={`code-${i}`}
          className="bg-muted rounded-md px-3 py-2 text-xs font-mono overflow-x-auto my-1"
        >
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // Regular line
    result.push(
      <React.Fragment key={`line-${i}`}>
        {i > 0 && <br />}
        {renderInlineMarkdown(line)}
      </React.Fragment>
    );
    i++;
  }

  return result;
}

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  // Pattern matches: **bold**, *italic*, `code`
  const pattern = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIndex = 0;

  while ((match = pattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // Bold
      result.push(<strong key={`b-${keyIndex++}`}>{match[2]}</strong>);
    } else if (match[4]) {
      // Italic
      result.push(<em key={`i-${keyIndex++}`}>{match[4]}</em>);
    } else if (match[6]) {
      // Inline code
      result.push(
        <code
          key={`c-${keyIndex++}`}
          className="bg-muted rounded px-1 py-0.5 text-xs font-mono"
        >
          {match[6]}
        </code>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result;
}
