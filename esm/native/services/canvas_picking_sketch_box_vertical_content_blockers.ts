import {
  INTERIOR_FITTINGS_DIMENSIONS,
  MATERIAL_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { VerticalOccupancyRange } from './canvas_picking_manual_layout_sketch_vertical_stack.js';
import type {
  PickSketchBoxSegmentArgs,
  PickSketchBoxVerticalSegmentArgs,
} from './canvas_picking_manual_layout_sketch_contracts.js';
import type {
  SketchBoxSegmentState,
  SketchBoxVerticalSegmentState,
} from './canvas_picking_sketch_box_dividers.js';
import {
  readRecordArray,
  readRecordNumber,
  readRecordValue,
} from './canvas_picking_sketch_box_stack_preview_records.js';

type RecordMap = Record<string, unknown>;

export type SketchBoxVerticalContentKind = 'shelf' | 'rod' | 'storage';

export type SketchBoxVerticalContentTargetGeo = {
  centerX: number;
  innerW: number;
  innerD: number;
  innerBackZ: number;
};

export type SketchBoxSegmentLike = SketchBoxSegmentState;
export type SketchBoxVerticalSegmentLike = SketchBoxVerticalSegmentState;

export type SketchBoxVerticalContentBlocker = VerticalOccupancyRange & {
  kind: SketchBoxVerticalContentKind;
  source: 'box';
  index?: number;
  xNorm?: number;
  variant?: string | null;
  depthM?: number | null;
  heightM?: number;
};

type BuildSketchBoxVerticalContentBlockersArgs = {
  targetBox: unknown;
  targetGeo: SketchBoxVerticalContentTargetGeo;
  targetCenterY: number;
  targetHeight: number;
  woodThick: number;
  boxSegments: SketchBoxSegmentLike[];
  activeSegment: SketchBoxSegmentLike | null;
  verticalSegments: SketchBoxVerticalSegmentLike[];
  activeVerticalSegment: SketchBoxVerticalSegmentLike | null;
  pickSketchBoxSegment: (args: PickSketchBoxSegmentArgs) => SketchBoxSegmentLike | null;
  pickSketchBoxVerticalSegment?: (
    args: PickSketchBoxVerticalSegmentArgs
  ) => SketchBoxVerticalSegmentLike | null;
};

const VERTICAL_CONTENT_COLLISION_GAP_M = 0;

function readStringId(item: RecordMap, defaultId: string): string {
  const id = readRecordValue(item, 'id');
  return id != null && id !== '' ? String(id) : defaultId;
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function shelfThicknessForVariant(variant: unknown, woodThick: number): number {
  const kind = variant != null && variant !== '' ? String(variant) : 'regular';
  if (kind === 'glass') return MATERIAL_DIMENSIONS.glassShelf.thicknessM;
  if (kind === 'double') return Math.max(woodThick, woodThick * 2);
  return woodThick;
}

function normalizeStorageHeight(heightRaw: unknown, spanH: number, woodThick: number): number {
  const storageDims = INTERIOR_FITTINGS_DIMENSIONS.storage;
  const parsed = typeof heightRaw === 'number' && Number.isFinite(heightRaw) ? heightRaw : null;
  const requested = parsed != null && parsed > 0 ? parsed : storageDims.barrierHeightM;
  const minHeight = woodThick * storageDims.minHeightWoodMultiplier + storageDims.minHeightExtraM;
  const maxHeight = Math.max(minHeight, spanH);
  return Math.max(minHeight, Math.min(requested, maxHeight));
}

function hasInvalidPresentNumber(item: RecordMap, key: string): boolean {
  const raw = readRecordValue(item, key);
  return raw != null && readRecordNumber(item, key) == null;
}

function clampStorageCenter(args: {
  bottomY: number;
  topY: number;
  pad: number;
  heightM: number;
  centerY: number;
}): number {
  const half = Math.max(0.0001, args.heightM / 2);
  const lo = args.bottomY + args.pad + half;
  const hi = args.topY - args.pad - half;
  const clampedToCavity = Math.max(args.bottomY + args.pad, Math.min(args.topY - args.pad, args.centerY));
  return hi > lo ? Math.max(lo, Math.min(hi, clampedToCavity)) : clampedToCavity;
}

function pushBlocker(
  ranges: SketchBoxVerticalContentBlocker[],
  args: {
    minY: number;
    maxY: number;
    kind: SketchBoxVerticalContentBlocker['kind'];
    index: number;
    id: string;
    xNorm?: number | null;
    variant?: string | null;
    depthM?: number | null;
    heightM?: number | null;
  }
): void {
  if (!Number.isFinite(args.minY) || !Number.isFinite(args.maxY)) return;
  const minY = Math.min(args.minY, args.maxY);
  const maxY = Math.max(args.minY, args.maxY);
  if (!(maxY > minY)) return;
  ranges.push({
    minY,
    maxY,
    centerY: (minY + maxY) / 2,
    stackH: maxY - minY,
    id: args.id,
    kind: args.kind,
    source: 'box',
    index: args.index,
    xNorm: args.xNorm ?? undefined,
    variant: args.variant ?? undefined,
    depthM: args.depthM ?? undefined,
    heightM: args.heightM ?? maxY - minY,
    collisionGapM: VERTICAL_CONTENT_COLLISION_GAP_M,
    hardCollision: true,
  });
}

function itemMatchesActiveSegment(args: {
  item: RecordMap;
  targetGeo: SketchBoxVerticalContentTargetGeo;
  boxSegments: SketchBoxSegmentLike[];
  activeSegment: SketchBoxSegmentLike | null;
  pickSketchBoxSegment: (args: PickSketchBoxSegmentArgs) => SketchBoxSegmentLike | null;
}): boolean {
  if (!args.activeSegment) return true;
  if (hasInvalidPresentNumber(args.item, 'xNorm')) return false;
  const itemXNorm = readRecordNumber(args.item, 'xNorm');
  const itemSegment =
    itemXNorm != null && args.boxSegments.length
      ? args.pickSketchBoxSegment({
          segments: args.boxSegments,
          boxCenterX: args.targetGeo.centerX,
          innerW: args.targetGeo.innerW,
          xNorm: itemXNorm,
        })
      : null;
  return !itemSegment || itemSegment.index === args.activeSegment.index;
}

function itemMatchesActiveVerticalSegment(args: {
  item: RecordMap;
  verticalSegments: SketchBoxVerticalSegmentLike[];
  activeVerticalSegment: SketchBoxVerticalSegmentLike | null;
  targetCenterY: number;
  targetHeight: number;
  pickSketchBoxVerticalSegment?: (
    args: PickSketchBoxVerticalSegmentArgs
  ) => SketchBoxVerticalSegmentLike | null;
}): boolean {
  if (!args.activeVerticalSegment) return true;
  const itemYNorm = readRecordNumber(args.item, 'yNorm') ?? readRecordNumber(args.item, 'yNormC');
  if (itemYNorm == null || !args.verticalSegments.length || !args.pickSketchBoxVerticalSegment) return true;
  const itemSegment = args.pickSketchBoxVerticalSegment({
    segments: args.verticalSegments,
    boxCenterY: args.targetCenterY,
    innerH: args.targetHeight,
    yNorm: itemYNorm,
  });
  return !itemSegment || itemSegment.index === args.activeVerticalSegment.index;
}

function itemMatchesActiveCell(
  args: BuildSketchBoxVerticalContentBlockersArgs & { item: RecordMap }
): boolean {
  return (
    itemMatchesActiveSegment(args) &&
    itemMatchesActiveVerticalSegment({
      item: args.item,
      verticalSegments: args.verticalSegments,
      activeVerticalSegment: args.activeVerticalSegment,
      targetCenterY: args.targetCenterY,
      targetHeight: args.targetHeight,
      pickSketchBoxVerticalSegment: args.pickSketchBoxVerticalSegment,
    })
  );
}

export function buildSketchBoxVerticalContentBlockers(
  args: BuildSketchBoxVerticalContentBlockersArgs
): SketchBoxVerticalContentBlocker[] {
  if (!(args.targetHeight > 0)) return [];
  const bottomY = args.targetCenterY - args.targetHeight / 2;
  const topY = args.targetCenterY + args.targetHeight / 2;
  const blockers: SketchBoxVerticalContentBlocker[] = [];

  const shelves = readRecordArray(args.targetBox, 'shelves');
  for (let i = 0; i < shelves.length; i += 1) {
    const shelf = shelves[i];
    if (hasInvalidPresentNumber(shelf, 'xNorm')) continue;
    if (!itemMatchesActiveCell({ ...args, item: shelf })) continue;
    const yNorm = readRecordNumber(shelf, 'yNorm');
    if (yNorm == null) continue;
    const centerY = bottomY + clampUnit(yNorm) * args.targetHeight;
    const height = shelfThicknessForVariant(readRecordValue(shelf, 'variant'), args.woodThick);
    pushBlocker(blockers, {
      minY: centerY - height / 2,
      maxY: centerY + height / 2,
      kind: 'shelf',
      index: i,
      id: readStringId(shelf, `box_shelf_${i}`),
      xNorm: readRecordNumber(shelf, 'xNorm') ?? 0.5,
      variant: String(readRecordValue(shelf, 'variant') ?? 'regular'),
      depthM: readRecordNumber(shelf, 'depthM'),
      heightM: height,
    });
  }

  const storageBarriers = readRecordArray(args.targetBox, 'storageBarriers');
  for (let i = 0; i < storageBarriers.length; i += 1) {
    const barrier = storageBarriers[i];
    if (hasInvalidPresentNumber(barrier, 'xNorm')) continue;
    if (!itemMatchesActiveCell({ ...args, item: barrier })) continue;
    const yNorm = readRecordNumber(barrier, 'yNorm');
    if (yNorm == null) continue;
    const heightM = normalizeStorageHeight(
      readRecordValue(barrier, 'heightM') ?? readRecordValue(barrier, 'hM'),
      args.targetHeight,
      args.woodThick
    );
    const centerY = clampStorageCenter({
      bottomY,
      topY,
      pad: args.woodThick,
      heightM,
      centerY: bottomY + clampUnit(yNorm) * args.targetHeight,
    });
    pushBlocker(blockers, {
      minY: centerY - heightM / 2,
      maxY: centerY + heightM / 2,
      kind: 'storage',
      index: i,
      id: readStringId(barrier, `box_storage_${i}`),
      xNorm: readRecordNumber(barrier, 'xNorm') ?? 0.5,
      heightM,
    });
  }

  const rods = readRecordArray(args.targetBox, 'rods');
  for (let i = 0; i < rods.length; i += 1) {
    const rod = rods[i];
    if (hasInvalidPresentNumber(rod, 'xNorm')) continue;
    if (!itemMatchesActiveCell({ ...args, item: rod })) continue;
    const yNorm = readRecordNumber(rod, 'yNorm');
    if (yNorm == null) continue;
    const radius = INTERIOR_FITTINGS_DIMENSIONS.rods.radiusM;
    const centerY = bottomY + clampUnit(yNorm) * args.targetHeight;
    pushBlocker(blockers, {
      minY: centerY - radius,
      maxY: centerY + radius,
      kind: 'rod',
      index: i,
      id: readStringId(rod, `box_rod_${i}`),
      xNorm: readRecordNumber(rod, 'xNorm') ?? 0.5,
      heightM: radius * 2,
    });
  }

  return blockers.sort((a, b) => a.minY - b.minY);
}
