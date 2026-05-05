import { normalizeHexColor as normalizeHexColorInner } from './notes_overlay_helpers_style_color.js';

export function editorFontSizeToPx(v: unknown): string {
  let n = 4;
  try {
    if (typeof v === 'number' && Number.isFinite(v)) n = Math.round(v);
    else if (typeof v === 'string' && v.trim()) n = parseInt(v, 10);
  } catch {
    n = 4;
  }
  if (!Number.isFinite(n)) n = 4;

  switch (n) {
    case 1:
      return '12px';
    case 2:
      return '14px';
    case 3:
      return '16px';
    case 4:
      return '18px';
    case 5:
      return '20px';
    case 6:
      return '24px';
    case 7:
      return '28px';
    default:
      return '18px';
  }
}

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

export function rgbToHex(v: string): string | null {
  const s = String(v || '').trim();
  if (!s) return null;

  const compact = s.replace(/\s+/g, '');
  let m = compact.match(/^rgba?\((\d+),(\d+),(\d+)(?:,([\d.]+))?\)$/i);
  if (!m) {
    m = s.match(/^rgba?\(\s*(\d+)\s+(\d+)\s+(\d+)(?:\s*\/\s*([\d.]+))?\s*\)$/i);
  }
  if (!m) return null;

  const r = Math.max(0, Math.min(255, parseInt(m[1], 10)));
  const g = Math.max(0, Math.min(255, parseInt(m[2], 10)));
  const b = Math.max(0, Math.min(255, parseInt(m[3], 10)));

  const to2 = (n: number) => n.toString(16).padStart(2, '0');
  return `#${to2(r)}${to2(g)}${to2(b)}`.toLowerCase();
}

export function normalizeCssColorToHex(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (!s) return null;
  const low = s.toLowerCase();
  if (low === 'transparent' || low === 'inherit' || low === 'initial' || low === 'unset') return null;
  return normalizeHexColorInner(s) || rgbToHex(s);
}

export function pxToEditorFontSize(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim().toLowerCase();
  if (!s.endsWith('px')) return null;
  const px = parseFloat(s);
  if (!Number.isFinite(px)) return null;

  const map = [11, 13, 16, 19, 24, 32, 48];
  let best = 4;
  let bestDist = Infinity;
  for (let i = 0; i < map.length; i++) {
    const d = Math.abs(px - map[i]);
    if (d < bestDist) {
      bestDist = d;
      best = i + 1;
    }
  }
  return String(best);
}

export function normalizeEditorFontSizeValue(v: unknown): string | null {
  if (typeof v === 'number' && Number.isFinite(v)) {
    const n = Math.round(v);
    if (n >= 1 && n <= 7) return String(n);
    return null;
  }
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (!s) return null;

  const n = parseInt(s, 10);
  if (Number.isFinite(n) && n >= 1 && n <= 7) return String(n);

  const fromPx = pxToEditorFontSize(s);
  if (fromPx) return fromPx;

  return null;
}
