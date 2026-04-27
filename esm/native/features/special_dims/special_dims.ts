// Special (per-cell) dimensions feature
//
// This module centralizes the logic around `config.specialDims` (width/height/depth overrides per module).
// The goal is to keep override semantics consistent across:
// - builder (geometry and carcass envelope)
// - sketch/dim overlays
// - UI editing flows (pointer picking)
//
// Policy (existing behavior):
// - A dimension override is ACTIVE when the value exists and differs from its captured base value.
// - When an override is toggled back, we remove both the value and its base key.
// - If `specialDims` becomes empty, delete it from the module config.

export type UnknownBag = Record<string, unknown>;

export type SpecialDimsKey = 'widthCm' | 'heightCm' | 'depthCm';
export type SpecialDimsBaseKey = 'baseWidthCm' | 'baseHeightCm' | 'baseDepthCm';

export type SpecialDimsRecord = {
  widthCm?: number;
  baseWidthCm?: number;
  heightCm?: number;
  baseHeightCm?: number;
  depthCm?: number;
  baseDepthCm?: number;
  [k: string]: unknown;
};

const EPS = 1e-6;

function isRecord(v: unknown): v is UnknownBag {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function asNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function readSpecialDimsBag(cfgMod: unknown): UnknownBag | null {
  if (!isRecord(cfgMod)) return null;
  const specialDims = cfgMod.specialDims;
  return isRecord(specialDims) ? specialDims : null;
}

function readOverrideValue(sd: unknown, key: string): number {
  return isRecord(sd) ? asNum(sd[key]) : NaN;
}

function deleteKeys(rec: Record<string, unknown>, keys: string[]): void {
  for (let i = 0; i < keys.length; i++) delete rec[keys[i]];
}

export function getSpecialDims(cfgMod: unknown): SpecialDimsRecord | null {
  const sd = readSpecialDimsBag(cfgMod);
  if (!sd) return null;
  const next: SpecialDimsRecord = {};
  for (const key of ['widthCm', 'baseWidthCm', 'heightCm', 'baseHeightCm', 'depthCm', 'baseDepthCm']) {
    const value = asNum(sd[key]);
    if (Number.isFinite(value) && value > 0) next[key] = value;
  }
  return Object.keys(next).length ? next : null;
}

export function cloneSpecialDims(sd: unknown): SpecialDimsRecord {
  return isRecord(sd) ? { ...sd } : {};
}

export function isOverrideActive(sd: unknown, key: string, baseKey: string): boolean {
  const v = readOverrideValue(sd, key);
  const bv = readOverrideValue(sd, baseKey);
  const hasV = Number.isFinite(v) && v > 0;
  const hasBV = Number.isFinite(bv) && bv > 0;
  return !!(hasV && (!hasBV || Math.abs(v - bv) > EPS));
}

export function getActiveOverrideCm(sd: unknown, key: string, baseKey: string): number | null {
  if (!isOverrideActive(sd, key, baseKey)) return null;
  const v = readOverrideValue(sd, key);
  return Number.isFinite(v) && v > 0 ? v : null;
}

export function getActiveWidthCmFromConfig(cfgMod: unknown): number | null {
  const sd = getSpecialDims(cfgMod);
  return getActiveOverrideCm(sd, 'widthCm', 'baseWidthCm');
}

export function getActiveDepthCmFromConfig(cfgMod: unknown): number | null {
  const sd = getSpecialDims(cfgMod);
  return getActiveOverrideCm(sd, 'depthCm', 'baseDepthCm');
}

// Height overrides may require an offset conversion in stack-split mode.
// When heightOffsetCm > 0, heights stored as ABS from floor are converted to upper-relative by subtracting the offset.
export function getActiveHeightCmFromConfig(cfgMod: unknown, heightOffsetCm: number): number | null {
  const sd = getSpecialDims(cfgMod);
  if (!sd) return null;

  let h = readOverrideValue(sd, 'heightCm');
  let bh = readOverrideValue(sd, 'baseHeightCm');

  if (Number.isFinite(heightOffsetCm) && heightOffsetCm > 0) {
    if (Number.isFinite(h)) h -= heightOffsetCm;
    if (Number.isFinite(bh)) bh -= heightOffsetCm;
  }

  const hasH = Number.isFinite(h) && h > 0;
  const hasBH = Number.isFinite(bh) && bh > 0;
  const active = hasH && (!hasBH || Math.abs(h - bh) > EPS);
  return active ? h : null;
}

export function moduleHasAnyActiveSpecialDims(cfgMod: unknown, heightOffsetCm: number): boolean {
  const sd = getSpecialDims(cfgMod);
  if (!sd) return false;
  return (
    getActiveWidthCmFromConfig(cfgMod) != null ||
    getActiveDepthCmFromConfig(cfgMod) != null ||
    getActiveHeightCmFromConfig(cfgMod, heightOffsetCm) != null
  );
}

export function applyOverrideToSpecialDims(args: {
  sd: SpecialDimsRecord;
  key: SpecialDimsKey;
  baseKey: SpecialDimsBaseKey;
  baseValueCm: number;
  targetValueCm: number;
  toggledBack: boolean;
}): void {
  const sd = args.sd;

  if (args.toggledBack) {
    deleteKeys(sd, [args.key, args.baseKey]);
    return;
  }

  const bv = readOverrideValue(sd, args.baseKey);
  if (!Number.isFinite(bv) || bv <= 0) sd[args.baseKey] = args.baseValueCm;
  sd[args.key] = args.targetValueCm;
}

export function clearOverrideKeys(sd: SpecialDimsRecord, keys: string[]): void {
  deleteKeys(sd, keys);
}

export function assignSpecialDimsToConfig(cfgMod: UnknownBag, sd: SpecialDimsRecord): void {
  const keys = Object.keys(sd || {});
  if (keys.length === 0) delete cfgMod.specialDims;
  else cfgMod.specialDims = sd;
}

export function stripWidthOverridesFromConfig(cfgMod: unknown): UnknownBag {
  const m = isRecord(cfgMod) ? cfgMod : {};
  const out: UnknownBag = { ...m };

  const sd0 = getSpecialDims(out);
  if (!sd0) return out;

  const sd = cloneSpecialDims(sd0);
  const beforeKeys = Object.keys(sd);

  clearOverrideKeys(sd, ['widthCm', 'baseWidthCm']);

  const afterKeys = Object.keys(sd);
  const changed = beforeKeys.length !== afterKeys.length || beforeKeys.some(k => !afterKeys.includes(k));

  if (!changed) return out;

  assignSpecialDimsToConfig(out, sd);
  return out;
}

export function removeSpecialDimsInPlace(cfgMod: UnknownBag): void {
  delete cfgMod.specialDims;
}

export function stripAllSpecialDimsFromConfig(cfgMod: unknown): UnknownBag {
  const m = isRecord(cfgMod) ? cfgMod : {};
  const out: UnknownBag = { ...m };
  delete out.specialDims;
  return out;
}
