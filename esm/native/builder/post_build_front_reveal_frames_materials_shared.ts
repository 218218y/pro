// Front reveal frame material shared helpers (Pure ESM)
//
// Owns line-material cache buckets plus luminance/color-mix helpers used by the
// adaptive reveal-frame material picker.

import type { ThreeLike } from '../../../types/index.js';

import { isRecord, type LineMaterialLike } from './post_build_extras_shared.js';

export type FrontRevealLineMaterialCacheRuntime = {
  baseLineMaterial: LineMaterialLike;
  legacyRevealOpacity: number;
  darkFrontRevealOpacity: number;
  ensureAdaptiveRevealLineMaterial: (darkness: number) => LineMaterialLike;
};

export type CreateFrontRevealLineMaterialCacheArgs = {
  THREE: ThreeLike;
  sketchMode: boolean;
  readLineMaterial: (key: string) => unknown;
  writeLineMaterial: (key: string, value: unknown) => unknown;
};

export function asLineMaterialLike(value: unknown): LineMaterialLike | null {
  if (!isRecord(value)) return null;
  return value;
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function srgbToLinear(v: number): number {
  const x = clamp01(v);
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

export function lumaFromHex(hex: number): number {
  const n = Number(hex) >>> 0;
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const rl = srgbToLinear(r);
  const gl = srgbToLinear(g);
  const bl = srgbToLinear(b);
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

export function mixHex(aHex: number, bHex: number, tIn: number): number {
  const t = clamp01(tIn);
  const a = hexToRgb01(aHex);
  const b = hexToRgb01(bHex);
  const r = Math.round((a.r + (b.r - a.r) * t) * 255);
  const g = Math.round((a.g + (b.g - a.g) * t) * 255);
  const bl = Math.round((a.b + (b.b - a.b) * t) * 255);
  return ((r & 255) << 16) | ((g & 255) << 8) | (bl & 255);
}

export function analyzeFrontColor(hex: number): { luma: number; darkness: number } {
  const luma = lumaFromHex(hex);
  let darkness = clamp01((0.42 - luma) / 0.3);
  if (luma >= 0.5 && darkness < 0.2) darkness = 0;
  if (darkness < 0.06) darkness = 0;
  return { luma, darkness: clamp01(darkness) };
}

export function createFrontRevealLineMaterialCache(
  args: CreateFrontRevealLineMaterialCacheArgs
): FrontRevealLineMaterialCacheRuntime | null {
  const { THREE, sketchMode, readLineMaterial, writeLineMaterial } = args;
  const legacyRevealOpacity = sketchMode ? 0.5625 : 0.75;
  const darkFrontRevealOpacity = sketchMode ? 0.58 : 0.9;

  const tuneRevealLineMaterial = (m: LineMaterialLike | null, opacity: number) => {
    if (!m) return;
    m.transparent = true;
    m.opacity = opacity;
    m.depthWrite = false;
    m.depthTest = true;
  };

  const ensureRevealLineMaterial = (key: string, color: number, opacity: number) => {
    let m = asLineMaterialLike(readLineMaterial(key));
    if (!m) {
      try {
        m = asLineMaterialLike(
          writeLineMaterial(key, new THREE.LineBasicMaterial({ color, transparent: true, opacity }))
        );
      } catch (_error) {
        return null;
      }
    }
    tuneRevealLineMaterial(m, opacity);
    return m;
  };

  const baseLineMaterial = ensureRevealLineMaterial(
    'frontRevealFrameLineMaterial',
    0x666666,
    legacyRevealOpacity
  );
  if (!baseLineMaterial) return null;

  const ensureAdaptiveRevealLineMaterial = (darknessIn: number) => {
    const darkness = clamp01(darknessIn);
    if (!(darkness > 0.001)) return baseLineMaterial;

    const bucket = Math.max(1, Math.min(16, Math.round(darkness * 16)));
    const t = bucket / 16;
    const tColor = Math.pow(t, 1.22) * 0.9;
    const tOpacity = Math.pow(t, 1.14);
    const color = mixHex(0x666666, 0x232323, tColor);
    const opacity = legacyRevealOpacity + (darkFrontRevealOpacity - legacyRevealOpacity) * (tOpacity * 0.78);

    return (
      ensureRevealLineMaterial('frontRevealFrameLineMaterialAdaptive_' + String(bucket), color, opacity) ||
      baseLineMaterial
    );
  };

  return {
    baseLineMaterial,
    legacyRevealOpacity,
    darkFrontRevealOpacity,
    ensureAdaptiveRevealLineMaterial,
  };
}

function hexToRgb01(hex: number) {
  const n = Number(hex) >>> 0;
  return {
    r: ((n >> 16) & 255) / 255,
    g: ((n >> 8) & 255) / 255,
    b: (n & 255) / 255,
  };
}
