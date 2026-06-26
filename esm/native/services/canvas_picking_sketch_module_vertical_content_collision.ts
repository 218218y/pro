import {
  DRAWER_DIMENSIONS,
  INTERIOR_FITTINGS_DIMENSIONS,
  MATERIAL_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  buildManualLayoutSketchExternalDrawerBlockers,
  buildManualLayoutSketchInternalDrawerBlockers,
  createManualLayoutSketchNormalizedCenterReader,
} from './canvas_picking_manual_layout_sketch_stack_placement.js';
import type { VerticalOccupancyRange } from './canvas_picking_manual_layout_sketch_vertical_stack.js';

type RecordMap = Record<string, unknown>;

const TOUCH_EPSILON_M = 1e-9;

function isRecord(value: unknown): value is RecordMap {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readRecordValue(record: unknown, key: string): unknown {
  return isRecord(record) ? record[key] : null;
}

function readRecordArray(record: unknown, key: string): RecordMap[] {
  const value = readRecordValue(record, key);
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function readSketchExtras(cfgRef: RecordMap | null | undefined): RecordMap | null {
  const extras = readRecordValue(cfgRef, 'sketchExtras');
  return isRecord(extras) ? extras : null;
}

function resolveWoodThick(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : MATERIAL_DIMENSIONS.wood.thicknessM;
}

export function resolveSketchModuleShelfCollisionHeight(args: {
  variant?: unknown;
  woodThick?: unknown;
}): number {
  const woodThick = resolveWoodThick(args.woodThick);
  const variant = typeof args.variant === 'string' && args.variant ? args.variant : 'regular';
  if (variant === 'glass') return MATERIAL_DIMENSIONS.glassShelf.thicknessM;
  if (variant === 'double') {
    return Math.max(woodThick, woodThick * INTERIOR_FITTINGS_DIMENSIONS.shelves.doubleThicknessMultiplier);
  }
  return woodThick;
}

export function resolveSketchModuleRodCollisionHeight(): number {
  return INTERIOR_FITTINGS_DIMENSIONS.rods.radiusM * 2;
}

export function buildSketchModuleDrawerVerticalBlockers(args: {
  cfgRef?: RecordMap | null;
  drawers?: RecordMap[] | null;
  extDrawers?: RecordMap[] | null;
  bottomY: number;
  topY: number;
  totalHeight: number;
  pad: number;
}): VerticalOccupancyRange[] {
  if (!(args.topY > args.bottomY) || !(args.totalHeight > 0)) return [];
  const extras = readSketchExtras(args.cfgRef ?? null);
  const drawers = Array.isArray(args.drawers) ? args.drawers : readRecordArray(extras, 'drawers');
  const extDrawers = Array.isArray(args.extDrawers) ? args.extDrawers : readRecordArray(extras, 'extDrawers');
  if (!drawers.length && !extDrawers.length) return [];

  const readCenterY = createManualLayoutSketchNormalizedCenterReader({
    bottomY: args.bottomY,
    topY: args.topY,
    totalHeight: args.totalHeight,
    pad: args.pad,
  });

  return [
    ...buildManualLayoutSketchInternalDrawerBlockers({
      drawers,
      bottomY: args.bottomY,
      topY: args.topY,
      pad: args.pad,
      readCenterY,
    }).map(range => ({ ...range, kind: 'sketch_drawers' })),
    ...buildManualLayoutSketchExternalDrawerBlockers({
      extDrawers,
      bottomY: args.bottomY,
      topY: args.topY,
      pad: args.pad,
      readCenterY,
    }).map(range => ({ ...range, kind: 'sketch_ext_drawers' })),
  ].sort((a, b) => Math.min(a.minY, a.maxY) - Math.min(b.minY, b.maxY));
}

function clampSketchModuleVerticalContentCenterY(args: {
  bottomY: number;
  topY: number;
  pad: number;
  heightM: number;
  centerY: number;
}): number {
  const heightM = Number(args.heightM);
  const centerY = Number(args.centerY);
  const half = Number.isFinite(heightM) && heightM > 0 ? heightM / 2 : 0;
  const bottomY = Number(args.bottomY);
  const topY = Number(args.topY);
  const pad = Number.isFinite(Number(args.pad)) ? Math.max(0, Number(args.pad)) : 0;
  if (!Number.isFinite(centerY)) return centerY;
  if (!Number.isFinite(bottomY) || !Number.isFinite(topY) || !(topY > bottomY)) return centerY;

  const lo = bottomY + pad + half;
  const hi = topY - pad - half;
  if (!(hi > lo)) return Math.max(bottomY + pad, Math.min(topY - pad, centerY));
  return Math.max(lo, Math.min(hi, centerY));
}

export function resolveSketchModuleVerticalRangePlacementAgainstDrawers(args: {
  cfgRef?: RecordMap | null;
  drawers?: RecordMap[] | null;
  extDrawers?: RecordMap[] | null;
  bottomY: number;
  topY: number;
  totalHeight: number;
  pad: number;
  desiredCenterY: number;
  heightM: number;
}): { centerY: number; blocked: boolean } {
  const desiredCenterY = Number(args.desiredCenterY);
  const heightM = Number(args.heightM);
  const centerY = clampSketchModuleVerticalContentCenterY({
    bottomY: args.bottomY,
    topY: args.topY,
    pad: args.pad,
    heightM,
    centerY: desiredCenterY,
  });
  if (!Number.isFinite(centerY) || !Number.isFinite(heightM) || !(heightM > 0)) {
    return { centerY, blocked: false };
  }

  const blockers = buildSketchModuleDrawerVerticalBlockers({
    cfgRef: args.cfgRef,
    drawers: args.drawers,
    extDrawers: args.extDrawers,
    bottomY: args.bottomY,
    topY: args.topY,
    totalHeight: args.totalHeight,
    pad: args.pad,
  });
  if (!blockers.length) return { centerY, blocked: false };

  const gapDefault = DRAWER_DIMENSIONS.sketch.verticalStackCollisionGapM;
  const readStackGap = (stack: VerticalOccupancyRange): number =>
    typeof stack.collisionGapM === 'number' && Number.isFinite(stack.collisionGapM)
      ? Math.max(0, stack.collisionGapM)
      : gapDefault;
  const pointerY = centerY;
  const freeBottomY = args.bottomY + Math.max(0, args.pad);
  const freeTopY = args.topY - Math.max(0, args.pad);
  const half = heightM / 2;
  const sortedBlockers = blockers
    .filter(
      stack =>
        Number.isFinite(stack.minY) &&
        Number.isFinite(stack.maxY) &&
        Math.max(stack.minY, stack.maxY) > freeBottomY &&
        Math.min(stack.minY, stack.maxY) < freeTopY
    )
    .slice()
    .sort((a, b) => Math.min(a.minY, a.maxY) - Math.min(b.minY, b.maxY));

  const rangeOverlapsBlocker = (nextCenterY: number): boolean => {
    const minY = nextCenterY - half;
    const maxY = nextCenterY + half;
    return sortedBlockers.some(stack => {
      const stackGap = readStackGap(stack);
      const stackMinY = Math.min(stack.minY, stack.maxY) - stackGap;
      const stackMaxY = Math.max(stack.minY, stack.maxY) + stackGap;
      return maxY > stackMinY + TOUCH_EPSILON_M && minY < stackMaxY - TOUCH_EPSILON_M;
    });
  };

  const alignWithinSlot = (slotBottomY: number, slotTopY: number): number | null => {
    const lo = slotBottomY + half;
    const hi = slotTopY - half;
    if (hi < lo - TOUCH_EPSILON_M) return null;
    return Math.max(lo, Math.min(hi, pointerY));
  };

  let slotBottomY = freeBottomY;
  for (const stack of sortedBlockers) {
    const stackGap = readStackGap(stack);
    const stackMinY = Math.min(stack.minY, stack.maxY) - stackGap;
    const stackMaxY = Math.max(stack.minY, stack.maxY) + stackGap;
    const pointerMinY =
      typeof stack.pointerMinY === 'number' && Number.isFinite(stack.pointerMinY)
        ? stack.pointerMinY
        : stackMinY;
    const pointerMaxY =
      typeof stack.pointerMaxY === 'number' && Number.isFinite(stack.pointerMaxY)
        ? stack.pointerMaxY
        : stackMaxY;
    if (pointerY >= pointerMinY - TOUCH_EPSILON_M && pointerY <= pointerMaxY + TOUCH_EPSILON_M) {
      return { centerY, blocked: true };
    }
    if (pointerY < stackMinY) {
      const alignedCenterY = alignWithinSlot(slotBottomY, stackMinY);
      if (alignedCenterY == null) return { centerY, blocked: true };
      return { centerY: alignedCenterY, blocked: rangeOverlapsBlocker(alignedCenterY) };
    }
    slotBottomY = Math.max(slotBottomY, stackMaxY);
  }

  const alignedCenterY = alignWithinSlot(slotBottomY, freeTopY);
  if (alignedCenterY == null) return { centerY, blocked: true };
  return { centerY: alignedCenterY, blocked: rangeOverlapsBlocker(alignedCenterY) };
}

export function doesSketchModuleVerticalRangeCollideWithDrawers(args: {
  cfgRef?: RecordMap | null;
  drawers?: RecordMap[] | null;
  extDrawers?: RecordMap[] | null;
  bottomY: number;
  topY: number;
  totalHeight: number;
  pad: number;
  centerY: number;
  heightM: number;
}): boolean {
  const centerY = Number(args.centerY);
  const heightM = Number(args.heightM);
  if (!Number.isFinite(centerY) || !Number.isFinite(heightM) || !(heightM > 0)) return false;
  const minY = centerY - heightM / 2;
  const maxY = centerY + heightM / 2;
  const blockers = buildSketchModuleDrawerVerticalBlockers(args);
  for (const blocker of blockers) {
    const blockerMinY = Math.min(blocker.minY, blocker.maxY);
    const blockerMaxY = Math.max(blocker.minY, blocker.maxY);
    if (maxY > blockerMinY + TOUCH_EPSILON_M && minY < blockerMaxY - TOUCH_EPSILON_M) {
      return true;
    }
  }
  return false;
}
