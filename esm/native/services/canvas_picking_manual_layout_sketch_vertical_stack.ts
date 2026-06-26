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
  sketchStackFitsAvailableHeight,
} from '../features/sketch_drawer_sizing.js';
import { resolveSketchInternalDrawerCassetteRange } from '../features/sketch_internal_drawer_cassette.js';

export type VerticalOccupancyRange = {
  minY: number;
  maxY: number;
  centerY?: number;
  id?: string | null;
  count?: number;
  stackH?: number;
  collisionGapM?: number;
  hardCollision?: boolean;
  kind?: string;
  pointerMinY?: number;
  pointerMaxY?: number;
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
  relocatableHardCollisionKinds?: readonly string[];
  relocateOnCollision?: boolean;
  snapToAvailableSlot?: boolean;
}): {
  op: 'add' | 'remove' | 'blocked';
  removeId: string | null;
  centerY: number;
  range: VerticalOccupancyRange | null;
} {
  const gap =
    typeof args.gap === 'number' && Number.isFinite(args.gap) && args.gap >= 0
      ? args.gap
      : DRAWER_DIMENSIONS.sketch.verticalStackCollisionGapM;
  const pointerCenterY = args.clampCenter(args.desiredCenterY, args.selectedStackH);
  const relocateOnCollision = args.relocateOnCollision !== false;
  const sameStacks = Array.isArray(args.sameStacks) ? args.sameStacks.filter(Boolean) : [];
  const blockers = Array.isArray(args.blockers) ? args.blockers.filter(Boolean) : [];
  const occupied = sameStacks.concat(blockers);

  const readStackGap = (stack: VerticalOccupancyRange) =>
    typeof stack.collisionGapM === 'number' && Number.isFinite(stack.collisionGapM)
      ? Math.max(0, stack.collisionGapM)
      : gap;

  const containsPointer = sameStacks.filter(
    stack => pointerCenterY >= stack.minY - gap / 2 && pointerCenterY <= stack.maxY + gap / 2
  );
  if (containsPointer.length) {
    containsPointer.sort(
      (a, b) =>
        Math.abs(pointerCenterY - (a.centerY ?? (a.minY + a.maxY) / 2)) -
        Math.abs(pointerCenterY - (b.centerY ?? (b.minY + b.maxY) / 2))
    );
    const stack = containsPointer[0] || null;
    return {
      op: 'remove',
      removeId: stack?.id != null ? String(stack.id) : null,
      centerY: stack?.centerY != null ? Number(stack.centerY) : pointerCenterY,
      range: stack,
    };
  }

  const alignCenterWithinPointerSlot = (pointerY: number, stackH: number): number => {
    if (args.snapToAvailableSlot !== true || !occupied.length) return pointerY;

    const minCenter = args.clampCenter(Number.NEGATIVE_INFINITY, stackH);
    const maxCenter = args.clampCenter(Number.POSITIVE_INFINITY, stackH);
    if (!Number.isFinite(minCenter) || !Number.isFinite(maxCenter)) return pointerY;

    const freeBottomY = Math.min(minCenter, maxCenter) - stackH / 2;
    const freeTopY = Math.max(minCenter, maxCenter) + stackH / 2;
    if (!(freeTopY > freeBottomY)) return pointerY;

    const blockersByY = occupied
      .filter(
        stack =>
          Number.isFinite(stack.minY) &&
          Number.isFinite(stack.maxY) &&
          Math.max(stack.minY, stack.maxY) > freeBottomY &&
          Math.min(stack.minY, stack.maxY) < freeTopY
      )
      .slice()
      .sort((a, b) => Math.min(a.minY, a.maxY) - Math.min(b.minY, b.maxY));

    let slotBottomY = freeBottomY;
    for (const stack of blockersByY) {
      const stackMinY = Math.min(stack.minY, stack.maxY) - readStackGap(stack);
      const stackMaxY = Math.max(stack.minY, stack.maxY) + readStackGap(stack);
      if (pointerY >= stackMinY && pointerY <= stackMaxY) return pointerY;
      if (pointerY < stackMinY) {
        const slotTopY = stackMinY;
        const lo = slotBottomY + stackH / 2;
        const hi = slotTopY - stackH / 2;
        return hi >= lo ? Math.max(lo, Math.min(hi, pointerY)) : pointerY;
      }
      slotBottomY = Math.max(slotBottomY, stackMaxY);
    }

    const lo = slotBottomY + stackH / 2;
    const hi = freeTopY - stackH / 2;
    return hi >= lo ? Math.max(lo, Math.min(hi, pointerY)) : pointerY;
  };

  const desiredCenterY = alignCenterWithinPointerSlot(pointerCenterY, args.selectedStackH);

  const relocatableHardCollisionKinds = new Set(
    (args.relocatableHardCollisionKinds || []).filter(kind => typeof kind === 'string')
  );
  const canResolveAroundHardCollision = (stack: VerticalOccupancyRange) =>
    stack.kind != null && relocatableHardCollisionKinds.has(String(stack.kind));

  const touchEpsilon = 1e-9;
  const rangeOverlapsStack = (centerY: number, stackH: number, stack: VerticalOccupancyRange) => {
    const minY = centerY - stackH / 2;
    const maxY = centerY + stackH / 2;
    const stackGap = readStackGap(stack);
    return maxY > stack.minY - stackGap + touchEpsilon && minY < stack.maxY + stackGap - touchEpsilon;
  };

  const overlapsAny = (centerY: number, stackH: number) => {
    return occupied.some(stack => rangeOverlapsStack(centerY, stackH, stack));
  };

  if (
    occupied.some(
      stack =>
        stack.hardCollision === true &&
        !canResolveAroundHardCollision(stack) &&
        rangeOverlapsStack(desiredCenterY, args.selectedStackH, stack)
    )
  ) {
    return { op: 'blocked', removeId: null, centerY: desiredCenterY, range: null };
  }

  if (!overlapsAny(desiredCenterY, args.selectedStackH)) {
    return { op: 'add', removeId: null, centerY: desiredCenterY, range: null };
  }

  if (!relocateOnCollision) {
    return { op: 'blocked', removeId: null, centerY: desiredCenterY, range: null };
  }

  const candidates = [desiredCenterY];
  for (const stack of occupied) {
    const stackGap = readStackGap(stack);
    candidates.push(stack.minY - stackGap - args.selectedStackH / 2);
    candidates.push(stack.maxY + stackGap + args.selectedStackH / 2);
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

  return { op: 'blocked', removeId: null, centerY: desiredCenterY, range: null };
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
    const cassette = resolveSketchInternalDrawerCassetteRange({
      baseY: 0,
      stackH,
      woodThick: args.woodThick,
    });
    const lo = innerBottomY + cassette.woodThick + stackH / 2;
    const hi = innerTopY - cassette.woodThick - stackH / 2;
    if (!(hi > lo)) return Math.max(innerBottomY, Math.min(innerTopY, centerY));
    return Math.max(lo, Math.min(hi, centerY));
  };
  return args.drawers
    .map((item, index) => {
      const metrics = resolveSketchInternalDrawerMetrics({
        drawerHeightM: readSketchDrawerHeightMFromItem(item, DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_M),
      });
      const stackH = metrics.stackH;
      const cassette = resolveSketchInternalDrawerCassetteRange({
        baseY: 0,
        stackH,
        woodThick: args.woodThick,
      });
      if (!sketchStackFitsAvailableHeight(cassette.height, availableHeightM)) return null;
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
        minY: clampedCenterY - stackH / 2 - cassette.woodThick,
        maxY: clampedCenterY + stackH / 2 + cassette.woodThick,
        stackH: cassette.height,
        collisionGapM: 0,
        pointerMinY: clampedCenterY - stackH / 2,
        pointerMaxY: clampedCenterY + stackH / 2,
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
  const availableHeightM = Math.max(0, args.boxHeight);
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
      });
      const count = metrics.drawerCount;
      const stackH = metrics.stackH;
      if (!sketchStackFitsAvailableHeight(stackH, availableHeightM)) return null;
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
