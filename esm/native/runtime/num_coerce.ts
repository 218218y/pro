// Numeric coercion helpers (ESM)
//
// Shared by:
// - platform selectors (ui.raw parsing)
// - builder sanitize pipeline (canonical dimension bounds)
//
// Goals:
// - Accept older persisted values (string, '', null, boolean)
// - Fail-soft: never throw
// - Keep rules consistent across the codebase

export function coerceFiniteNumber(v: unknown): number | undefined {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return undefined;
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : undefined;
  }
  if (typeof v === 'boolean') return v ? 1 : 0;
  return undefined;
}

export function coerceFiniteInt(v: unknown): number | undefined {
  const n = coerceFiniteNumber(v);
  return typeof n === 'number' ? (Number.isFinite(n) ? Math.round(n) : undefined) : undefined;
}
