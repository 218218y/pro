import type { UnknownRecord } from '../../../types/index.js';

export type BaseLegStyle = 'tapered' | 'round' | 'square';
export type BaseLegColor = 'black' | 'nickel' | 'gold';

export type BaseLegGeometrySpec =
  | {
      shape: 'round';
      topRadius: number;
      bottomRadius: number;
      radialSegments: number;
    }
  | {
      shape: 'square';
      width: number;
      depth: number;
    };

export type BaseLegOptions = {
  style: BaseLegStyle;
  color: BaseLegColor;
  heightCm: number;
  heightM: number;
  widthCm: number;
  widthM: number;
  colorHex: string;
  geometry: BaseLegGeometrySpec;
};

export const DEFAULT_BASE_LEG_STYLE: BaseLegStyle = 'tapered';
export const DEFAULT_BASE_LEG_COLOR: BaseLegColor = 'black';
export const DEFAULT_BASE_LEG_HEIGHT_CM = 12;
export const BASE_LEG_HEIGHT_MIN_CM = 1;
export const BASE_LEG_HEIGHT_MAX_CM = 60;
export const DEFAULT_BASE_LEG_WIDTH_CM = 3.5;
export const DEFAULT_TAPERED_BASE_LEG_WIDTH_CM = 4;
export const BASE_LEG_WIDTH_MIN_CM = 1;
export const BASE_LEG_WIDTH_MAX_CM = 30;

const BASE_LEG_COLOR_HEX: Record<BaseLegColor, string> = {
  black: '#111111',
  nickel: '#b8bec6',
  gold: '#d4af37',
};

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

export function normalizeBaseLegStyle(value: unknown): BaseLegStyle {
  const raw = String(value || '')
    .trim()
    .toLowerCase();
  if (raw === 'round') return 'round';
  if (raw === 'square') return 'square';
  return DEFAULT_BASE_LEG_STYLE;
}

export function normalizeBaseLegColor(value: unknown): BaseLegColor {
  const raw = String(value || '')
    .trim()
    .toLowerCase();
  if (raw === 'nickel') return 'nickel';
  if (raw === 'gold') return 'gold';
  return DEFAULT_BASE_LEG_COLOR;
}

function parseFiniteNumber(value: unknown): number {
  return typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() === ''
      ? NaN
      : value != null
        ? Number(value)
        : NaN;
}

export function getDefaultBaseLegWidthCm(style: unknown = DEFAULT_BASE_LEG_STYLE): number {
  return normalizeBaseLegStyle(style) === 'tapered'
    ? DEFAULT_TAPERED_BASE_LEG_WIDTH_CM
    : DEFAULT_BASE_LEG_WIDTH_CM;
}

export function normalizeBaseLegHeightCm(value: unknown, fallback = DEFAULT_BASE_LEG_HEIGHT_CM): number {
  const parsed = parseFiniteNumber(value);
  const fallbackParsed = Number.isFinite(fallback) ? Number(fallback) : DEFAULT_BASE_LEG_HEIGHT_CM;
  const raw = Number.isFinite(parsed) ? parsed : fallbackParsed;
  const clamped = Math.max(BASE_LEG_HEIGHT_MIN_CM, Math.min(BASE_LEG_HEIGHT_MAX_CM, raw));
  return Math.round(clamped);
}

export function normalizeBaseLegWidthCm(value: unknown, fallback = DEFAULT_BASE_LEG_WIDTH_CM): number {
  const parsed = parseFiniteNumber(value);
  const fallbackParsed = Number.isFinite(fallback) ? Number(fallback) : DEFAULT_BASE_LEG_WIDTH_CM;
  const raw = Number.isFinite(parsed) ? parsed : fallbackParsed;
  const clamped = Math.max(BASE_LEG_WIDTH_MIN_CM, Math.min(BASE_LEG_WIDTH_MAX_CM, raw));
  return Math.round(clamped * 10) / 10;
}

export function getBaseLegHeightM(value: unknown, fallback?: number): number {
  return normalizeBaseLegHeightCm(value, fallback) / 100;
}

export function getBaseLegWidthM(value: unknown, fallback?: number): number {
  return normalizeBaseLegWidthCm(value, fallback) / 100;
}

export function getBaseLegColorHex(value: unknown): string {
  return BASE_LEG_COLOR_HEX[normalizeBaseLegColor(value)];
}

export function resolveBaseLegGeometrySpec(value: unknown, widthCm?: unknown): BaseLegGeometrySpec {
  const style = normalizeBaseLegStyle(value);
  const widthM = normalizeBaseLegWidthCm(widthCm, getDefaultBaseLegWidthCm(style)) / 100;
  if (style === 'square') return { shape: 'square', width: widthM, depth: widthM };
  const radius = Math.max(0.001, widthM / 2);
  if (style === 'round') {
    return { shape: 'round', topRadius: radius, bottomRadius: radius, radialSegments: 16 };
  }
  return { shape: 'round', topRadius: radius, bottomRadius: radius / 2, radialSegments: 16 };
}

export function readBaseLegOptions(source: unknown): BaseLegOptions {
  const rec = asRecord(source);
  const style = normalizeBaseLegStyle(rec?.baseLegStyle);
  const color = normalizeBaseLegColor(rec?.baseLegColor);
  const heightCm = normalizeBaseLegHeightCm(rec?.baseLegHeightCm);
  const widthCm = normalizeBaseLegWidthCm(rec?.baseLegWidthCm, getDefaultBaseLegWidthCm(style));
  return {
    style,
    color,
    heightCm,
    heightM: heightCm / 100,
    widthCm,
    widthM: widthCm / 100,
    colorHex: BASE_LEG_COLOR_HEX[color],
    geometry: resolveBaseLegGeometrySpec(style, widthCm),
  };
}
