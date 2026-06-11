import type {
  MirrorLayoutEntry,
  MirrorLayoutList,
  MirrorLayoutMap,
  UnknownRecord,
} from '../../types/index.js';

export const DEFAULT_CENTER_NORM = 0.5;
export const DEFAULT_FACE_SIGN = 1;
export const FULL_MIRROR_INSET_M = 0.002;
export const MIN_MIRROR_SIZE_M = 0.02;
export const CENTER_EPSILON = 1e-4;
export const SIZE_EPSILON_CM = 1e-3;
export const MIRROR_CENTER_SNAP_NORM_THRESHOLD = 0.04;
export const DEFAULT_REMOVE_TOLERANCE_M = 0.03;
export const MAX_REMOVE_TOLERANCE_M = 0.06;

export type MirrorDraftInput = {
  widthCm?: unknown;
  heightCm?: unknown;
};

export function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function readFinite(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const text = value.trim().replace(',', '.');
    if (!text) return null;
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function clamp01(value: unknown): number {
  const n = readFinite(value);
  if (!Number.isFinite(n)) return DEFAULT_CENTER_NORM;
  return Math.max(0, Math.min(1, Number(n)));
}

export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function normalizePositiveCm(value: unknown): number | null {
  const n = readFinite(value);
  if (n == null || n <= 0) return null;
  return n;
}

export function normalizeMirrorFaceSign(value: unknown, fallback: number = DEFAULT_FACE_SIGN): number {
  const fallbackSign = fallback === -1 ? -1 : DEFAULT_FACE_SIGN;
  const n = readFinite(value);
  if (!Number.isFinite(n)) return fallbackSign;
  return Number(n) < 0 ? -1 : DEFAULT_FACE_SIGN;
}

export function readMirrorLayoutFaceSign(layout: unknown, fallback: number = DEFAULT_FACE_SIGN): number {
  const entry = isRecord(layout) ? layout : null;
  return normalizeMirrorFaceSign(entry?.faceSign, fallback);
}

export function normalizeCenterNorm(value: unknown): number {
  const n = clamp01(value);
  return Math.abs(n - DEFAULT_CENTER_NORM) <= CENTER_EPSILON ? DEFAULT_CENTER_NORM : n;
}

export function cloneMirrorLayoutEntry(entry: MirrorLayoutEntry): MirrorLayoutEntry {
  return { ...entry };
}

export function buildCenterNorm(absCenter: number, min: number, span: number): number {
  if (!(span > 0)) return DEFAULT_CENTER_NORM;
  return clamp((absCenter - min) / span, 0, 1);
}

export function readMirrorLayoutEntry(value: unknown): MirrorLayoutEntry | null {
  if (!isRecord(value)) return null;
  const widthCm = normalizePositiveCm(value.widthCm);
  const heightCm = normalizePositiveCm(value.heightCm);
  const centerXNorm = normalizeCenterNorm(value.centerXNorm);
  const centerYNorm = normalizeCenterNorm(value.centerYNorm);
  const explicitFaceSign = Object.prototype.hasOwnProperty.call(value, 'faceSign')
    ? readFinite(value.faceSign)
    : null;
  const faceSign = readMirrorLayoutFaceSign(value, DEFAULT_FACE_SIGN);

  const out: MirrorLayoutEntry = {};
  if (widthCm != null) out.widthCm = widthCm;
  if (heightCm != null) out.heightCm = heightCm;
  if (Math.abs(centerXNorm - DEFAULT_CENTER_NORM) > CENTER_EPSILON) out.centerXNorm = centerXNorm;
  if (Math.abs(centerYNorm - DEFAULT_CENTER_NORM) > CENTER_EPSILON) out.centerYNorm = centerYNorm;
  if (faceSign !== DEFAULT_FACE_SIGN || explicitFaceSign != null) out.faceSign = faceSign;
  return Object.keys(out).length ? out : null;
}

export function readMirrorLayoutList(value: unknown): MirrorLayoutList {
  if (Array.isArray(value)) {
    const out: MirrorLayoutList = [];
    for (let i = 0; i < value.length; i += 1) {
      const entry = readMirrorLayoutEntry(value[i]);
      if (entry) out.push(entry);
    }
    return out;
  }
  const single = readMirrorLayoutEntry(value);
  return single ? [single] : [];
}

export function cloneMirrorLayoutList(value: unknown): MirrorLayoutList {
  const list = readMirrorLayoutList(value);
  const out: MirrorLayoutList = [];
  for (let i = 0; i < list.length; i += 1) out.push(cloneMirrorLayoutEntry(list[i]));
  return out;
}

export function readMirrorLayoutMap(value: unknown): MirrorLayoutMap {
  const out: MirrorLayoutMap = Object.create(null);
  if (!isRecord(value)) return out;
  for (const [key, entry] of Object.entries(value)) {
    const next = cloneMirrorLayoutList(entry);
    if (next.length) out[key] = next;
  }
  return out;
}

export function mirrorLayoutEquals(a: unknown, b: unknown): boolean {
  const aa = readMirrorLayoutEntry(a);
  const bb = readMirrorLayoutEntry(b);
  if (!aa && !bb) return true;
  if (!aa || !bb) return false;
  const aw = aa.widthCm ?? null;
  const bw = bb.widthCm ?? null;
  if (aw === null || bw === null) {
    if (!(aw === null && bw === null)) return false;
  } else if (Math.abs(aw - bw) > SIZE_EPSILON_CM) return false;

  const ah = aa.heightCm ?? null;
  const bh = bb.heightCm ?? null;
  if (ah === null || bh === null) {
    if (!(ah === null && bh === null)) return false;
  } else if (Math.abs(ah - bh) > SIZE_EPSILON_CM) return false;

  const acx = aa.centerXNorm ?? DEFAULT_CENTER_NORM;
  const bcx = bb.centerXNorm ?? DEFAULT_CENTER_NORM;
  if (Math.abs(acx - bcx) > CENTER_EPSILON) return false;

  const acy = aa.centerYNorm ?? DEFAULT_CENTER_NORM;
  const bcy = bb.centerYNorm ?? DEFAULT_CENTER_NORM;
  if (Math.abs(acy - bcy) > CENTER_EPSILON) return false;

  const af = readMirrorLayoutFaceSign(aa, DEFAULT_FACE_SIGN);
  const bf = readMirrorLayoutFaceSign(bb, DEFAULT_FACE_SIGN);
  if (af !== bf) return false;

  return true;
}

export function mirrorLayoutListEquals(a: unknown, b: unknown): boolean {
  const aa = readMirrorLayoutList(a);
  const bb = readMirrorLayoutList(b);
  if (aa.length !== bb.length) return false;
  for (let i = 0; i < aa.length; i += 1) {
    if (!mirrorLayoutEquals(aa[i], bb[i])) return false;
  }
  return true;
}

export function normalizeMirrorDraftInput(value: unknown): MirrorDraftInput {
  const rec = isRecord(value) ? value : null;
  return {
    widthCm: rec?.widthCm,
    heightCm: rec?.heightCm,
  };
}
