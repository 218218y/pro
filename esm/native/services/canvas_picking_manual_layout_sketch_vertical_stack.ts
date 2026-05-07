import { asRecord } from '../runtime/record.js';
import { DRAWER_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M,
  DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_M,
  parseSketchExternalDrawersTool,
  parseSketchInternalDrawersTool,
  readSketchDrawerHeightMFromItem,
  resolveSketchExternalDrawerMetrics,
  resolveSketchInternalDrawerMetrics,
} from '../features/sketch_drawer_sizing.js';

export type VerticalOccupancyRange = {
  minY: number;
  maxY: number;
  centerY?: number;
  id?: string | null;
  count?: number;
  stackH?: number;
};

function readNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readRecordValue(record: unknown, key: string): unknown {
  const rec = asRecord<Record<string, unknown>>(record);
  return rec ? rec[key] : null;
}

function readRecordNumber(record: unknown, key: string): number | null {
  return readNumber(readRecordValue(record, key));
}

function createVerticalOccupancyRange(args: VerticalOccupancyRange): VerticalOccupancyRange {
  return args;
}

export function parseSketchExtDrawerCount(tool: string): number {
  return parseSketchExternalDrawersTool(tool)?.count ?? DRAWER_DIMENSIONS.sketch.externalCountMin;
}

export function parseSketchExtDrawerHeightM(tool: string): number {
  return parseSketchExternalDrawersTool(tool)?.drawerHeightM ?? DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M;
}

export function parseSketchIntDrawerHeightM(tool: string): number {
  return parseSketchInternalDrawersTool(tool)?.drawerHeightM ?? DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_M;
}

export function resolveSketchVerticalStackPlacement(args: {
  desiredCenterY: number;
  selectedStackH: number;
  clampCenter: (centerY: number, stackH: number) => number;
  sameStacks: VerticalOccupancyRange[];
  blockers?: VerticalOccupancyRange[];
  gap?: number;
}): { op: 'add' | 'remove'; removeId: string | null; centerY: number; range: VerticalOccupancyRange | null } {
  const gap =
    typeof args.gap === 'number' && Number.isFinite(args.gap) && args.gap >= 0
      ? args.gap
      : DRAWER_DIMENSIONS.sketch.verticalStackCollisionGapM;
  const desiredCenterY = args.clampCenter(args.desiredCenterY, args.selectedStackH);
  const sameStacks = Array.isArray(args.sameStacks) ? args.sameStacks.filter(Boolean) : [];
  const blockers = Array.isArray(args.blockers) ? args.blockers.filter(Boolean) : [];
  const occupied = sameStacks.concat(blockers);

  const containsPointer = sameStacks.filter(
    stack => desiredCenterY >= stack.minY - gap / 2 && desiredCenterY <= stack.maxY + gap / 2
  );
  if (containsPointer.length) {
    containsPointer.sort(
      (a, b) =>
        Math.abs(desiredCenterY - (a.centerY ?? (a.minY + a.maxY) / 2)) -
        Math.abs(desiredCenterY - (b.centerY ?? (b.minY + b.maxY) / 2))
    );
    const stack = containsPointer[0] || null;
    return {
      op: 'remove',
      removeId: stack?.id != null ? String(stack.id) : null,
      centerY: stack?.centerY != null ? Number(stack.centerY) : desiredCenterY,
      range: stack,
    };
  }

  const overlapsAny = (centerY: number, stackH: number) => {
    const minY = centerY - stackH / 2;
    const maxY = centerY + stackH / 2;
    return occupied.some(stack => maxY > stack.minY - gap && minY < stack.maxY + gap);
  };

  if (!overlapsAny(desiredCenterY, args.selectedStackH)) {
    return { op: 'add', removeId: null, centerY: desiredCenterY, range: null };
  }

  const candidates = [desiredCenterY];
  for (const stack of occupied) {
    candidates.push(stack.minY - gap - args.selectedStackH / 2);
    candidates.push(stack.maxY + gap + args.selectedStackH / 2);
  }

  let bestCenter: number | null = null;
  let bestDistance = Infinity;
  for (const rawCenter of candidates) {
    const centerY = args.clampCenter(rawCenter, args.selectedStackH);
    if (overlapsAny(centerY, args.selectedStackH)) continue;
    const distance = Math.abs(centerY - desiredCenterY);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestCenter = centerY;
    }
  }

  if (bestCenter != null) return { op: 'add', removeId: null, centerY: bestCenter, range: null };

  const nearest =
    sameStacks
      .slice()
      .sort(
        (a, b) =>
          Math.abs(desiredCenterY - (a.centerY ?? (a.minY + a.maxY) / 2)) -
          Math.abs(desiredCenterY - (b.centerY ?? (b.minY + b.maxY) / 2))
      )[0] || null;
  if (nearest) {
    return {
      op: 'remove',
      removeId: nearest.id != null ? String(nearest.id) : null,
      centerY: nearest.centerY != null ? Number(nearest.centerY) : desiredCenterY,
      range: nearest,
    };
  }

  return { op: 'add', removeId: null, centerY: desiredCenterY, range: null };
}

export function buildSketchInternalDrawerBlockers<T extends Record<string, unknown>>(args: {
  drawers: T[];
  boxCenterY: number;
  boxHeight: number;
  woodThick: number;
  readCenterY?: (item: T, stackH: number) => number | null;
}): VerticalOccupancyRange[] {
  const halfH = args.boxHeight / 2;
  const innerBottomY = args.boxCenterY - halfH + args.woodThick;
  const innerTopY = args.boxCenterY + halfH - args.woodThick;
  const availableHeightM = Math.max(0, innerTopY - innerBottomY);
  const clampCenter = (centerY: number, stackH: number) => {
    const lo = innerBottomY + stackH / 2;
    const hi = innerTopY - stackH / 2;
    if (!(hi > lo)) return Math.max(innerBottomY, Math.min(innerTopY, centerY));
    return Math.max(lo, Math.min(hi, centerY));
  };
  return args.drawers
    .map((item, index) => {
      const metrics = resolveSketchInternalDrawerMetrics({
        drawerHeightM: readSketchDrawerHeightMFromItem(item, DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_M),
        availableHeightM,
      });
      const stackH = metrics.stackH;
      const halfH = args.boxHeight / 2;
      const centerY = args.readCenterY
        ? args.readCenterY(item, stackH)
        : (() => {
            const yNormC = readRecordNumber(item, 'yNormC');
            const yNormBase = readRecordNumber(item, 'yNorm');
            if (yNormC != null)
              return args.boxCenterY - halfH + Math.max(0, Math.min(1, yNormC)) * args.boxHeight;
            if (yNormBase != null)
              return (
                args.boxCenterY - halfH + Math.max(0, Math.min(1, yNormBase)) * args.boxHeight + stackH / 2
              );
            return null;
          })();
      if (centerY == null) return null;
      const clampedCenterY = clampCenter(centerY, stackH);
      const idRaw = readRecordValue(item, 'id');
      return createVerticalOccupancyRange({
        id: idRaw != null && idRaw !== '' ? String(idRaw) : String(index),
        centerY: clampedCenterY,
        minY: clampedCenterY - stackH / 2,
        maxY: clampedCenterY + stackH / 2,
        stackH,
      });
    })
    .filter((item): item is VerticalOccupancyRange => !!item)
    .sort((a, b) => a.minY - b.minY);
}

export function buildSketchExternalDrawerBlockers<T extends Record<string, unknown>>(args: {
  extDrawers: T[];
  boxCenterY: number;
  boxHeight: number;
  woodThick: number;
  readCenterY?: (item: T, stackH: number) => number | null;
}): VerticalOccupancyRange[] {
  const halfH = args.boxHeight / 2;
  const innerBottomY = args.boxCenterY - halfH + args.woodThick;
  const innerTopY = args.boxCenterY + halfH - args.woodThick;
  const availableHeightM = Math.max(0, innerTopY - innerBottomY);
  const clampCenter = (centerY: number, stackH: number) => {
    const lo = innerBottomY + stackH / 2;
    const hi = innerTopY - stackH / 2;
    if (!(hi > lo)) return Math.max(innerBottomY, Math.min(innerTopY, centerY));
    return Math.max(lo, Math.min(hi, centerY));
  };
  return args.extDrawers
    .map((item, index) => {
      const countRaw = readRecordNumber(item, 'count');
      const metrics = resolveSketchExternalDrawerMetrics({
        drawerCount: countRaw,
        drawerHeightM: readSketchDrawerHeightMFromItem(item, DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M),
        availableHeightM,
      });
      const count = metrics.drawerCount;
      const stackH = metrics.stackH;
      const halfH = args.boxHeight / 2;
      const centerY = args.readCenterY
        ? args.readCenterY(item, stackH)
        : (() => {
            const yNormC = readRecordNumber(item, 'yNormC');
            const yNormBase = readRecordNumber(item, 'yNorm');
            if (yNormC != null)
              return args.boxCenterY - halfH + Math.max(0, Math.min(1, yNormC)) * args.boxHeight;
            if (yNormBase != null)
              return (
                args.boxCenterY - halfH + Math.max(0, Math.min(1, yNormBase)) * args.boxHeight + stackH / 2
              );
            return null;
          })();
      if (centerY == null) return null;
      const clampedCenterY = clampCenter(centerY, stackH);
      const idRaw = readRecordValue(item, 'id');
      return createVerticalOccupancyRange({
        id: idRaw != null && idRaw !== '' ? String(idRaw) : String(index),
        count,
        stackH,
        centerY: clampedCenterY,
        minY: clampedCenterY - stackH / 2,
        maxY: clampedCenterY + stackH / 2,
      });
    })
    .filter((item): item is VerticalOccupancyRange => !!item)
    .sort((a, b) => a.minY - b.minY);
}
