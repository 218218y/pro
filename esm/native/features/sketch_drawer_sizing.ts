import { cmToM, DRAWER_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';

export const SKETCH_INTERNAL_DRAWERS_TOOL_ID = 'sketch_int_drawers';
export const SKETCH_EXTERNAL_DRAWERS_TOOL_PREFIX = 'sketch_ext_drawers:';
export const SKETCH_DRAWER_HEIGHT_TOOL_SEPARATOR = '@';

export const SKETCH_DRAWER_HEIGHT_MIN_CM: number = DRAWER_DIMENSIONS.sketch.heightMinCm;
export const SKETCH_DRAWER_HEIGHT_MAX_CM: number = DRAWER_DIMENSIONS.sketch.heightMaxCm;
export const SKETCH_EXTERNAL_DRAWER_COUNT_MIN: number = DRAWER_DIMENSIONS.sketch.externalCountMin;
export const SKETCH_EXTERNAL_DRAWER_COUNT_MAX: number = DRAWER_DIMENSIONS.sketch.externalCountMax;
export const DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM: number =
  DRAWER_DIMENSIONS.sketch.externalDefaultHeightCm;
export const DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_CM: number =
  DRAWER_DIMENSIONS.sketch.internalDefaultHeightCm;

export const DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M: number = cmToM(
  DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM
);
export const DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_M: number = cmToM(
  DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_CM
);
export const DEFAULT_SKETCH_INTERNAL_DRAWER_GAP_M: number = DRAWER_DIMENSIONS.sketch.internalGapM;
export const SKETCH_INTERNAL_DRAWER_STACK_COUNT: number = DRAWER_DIMENSIONS.sketch.internalStackCount;

const MIN_RENDER_DRAWER_HEIGHT_M = DRAWER_DIMENSIONS.sketch.minRenderHeightM;
const HEIGHT_TOKEN_EPSILON = DRAWER_DIMENSIONS.sketch.heightTokenEpsilonCm;
const STACK_FIT_EPSILON_M = 1e-9;

export const SKETCH_INTERNAL_DRAWERS_DIRTY_KEY = '__internalDrawersSketchDirty';

function hasNonEmptyArray(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function readSketchExtrasRecord(value: unknown): Record<string, unknown> | null {
  const rec = readRecord(value);
  return readRecord(rec?.sketchExtras);
}

function sketchBoxHasInternalDrawers(box: unknown): boolean {
  const rec = readRecord(box);
  return hasNonEmptyArray(rec?.drawers);
}

export function markSketchInternalDrawersDirty(cfg: Record<string, unknown>): void {
  const extra =
    readSketchExtrasRecord(cfg) ||
    (() => {
      const created: Record<string, unknown> = {};
      cfg.sketchExtras = created;
      return created;
    })();
  extra[SKETCH_INTERNAL_DRAWERS_DIRTY_KEY] = true;
}

export function hasSketchInternalDrawersDirtyOrData(value: unknown): boolean {
  const extra = readSketchExtrasRecord(value);
  if (!extra) return false;
  if (extra[SKETCH_INTERNAL_DRAWERS_DIRTY_KEY] === true) return true;
  if (hasNonEmptyArray(extra.drawers)) return true;
  const boxes = Array.isArray(extra.boxes) ? extra.boxes : [];
  return boxes.some(sketchBoxHasInternalDrawers);
}

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

export type SketchDrawerFitResult<TMetrics> = {
  metrics: TMetrics;
  availableHeightM: number;
  fits: boolean;
};

function readFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  return null;
}

function parseFiniteNumberToken(value: unknown): number | null {
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

function readAvailableHeightM(value: unknown): number {
  const height = readFiniteNumber(value);
  return height != null && height > 0 ? height : 0;
}

export function normalizeSketchDrawerHeightCm(value: unknown, defaultCm: number): number {
  const defaultHeight = parseFiniteNumberToken(defaultCm) ?? DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM;
  const raw = parseFiniteNumberToken(value);
  const source = raw != null ? raw : defaultHeight;
  const clamped = Math.max(SKETCH_DRAWER_HEIGHT_MIN_CM, Math.min(SKETCH_DRAWER_HEIGHT_MAX_CM, source));
  return roundHeightCm(clamped);
}

export function normalizeSketchDrawerHeightM(value: unknown, defaultM: number): number {
  const defaultHeight = readFiniteNumber(defaultM) ?? DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M;
  const raw = readFiniteNumber(value);
  const source = raw != null ? raw : defaultHeight;
  const clamped = Math.max(
    cmToM(SKETCH_DRAWER_HEIGHT_MIN_CM),
    Math.min(cmToM(SKETCH_DRAWER_HEIGHT_MAX_CM), source)
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
    drawerHeightM: cmToM(heightCm),
  };
}

export function parseSketchExternalDrawersTool(tool: unknown): SketchExternalDrawersToolSpec | null {
  if (!isSketchExternalDrawersTool(tool)) return null;
  const raw = String(tool).slice(SKETCH_EXTERNAL_DRAWERS_TOOL_PREFIX.length).trim();
  const [countRaw = '', heightRaw = ''] = raw.split(SKETCH_DRAWER_HEIGHT_TOOL_SEPARATOR);
  const countNum = parseFiniteNumberToken(countRaw);
  if (countNum == null) return null;
  const count = Math.max(
    SKETCH_EXTERNAL_DRAWER_COUNT_MIN,
    Math.min(SKETCH_EXTERNAL_DRAWER_COUNT_MAX, Math.floor(countNum))
  );
  const heightCm = heightRaw
    ? normalizeSketchDrawerHeightCm(heightRaw, DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM)
    : DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM;
  return {
    count,
    drawerHeightCm: heightCm,
    drawerHeightM: cmToM(heightCm),
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
  const countNum = parseFiniteNumberToken(count);
  const safeCount =
    countNum != null
      ? Math.max(
          SKETCH_EXTERNAL_DRAWER_COUNT_MIN,
          Math.min(SKETCH_EXTERNAL_DRAWER_COUNT_MAX, Math.floor(countNum))
        )
      : 1;
  const normalized = normalizeSketchDrawerHeightCm(heightCm, DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM);
  const base = `${SKETCH_EXTERNAL_DRAWERS_TOOL_PREFIX}${safeCount}`;
  if (isSameHeightCm(normalized, DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM)) return base;
  return `${base}${SKETCH_DRAWER_HEIGHT_TOOL_SEPARATOR}${formatHeightToken(normalized)}`;
}

export function readSketchDrawerHeightMFromItem(value: unknown, defaultM: number): number {
  const rec = readRecord(value);
  return normalizeSketchDrawerHeightM(rec?.drawerHeightM, defaultM);
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
  const drawerH = Math.max(MIN_RENDER_DRAWER_HEIGHT_M, requestedH);
  const drawerGap = Math.max(0, requestedGap);
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
  const drawerCount =
    countRaw != null
      ? Math.max(
          SKETCH_EXTERNAL_DRAWER_COUNT_MIN,
          Math.min(SKETCH_EXTERNAL_DRAWER_COUNT_MAX, Math.floor(countRaw))
        )
      : 1;
  const requestedH = normalizeSketchDrawerHeightM(
    args?.drawerHeightM,
    DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M
  );
  const drawerH = Math.max(MIN_RENDER_DRAWER_HEIGHT_M, requestedH);
  return {
    drawerCount,
    drawerH,
    stackH: drawerCount * drawerH,
  };
}

export function sketchStackFitsAvailableHeight(stackH: unknown, availableHeightM: unknown): boolean {
  const stack = readFiniteNumber(stackH) ?? 0;
  const available = readAvailableHeightM(availableHeightM);
  return stack <= available + STACK_FIT_EPSILON_M;
}

export function resolveSketchInternalDrawerFit(args?: {
  drawerHeightM?: unknown;
  availableHeightM?: unknown;
  drawerGapM?: unknown;
}): SketchDrawerFitResult<SketchInternalDrawerMetrics> {
  const metrics = resolveSketchInternalDrawerMetrics(args);
  const availableHeightM = readAvailableHeightM(args?.availableHeightM);
  return {
    metrics,
    availableHeightM,
    fits: sketchStackFitsAvailableHeight(metrics.stackH, availableHeightM),
  };
}

export function resolveSketchExternalDrawerFit(args?: {
  drawerCount?: unknown;
  drawerHeightM?: unknown;
  availableHeightM?: unknown;
}): SketchDrawerFitResult<SketchExternalDrawerMetrics> {
  const metrics = resolveSketchExternalDrawerMetrics(args);
  const availableHeightM = readAvailableHeightM(args?.availableHeightM);
  return {
    metrics,
    availableHeightM,
    fits: sketchStackFitsAvailableHeight(metrics.stackH, availableHeightM),
  };
}
