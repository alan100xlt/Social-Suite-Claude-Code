export function parseMentions(text: string): string[] {
  const matches = text.match(/@([\w.-]+(?:\s[\w.-]+)?)/g);
  return matches ? matches.map(m => m.slice(1)) : [];
}
