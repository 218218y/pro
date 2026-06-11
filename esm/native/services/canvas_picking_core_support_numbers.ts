// Focused canvas-picking support owner for numeric coercion, module-key parsing,
// and small identifier helpers.

export type ModuleKey = number | 'corner' | `corner:${number}`;

const EDGE_HANDLE_VARIANT_PART_PREFIX = '__wp_edge_handle_variant:';

export function __wp_toFiniteNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function __wp_toModuleKey(v: unknown): ModuleKey | null {
  if (v === 'corner') return 'corner';
  if (typeof v === 'string' && v.startsWith('corner:')) {
    const s = v.slice('corner:'.length);
    const idx = __wp_toFiniteNumber(s);
    if (idx != null && idx >= 0) {
      const key: `corner:${number}` = `corner:${Math.floor(idx)}`;
      return key;
    }
    return null;
  }
  const n = __wp_toFiniteNumber(v);
  return n != null ? n : null;
}

export function __wp_isCornerKey(mk: unknown): mk is 'corner' | `corner:${number}` {
  return mk === 'corner' || (typeof mk === 'string' && mk.startsWith('corner:'));
}

export function __edgeHandleVariantPartKey(partId: unknown): string {
  return `${EDGE_HANDLE_VARIANT_PART_PREFIX}${String(partId || '')}`;
}

export function __normEdgeHandleVariant(v: unknown): 'short' | 'long' {
  return v === 'long' ? 'long' : 'short';
}

export function __asNum(v: unknown, d: number): number {
  const n = __wp_toFiniteNumber(v);
  return n != null ? n : d;
}

export function __asInt(v: unknown, d: number): number {
  const n = __asNum(v, NaN);
  if (!Number.isFinite(n)) return d;
  const i = n < 0 ? Math.ceil(n) : Math.floor(n);
  return Number.isFinite(i) ? i : d;
}
