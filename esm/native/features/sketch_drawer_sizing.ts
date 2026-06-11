export const SKETCH_INTERNAL_DRAWERS_TOOL_ID = 'sketch_int_drawers';
export const SKETCH_EXTERNAL_DRAWERS_TOOL_PREFIX = 'sketch_ext_drawers:';
export const SKETCH_DRAWER_HEIGHT_TOOL_SEPARATOR = '@';

export const SKETCH_DRAWER_HEIGHT_MIN_CM = 5;
export const SKETCH_DRAWER_HEIGHT_MAX_CM = 120;
export const DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM = 22;
export const DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_CM = 16.5;

export const DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M = DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM / 100;
export const DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_M = DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_CM / 100;
export const DEFAULT_SKETCH_INTERNAL_DRAWER_GAP_M = 0.03;
export const SKETCH_INTERNAL_DRAWER_STACK_COUNT = 2;

const MIN_RENDER_DRAWER_HEIGHT_M = 0.01;
const HEIGHT_TOKEN_EPSILON = 0.0001;

export type SketchExternalDrawersToolSpec = {
  count: number;
  drawerHeightCm: number;
  drawerHeightM: number;
};

export type SketchInternalDrawersToolSpec = {
  drawerHeightCm: number;
  drawerHeightM: number;
};

export type SketchInternalDrawerMetrics = {
  drawerH: number;
  drawerGap: number;
  stackH: number;
};

export type SketchExternalDrawerMetrics = {
  drawerCount: number;
  drawerH: number;
  stackH: number;
};

function readFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return !!value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function roundHeightCm(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatHeightToken(value: number): string {
  const rounded = roundHeightCm(value);
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function isSameHeightCm(a: number, b: number): boolean {
  return Math.abs(a - b) <= HEIGHT_TOKEN_EPSILON;
}

export function normalizeSketchDrawerHeightCm(value: unknown, fallbackCm: number): number {
  const fallback = readFiniteNumber(fallbackCm) ?? DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM;
  const raw = readFiniteNumber(value);
  const source = raw != null ? raw : fallback;
  const clamped = Math.max(SKETCH_DRAWER_HEIGHT_MIN_CM, Math.min(SKETCH_DRAWER_HEIGHT_MAX_CM, source));
  return roundHeightCm(clamped);
}

export function normalizeSketchDrawerHeightM(value: unknown, fallbackM: number): number {
  const fallback = readFiniteNumber(fallbackM) ?? DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M;
  const raw = readFiniteNumber(value);
  const source = raw != null ? raw : fallback;
  const clamped = Math.max(
    SKETCH_DRAWER_HEIGHT_MIN_CM / 100,
    Math.min(SKETCH_DRAWER_HEIGHT_MAX_CM / 100, source)
  );
  return clamped;
}

export function isSketchInternalDrawersTool(tool: unknown): boolean {
  if (typeof tool !== 'string') return false;
  return (
    tool === SKETCH_INTERNAL_DRAWERS_TOOL_ID ||
    tool.startsWith(`${SKETCH_INTERNAL_DRAWERS_TOOL_ID}${SKETCH_DRAWER_HEIGHT_TOOL_SEPARATOR}`)
  );
}

export function isSketchExternalDrawersTool(tool: unknown): boolean {
  return typeof tool === 'string' && tool.startsWith(SKETCH_EXTERNAL_DRAWERS_TOOL_PREFIX);
}

export function parseSketchInternalDrawersTool(tool: unknown): SketchInternalDrawersToolSpec | null {
  if (!isSketchInternalDrawersTool(tool)) return null;
  const raw = String(tool);
  const at = raw.indexOf(SKETCH_DRAWER_HEIGHT_TOOL_SEPARATOR);
  const heightCm =
    at >= 0
      ? normalizeSketchDrawerHeightCm(
          raw.slice(at + SKETCH_DRAWER_HEIGHT_TOOL_SEPARATOR.length).trim(),
          DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_CM
        )
      : DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_CM;
  return {
    drawerHeightCm: heightCm,
    drawerHeightM: heightCm / 100,
  };
}

export function parseSketchExternalDrawersTool(tool: unknown): SketchExternalDrawersToolSpec | null {
  if (!isSketchExternalDrawersTool(tool)) return null;
  const raw = String(tool).slice(SKETCH_EXTERNAL_DRAWERS_TOOL_PREFIX.length).trim();
  const [countRaw = '', heightRaw = ''] = raw.split(SKETCH_DRAWER_HEIGHT_TOOL_SEPARATOR);
  const countNum = readFiniteNumber(countRaw);
  if (countNum == null) return null;
  const count = Math.max(1, Math.min(5, Math.floor(countNum)));
  const heightCm = heightRaw
    ? normalizeSketchDrawerHeightCm(heightRaw, DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM)
    : DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM;
  return {
    count,
    drawerHeightCm: heightCm,
    drawerHeightM: heightCm / 100,
  };
}

export function createSketchInternalDrawersTool(heightCm: unknown): string {
  const normalized = normalizeSketchDrawerHeightCm(heightCm, DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_CM);
  if (isSameHeightCm(normalized, DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_CM)) {
    return SKETCH_INTERNAL_DRAWERS_TOOL_ID;
  }
  return `${SKETCH_INTERNAL_DRAWERS_TOOL_ID}${SKETCH_DRAWER_HEIGHT_TOOL_SEPARATOR}${formatHeightToken(normalized)}`;
}

export function createSketchExternalDrawersTool(count: unknown, heightCm: unknown): string {
  const countNum = readFiniteNumber(count);
  const safeCount = countNum != null ? Math.max(1, Math.min(5, Math.floor(countNum))) : 1;
  const normalized = normalizeSketchDrawerHeightCm(heightCm, DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM);
  const base = `${SKETCH_EXTERNAL_DRAWERS_TOOL_PREFIX}${safeCount}`;
  if (isSameHeightCm(normalized, DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM)) return base;
  return `${base}${SKETCH_DRAWER_HEIGHT_TOOL_SEPARATOR}${formatHeightToken(normalized)}`;
}

export function readSketchDrawerHeightMFromItem(value: unknown, fallbackM: number): number {
  const rec = readRecord(value);
  return normalizeSketchDrawerHeightM(rec?.drawerHeightM, fallbackM);
}

export function resolveSketchInternalDrawerMetrics(args?: {
  drawerHeightM?: unknown;
  availableHeightM?: unknown;
  drawerGapM?: unknown;
}): SketchInternalDrawerMetrics {
  const requestedH = normalizeSketchDrawerHeightM(
    args?.drawerHeightM,
    DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_M
  );
  const gapRaw = readFiniteNumber(args?.drawerGapM);
  const requestedGap = gapRaw != null && gapRaw >= 0 ? gapRaw : DEFAULT_SKETCH_INTERNAL_DRAWER_GAP_M;
  const available = readFiniteNumber(args?.availableHeightM);

  let drawerGap = requestedGap;
  let drawerH = requestedH;
  if (available != null && available > 0) {
    const maxWithGap = (available - requestedGap) / SKETCH_INTERNAL_DRAWER_STACK_COUNT;
    if (maxWithGap > 0) {
      drawerH = Math.min(requestedH, maxWithGap);
    } else {
      drawerGap = 0;
      drawerH = Math.min(requestedH, available / SKETCH_INTERNAL_DRAWER_STACK_COUNT);
    }
  }

  drawerH = Math.max(MIN_RENDER_DRAWER_HEIGHT_M, drawerH);
  drawerGap = Math.max(0, drawerGap);
  return {
    drawerH,
    drawerGap,
    stackH: SKETCH_INTERNAL_DRAWER_STACK_COUNT * drawerH + drawerGap,
  };
}

export function resolveSketchExternalDrawerMetrics(args?: {
  drawerCount?: unknown;
  drawerHeightM?: unknown;
  availableHeightM?: unknown;
}): SketchExternalDrawerMetrics {
  const countRaw = readFiniteNumber(args?.drawerCount);
  const drawerCount = countRaw != null ? Math.max(1, Math.min(5, Math.floor(countRaw))) : 1;
  const requestedH = normalizeSketchDrawerHeightM(
    args?.drawerHeightM,
    DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M
  );
  const available = readFiniteNumber(args?.availableHeightM);
  const maxDrawerH = available != null && available > 0 ? available / drawerCount : null;
  const drawerH =
    maxDrawerH != null ? Math.max(MIN_RENDER_DRAWER_HEIGHT_M, Math.min(requestedH, maxDrawerH)) : requestedH;
  return {
    drawerCount,
    drawerH,
    stackH: drawerCount * drawerH,
  };
}
