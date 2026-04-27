export function normalizeHexColor(v: string): string | null {
  let s = String(v || '')
    .trim()
    .toLowerCase();
  if (!s) return null;
  if (!s.startsWith('#')) return null;
  s = s.slice(1);
  if (s.length === 3) {
    s = s
      .split('')
      .map(ch => ch + ch)
      .join('');
  }
  if (s.length !== 6) return null;
  if (!/^[0-9a-f]{6}$/.test(s)) return null;
  return `#${s}`;
}
