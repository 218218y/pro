// Numeric contracts for builder core-pure computations.
// These helpers are intentionally stricter than UI/config parsers: core-pure inputs are
// produced by the builder pipeline after canonicalization, so string coercion here would hide
// invalid runtime state.

export function readCorePureNumber(value: unknown, defaultValue: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : defaultValue;
}

export function readCorePureInteger(value: unknown, defaultValue: number): number {
  const n = readCorePureNumber(value, defaultValue);
  return Number.isFinite(n) ? Math.trunc(n) : defaultValue;
}

export function readCorePurePositiveInteger(value: unknown, defaultValue: number): number {
  const n = readCorePureInteger(value, defaultValue);
  return Number.isFinite(n) && n >= 1 ? n : defaultValue;
}

export function readCorePurePositiveNumber(value: unknown): number | null {
  const n = readCorePureNumber(value, NaN);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function readCorePureNumberArray(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const out = new Array<number>(value.length);
  for (let i = 0; i < value.length; i += 1) {
    const n = readCorePureNumber(value[i], NaN);
    if (!Number.isFinite(n)) return null;
    out[i] = n;
  }
  return out;
}
