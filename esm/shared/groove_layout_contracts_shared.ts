import type {
  GrooveLayoutEntry,
  GrooveLayoutList,
  GrooveLayoutMap,
  GrooveOrientation,
  UnknownRecord,
} from '../../types/index.js';
import {
  buildDoorVisualLookupKeys,
  isCanonicalDoorVisualMapKey,
} from './door_visual_key_contracts_shared.js';
import { formatIdentityValue, readIdentityValue } from './identity_value_shared.js';

export const DEFAULT_GROOVE_ORIENTATION: GrooveOrientation = 'vertical';
export const DEFAULT_GROOVE_DENSITY_PER_M = 20;
export const GROOVE_LAYOUT_CENTER_NORM = 0.5;
export const GROOVE_LAYOUT_CENTER_EPSILON = 1e-6;
export const GROOVE_LAYOUT_CENTER_SNAP_NORM_THRESHOLD = 0.04;
export const GROOVE_LAYOUT_MIN_SIZE_M = 0.02;
const GROOVE_LAYOUT_REMOVE_TOLERANCE_MIN_M = 0.015;
const GROOVE_LAYOUT_REMOVE_TOLERANCE_MAX_M = 0.05;

export type GrooveLayoutRect = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export type GrooveDraftInput = {
  widthCm?: unknown;
  heightCm?: unknown;
  orientation?: unknown;
};

export type ResolvedGroovePlacement = {
  widthM: number;
  heightM: number;
  centerX: number;
  centerY: number;
  centerXNorm: number;
  centerYNorm: number;
  orientation: GrooveOrientation;
};

export type GrooveLayoutHitMatch = {
  index: number;
  layout: GrooveLayoutEntry;
  placement: ResolvedGroovePlacement;
  distanceM: number;
};

type GrooveSnappedCenter = {
  centerXNorm: number;
  centerYNorm: number;
  snappedX: boolean;
  snappedY: boolean;
  isCentered: boolean;
};

export type GrooveLayoutListLookup = {
  key: string;
  layouts: GrooveLayoutList;
};

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readFinite(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const text = value.trim().replace(',', '.');
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizePositiveCm(value: unknown): number | null {
  const parsed = readFinite(value);
  return parsed != null && parsed > 0 ? parsed : null;
}

function normalizeLinesCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1
    ? Math.max(1, Math.floor(value))
    : null;
}

function normalizeCenter(value: unknown): number {
  const parsed = readFinite(value);
  if (parsed == null) return GROOVE_LAYOUT_CENTER_NORM;
  const normalized = clamp(parsed, 0, 1);
  return Math.abs(normalized - GROOVE_LAYOUT_CENTER_NORM) <= GROOVE_LAYOUT_CENTER_EPSILON
    ? GROOVE_LAYOUT_CENTER_NORM
    : normalized;
}

function buildCenterNorm(center: number, min: number, span: number): number {
  if (!(span > 0)) return GROOVE_LAYOUT_CENTER_NORM;
  return clamp((center - min) / span, 0, 1);
}

function normalizeRect(rect: GrooveLayoutRect): GrooveLayoutRect {
  return {
    minX: Math.min(rect.minX, rect.maxX),
    maxX: Math.max(rect.minX, rect.maxX),
    minY: Math.min(rect.minY, rect.maxY),
    maxY: Math.max(rect.minY, rect.maxY),
  };
}

function clampSizeM(requestedCm: number | null, span: number): number {
  if (!(span > 0)) return GROOVE_LAYOUT_MIN_SIZE_M;
  if (requestedCm == null) return span;
  return clamp(requestedCm / 100, Math.min(GROOVE_LAYOUT_MIN_SIZE_M, span), span);
}

export function readGrooveOrientation(value: unknown): GrooveOrientation {
  return value === 'horizontal' ? 'horizontal' : DEFAULT_GROOVE_ORIENTATION;
}

export function readGrooveLayoutEntry(value: unknown): GrooveLayoutEntry | null {
  if (!isRecord(value)) return null;
  const widthCm = normalizePositiveCm(value.widthCm);
  const heightCm = normalizePositiveCm(value.heightCm);
  const hasSizedLayout = widthCm != null || heightCm != null;
  const centerXNorm = normalizeCenter(value.centerXNorm);
  const centerYNorm = normalizeCenter(value.centerYNorm);
  const orientation = readGrooveOrientation(value.orientation);
  const linesCount = normalizeLinesCount(value.linesCount);
  const out: GrooveLayoutEntry = {};
  if (widthCm != null) out.widthCm = widthCm;
  if (heightCm != null) out.heightCm = heightCm;
  if (hasSizedLayout && Math.abs(centerXNorm - GROOVE_LAYOUT_CENTER_NORM) > GROOVE_LAYOUT_CENTER_EPSILON) {
    out.centerXNorm = centerXNorm;
  }
  if (hasSizedLayout && Math.abs(centerYNorm - GROOVE_LAYOUT_CENTER_NORM) > GROOVE_LAYOUT_CENTER_EPSILON) {
    out.centerYNorm = centerYNorm;
  }
  if (orientation !== DEFAULT_GROOVE_ORIENTATION) out.orientation = orientation;
  if (linesCount != null) out.linesCount = linesCount;
  return Object.keys(out).length ? out : null;
}

export function readGrooveLayoutList(value: unknown): GrooveLayoutList {
  const values = Array.isArray(value) ? value : [value];
  const out: GrooveLayoutList = [];
  for (let index = 0; index < values.length; index += 1) {
    const entry = readGrooveLayoutEntry(values[index]);
    if (entry) out.push(entry);
  }
  return out;
}

export function readCanonicalGrooveLayoutMap(value: unknown): GrooveLayoutMap {
  const out: GrooveLayoutMap = Object.create(null);
  if (!isRecord(value)) return out;
  for (const [key, rawLayouts] of Object.entries(value)) {
    if (!isCanonicalDoorVisualMapKey(key)) continue;
    const layouts = readGrooveLayoutList(rawLayouts);
    if (layouts.length) out[key] = layouts.map(layout => ({ ...layout }));
  }
  return out;
}

export function readGrooveLayoutListForPart(args: {
  map?: unknown;
  partId: unknown;
  scopedPartId?: unknown;
  preferScopedOnly?: boolean;
}): GrooveLayoutListLookup | null {
  if (!isRecord(args.map)) return null;
  const candidates: string[] = [];
  const seen = new Set<string>();
  const pushVariants = (value: unknown) => {
    const key = formatIdentityValue(readIdentityValue(value));
    if (!key) return;
    const variants = buildDoorVisualLookupKeys(key);
    for (const variant of variants) {
      if (variant && !seen.has(variant)) {
        seen.add(variant);
        candidates.push(variant);
      }
    }
  };
  pushVariants(args.scopedPartId);
  if (!args.preferScopedOnly) pushVariants(args.partId);
  for (const key of candidates) {
    const layouts = readGrooveLayoutList(args.map[key]);
    if (layouts.length) return { key, layouts };
  }
  return null;
}

export function resolveGroovePlacementInRect(args: {
  rect: GrooveLayoutRect;
  layout?: unknown;
}): ResolvedGroovePlacement {
  const rect = normalizeRect(args.rect);
  const rectWidth = Math.max(0, rect.maxX - rect.minX);
  const rectHeight = Math.max(0, rect.maxY - rect.minY);
  const layout = readGrooveLayoutEntry(args.layout);
  const widthM = clampSizeM(normalizePositiveCm(layout?.widthCm), rectWidth);
  const heightM = clampSizeM(normalizePositiveCm(layout?.heightCm), rectHeight);
  const rawCenterX = rect.minX + normalizeCenter(layout?.centerXNorm) * rectWidth;
  const rawCenterY = rect.minY + normalizeCenter(layout?.centerYNorm) * rectHeight;
  const centerX = clamp(rawCenterX, rect.minX + widthM / 2, rect.maxX - widthM / 2);
  const centerY = clamp(rawCenterY, rect.minY + heightM / 2, rect.maxY - heightM / 2);
  return {
    widthM,
    heightM,
    centerX,
    centerY,
    centerXNorm: buildCenterNorm(centerX, rect.minX, rectWidth),
    centerYNorm: buildCenterNorm(centerY, rect.minY, rectHeight),
    orientation: readGrooveOrientation(layout?.orientation),
  };
}

export function resolveGroovePlacementListInRect(args: {
  rect: GrooveLayoutRect;
  layouts?: unknown;
}): ResolvedGroovePlacement[] {
  const layouts = readGrooveLayoutList(args.layouts);
  if (!layouts.length) return [resolveGroovePlacementInRect({ rect: args.rect })];
  return layouts.map(layout => resolveGroovePlacementInRect({ rect: args.rect, layout }));
}

function buildSnappedGrooveCenterFromHit(args: {
  rect: GrooveLayoutRect;
  hitX: number;
  hitY: number;
}): GrooveSnappedCenter {
  const rect = normalizeRect(args.rect);
  const rectWidth = Math.max(0, rect.maxX - rect.minX);
  const rectHeight = Math.max(0, rect.maxY - rect.minY);
  const rawXNorm = buildCenterNorm(args.hitX, rect.minX, rectWidth);
  const rawYNorm = buildCenterNorm(args.hitY, rect.minY, rectHeight);
  const snappedX = Math.abs(rawXNorm - GROOVE_LAYOUT_CENTER_NORM) <= GROOVE_LAYOUT_CENTER_SNAP_NORM_THRESHOLD;
  const snappedY = Math.abs(rawYNorm - GROOVE_LAYOUT_CENTER_NORM) <= GROOVE_LAYOUT_CENTER_SNAP_NORM_THRESHOLD;
  return {
    centerXNorm: snappedX ? GROOVE_LAYOUT_CENTER_NORM : rawXNorm,
    centerYNorm: snappedY ? GROOVE_LAYOUT_CENTER_NORM : rawYNorm,
    snappedX,
    snappedY,
    isCentered: snappedX && snappedY,
  };
}

export function buildGrooveLayoutFromHit(args: {
  rect: GrooveLayoutRect;
  hitX: number;
  hitY: number;
  draft?: GrooveDraftInput | null;
}): GrooveLayoutEntry | null {
  const rect = normalizeRect(args.rect);
  const widthCm = normalizePositiveCm(args.draft?.widthCm);
  const heightCm = normalizePositiveCm(args.draft?.heightCm);
  const hasSizedLayout = widthCm != null || heightCm != null;
  const center = buildSnappedGrooveCenterFromHit({ rect, hitX: args.hitX, hitY: args.hitY });
  const centerXNorm = center.centerXNorm;
  const centerYNorm = center.centerYNorm;
  const orientation = readGrooveOrientation(args.draft?.orientation);
  const placement = resolveGroovePlacementInRect({
    rect,
    layout: { widthCm, heightCm, centerXNorm, centerYNorm, orientation },
  });
  const out: GrooveLayoutEntry = {};
  if (widthCm != null) out.widthCm = widthCm;
  if (heightCm != null) out.heightCm = heightCm;
  if (
    hasSizedLayout &&
    Math.abs(placement.centerXNorm - GROOVE_LAYOUT_CENTER_NORM) > GROOVE_LAYOUT_CENTER_EPSILON
  ) {
    out.centerXNorm = placement.centerXNorm;
  }
  if (
    hasSizedLayout &&
    Math.abs(placement.centerYNorm - GROOVE_LAYOUT_CENTER_NORM) > GROOVE_LAYOUT_CENTER_EPSILON
  ) {
    out.centerYNorm = placement.centerYNorm;
  }
  if (orientation !== DEFAULT_GROOVE_ORIENTATION) out.orientation = orientation;
  return Object.keys(out).length ? out : null;
}

function distanceFromPointToPlacement(
  hitX: number,
  hitY: number,
  placement: ResolvedGroovePlacement
): number {
  const minX = placement.centerX - placement.widthM / 2;
  const maxX = placement.centerX + placement.widthM / 2;
  const minY = placement.centerY - placement.heightM / 2;
  const maxY = placement.centerY + placement.heightM / 2;
  const dx = hitX < minX ? minX - hitX : hitX > maxX ? hitX - maxX : 0;
  const dy = hitY < minY ? minY - hitY : hitY > maxY ? hitY - maxY : 0;
  return Math.sqrt(dx * dx + dy * dy);
}

export function findGrooveLayoutMatchInRect(args: {
  rect: GrooveLayoutRect;
  layouts?: unknown;
  hitX: number;
  hitY: number;
}): GrooveLayoutHitMatch | null {
  const layouts = readGrooveLayoutList(args.layouts);
  let best: GrooveLayoutHitMatch | null = null;
  for (const [index, layout] of layouts.entries()) {
    const placement = resolveGroovePlacementInRect({ rect: args.rect, layout });
    const distanceM = distanceFromPointToPlacement(args.hitX, args.hitY, placement);
    const toleranceM = clamp(
      Math.min(placement.widthM, placement.heightM) * 0.05,
      GROOVE_LAYOUT_REMOVE_TOLERANCE_MIN_M,
      GROOVE_LAYOUT_REMOVE_TOLERANCE_MAX_M
    );
    if (distanceM > toleranceM) continue;
    if (!best || distanceM < best.distanceM) best = { index, layout, placement, distanceM };
  }
  return best;
}
