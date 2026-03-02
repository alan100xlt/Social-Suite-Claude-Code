// scripts/slack-agent/stdin.js
// Shared stdin reader for Claude Code hook scripts.
// Reads JSON piped by hooks, handles Windows pipe quirks.

export function readStdin() {
  return new Promise((resolve) => {
    let resolved = false;
    let hasData = false;
    const chunks = [];

    const done = () => {
      if (!resolved) {
        resolved = true;
        resolve(chunks.join(''));
      }
    };

    process.stdin.setEncoding('utf8');

    process.stdin.on('data', (chunk) => {
      hasData = true;
      chunks.push(chunk);
    });

    process.stdin.on('end', done);
    process.stdin.on('error', done);

    // Fallback timeout — but if we've received data, wait longer for 'end'
    setTimeout(() => {
      if (!hasData) {
        done(); // No data at all after 500ms — stdin probably not piped
      } else {
        // Got some data but 'end' hasn't fired — give it a bit more
        setTimeout(done, 500);
      }
    }, 500);
  });
}

export async function parseHookInput() {
  const raw = await readStdin();
  let input = {};
  try {
    if (raw.trim()) input = JSON.parse(raw);
  } catch {
    // Invalid JSON — return empty
  }
  return input;
}
