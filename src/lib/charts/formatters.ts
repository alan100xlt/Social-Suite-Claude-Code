/** Compact number formatting: 1200 → "1.2K", 1500000 → "1.5M" */
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

/** Format as percentage with 1 decimal */
export function formatPercent(n: number): string {
  return `${n.toFixed(1)}%`;
}

/** Format a tick value (string or number) for chart axes */
export function formatAxisTick(v: string | number): string {
  const n = Number(v);
  if (isNaN(n)) return String(v);
  return formatNumber(n);
}
