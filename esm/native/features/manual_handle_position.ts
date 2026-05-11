import type { UnknownRecord } from '../../../types';

export const MANUAL_HANDLE_POSITION_MODE = 'manual';
export const MANUAL_HANDLE_POSITION_KEY_PREFIX = '__wp_manual_handle_position:';

export type DoorRectLike = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export type ManualHandlePosition = {
  xRatio: number;
  yRatio: number;
};

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readFinite(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function normalizeRatio(value: unknown): number | null {
  const n = readFinite(value);
  if (n == null) return null;
  return clamp01(n);
}

function normalizeRect(rect: DoorRectLike | null | undefined): DoorRectLike | null {
  if (!rect) return null;
  const minX = readFinite(rect.minX);
  const maxX = readFinite(rect.maxX);
  const minY = readFinite(rect.minY);
  const maxY = readFinite(rect.maxY);
  if (minX == null || maxX == null || minY == null || maxY == null) return null;
  const loX = Math.min(minX, maxX);
  const hiX = Math.max(minX, maxX);
  const loY = Math.min(minY, maxY);
  const hiY = Math.max(minY, maxY);
  if (!(hiX > loX) || !(hiY > loY)) return null;
  return { minX: loX, maxX: hiX, minY: loY, maxY: hiY };
}

export function manualHandlePositionKey(partId: unknown): string {
  return `${MANUAL_HANDLE_POSITION_KEY_PREFIX}${String(partId ?? '')}`;
}

export function isManualHandlePositionMode(value: unknown): boolean {
  return String(value || '') === MANUAL_HANDLE_POSITION_MODE;
}

function readManualHandlePositionString(value: string): ManualHandlePosition | null {
  const raw = value.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (isRecord(parsed)) return readManualHandlePosition(parsed);
    return null;
  } catch {
    return null;
  }
}

export function serializeManualHandlePosition(position: ManualHandlePosition): string {
  return JSON.stringify({
    xRatio: clamp01(position.xRatio),
    yRatio: clamp01(position.yRatio),
  });
}

export function readManualHandlePosition(value: unknown): ManualHandlePosition | null {
  if (typeof value === 'string') return readManualHandlePositionString(value);
  const rec = isRecord(value) ? value : null;
  if (!rec) return null;
  const xRatio = normalizeRatio(rec.xRatio);
  const yRatio = normalizeRatio(rec.yRatio);
  if (xRatio == null || yRatio == null) return null;
  return { xRatio, yRatio };
}

export function readManualHandlePositionForPart(
  handlesMap: unknown,
  partId: unknown,
  alternatePartId?: unknown
): ManualHandlePosition | null {
  const hm = isRecord(handlesMap) ? handlesMap : null;
  const pid = String(partId || '');
  if (!hm || !pid) return null;

  const direct = readManualHandlePosition(hm[manualHandlePositionKey(pid)]);
  if (direct) return direct;

  const alternate = String(alternatePartId || '');
  if (alternate && alternate !== pid) {
    return readManualHandlePosition(hm[manualHandlePositionKey(alternate)]);
  }
  return null;
}

export function createManualHandlePositionFromLocalPoint(args: {
  rect: DoorRectLike | null | undefined;
  localX: unknown;
  localY: unknown;
}): ManualHandlePosition | null {
  const rect = normalizeRect(args.rect);
  const localX = readFinite(args.localX);
  const localY = readFinite(args.localY);
  if (!rect || localX == null || localY == null) return null;
  const w = rect.maxX - rect.minX;
  const h = rect.maxY - rect.minY;
  return {
    xRatio: clamp01((localX - rect.minX) / w),
    yRatio: clamp01((localY - rect.minY) / h),
  };
}

export function resolveManualHandleLocalPosition(args: {
  rect: DoorRectLike | null | undefined;
  position: ManualHandlePosition | null | undefined;
}): { x: number; y: number } | null {
  const rect = normalizeRect(args.rect);
  const position = args.position || null;
  if (!rect || !position) return null;
  return {
    x: rect.minX + (rect.maxX - rect.minX) * clamp01(position.xRatio),
    y: rect.minY + (rect.maxY - rect.minY) * clamp01(position.yRatio),
  };
}

export function areManualHandleHeightsAligned(
  a: ManualHandlePosition | null | undefined,
  b: ManualHandlePosition | null | undefined,
  tolerance = 0.006
): boolean {
  if (!a || !b) return false;
  const ay = normalizeRatio(a.yRatio);
  const by = normalizeRatio(b.yRatio);
  if (ay == null || by == null) return false;
  return Math.abs(ay - by) <= Math.max(0, tolerance);
}
