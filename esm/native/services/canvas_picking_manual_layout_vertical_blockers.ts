import {
  INTERIOR_FITTINGS_DIMENSIONS,
  MATERIAL_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import { buildPresetBackedCustomData } from '../features/interior_layout_presets/api.js';
import type { VerticalOccupancyRange } from './canvas_picking_manual_layout_sketch_vertical_stack.js';

type RecordMap = Record<string, unknown>;

export type ManualLayoutVerticalContentBlocker = VerticalOccupancyRange & {
  kind: 'shelf' | 'storage' | 'rod';
  source: 'base' | 'sketch';
  index?: number;
};

const VERTICAL_CONTENT_COLLISION_GAP_M = 0;

type RangeContext = {
  cfgRef?: RecordMap | null;
  info?: RecordMap | null;
  shelves?: RecordMap[] | null;
  rods?: RecordMap[] | null;
  storageBarriers?: RecordMap[] | null;
  bottomY: number;
  topY: number;
  totalHeight: number;
  pad?: number;
  woodThick?: number;
};

function isRecord(value: unknown): value is RecordMap {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readValue(record: unknown, key: string): unknown {
  return isRecord(record) ? record[key] : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  return null;
}

function readRecordNumber(record: unknown, key: string): number | null {
  return readNumber(readValue(record, key));
}

function readRecordArray(record: unknown, key: string): RecordMap[] {
  const value = readValue(record, key);
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function resolveGridDivisions(cfgRef: RecordMap | null, info: RecordMap | null): number {
  const raw =
    readRecordNumber(info, 'gridDivisions') ??
    readRecordNumber(cfgRef, 'gridDivisions') ??
    INTERIOR_FITTINGS_DIMENSIONS.storage.gridDivisionsDefault;
  return Number.isFinite(raw) && raw > 1
    ? Math.floor(raw)
    : INTERIOR_FITTINGS_DIMENSIONS.storage.gridDivisionsDefault;
}

function readBraceShelfSet(cfgRef: RecordMap | null): Set<number> {
  const raw = readValue(cfgRef, 'braceShelves');
  return Array.isArray(raw)
    ? new Set(raw.filter((value): value is number => typeof value === 'number' && Number.isFinite(value)))
    : new Set<number>();
}

function readCustomData(cfgRef: RecordMap | null): RecordMap | null {
  return isRecord(readValue(cfgRef, 'customData')) ? (readValue(cfgRef, 'customData') as RecordMap) : null;
}

function readShelfVariant(args: {
  cfgRef: RecordMap | null;
  customData: RecordMap | null;
  shelfIndex: number;
}): string {
  if (readBraceShelfSet(args.cfgRef).has(args.shelfIndex)) return 'brace';
  const variants = Array.isArray(args.customData?.shelfVariants) ? args.customData.shelfVariants : [];
  const raw = variants[args.shelfIndex - 1];
  return typeof raw === 'string' && raw ? raw : 'regular';
}

function shelfThicknessForVariant(variant: unknown, woodThick: number): number {
  const kind = variant != null && variant !== '' ? String(variant) : 'regular';
  if (kind === 'glass') return MATERIAL_DIMENSIONS.glassShelf.thicknessM;
  if (kind === 'double') {
    return Math.max(woodThick, woodThick * INTERIOR_FITTINGS_DIMENSIONS.shelves.doubleThicknessMultiplier);
  }
  return woodThick;
}

function pushBlocker(
  ranges: ManualLayoutVerticalContentBlocker[],
  args: {
    minY: number;
    maxY: number;
    kind: ManualLayoutVerticalContentBlocker['kind'];
    source: ManualLayoutVerticalContentBlocker['source'];
    index?: number;
    id?: string | null;
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
    id: args.id ?? null,
    kind: args.kind,
    source: args.source,
    index: args.index,
    collisionGapM: VERTICAL_CONTENT_COLLISION_GAP_M,
    hardCollision: true,
  });
}

function readSketchExtras(cfgRef: RecordMap | null): RecordMap | null {
  return isRecord(readValue(cfgRef, 'sketchExtras'))
    ? (readValue(cfgRef, 'sketchExtras') as RecordMap)
    : null;
}

function buildBaseShelfBlockers(args: RangeContext): ManualLayoutVerticalContentBlocker[] {
  const cfgRef = args.cfgRef ?? null;
  if (!cfgRef) return [];

  const divisions = resolveGridDivisions(cfgRef, args.info ?? null);
  if (!(divisions > 1)) return [];

  const customData = readCustomData(cfgRef);
  const isCustom = readValue(cfgRef, 'isCustom') === true;
  const shelves = isCustom
    ? Array.isArray(customData?.shelves)
      ? customData.shelves
      : []
    : (() => {
        const layout = readValue(cfgRef, 'layout');
        if (layout == null || layout === '') return [];
        return buildPresetBackedCustomData(layout, divisions).shelves;
      })();
  if (!Array.isArray(shelves) || !shelves.length) return [];

  const step = args.totalHeight / divisions;
  const woodThick = resolveWoodThick(args.woodThick);
  const ranges: ManualLayoutVerticalContentBlocker[] = [];
  for (let index = 1; index < divisions; index += 1) {
    if (!shelves[index - 1]) continue;
    const centerY = args.bottomY + index * step;
    const variant = readShelfVariant({ cfgRef, customData, shelfIndex: index });
    const height = shelfThicknessForVariant(variant, woodThick);
    pushBlocker(ranges, {
      minY: centerY - height / 2,
      maxY: centerY + height / 2,
      kind: 'shelf',
      source: 'base',
      index,
      id: `base_shelf_${index}`,
    });
  }
  return ranges;
}

function buildSketchShelfBlockers(args: RangeContext): ManualLayoutVerticalContentBlocker[] {
  const extra = readSketchExtras(args.cfgRef ?? null);
  const shelves = Array.isArray(args.shelves) ? args.shelves : readRecordArray(extra, 'shelves');
  if (!shelves.length) return [];

  const woodThick = resolveWoodThick(args.woodThick);
  const ranges: ManualLayoutVerticalContentBlocker[] = [];
  for (let i = 0; i < shelves.length; i += 1) {
    const shelf = shelves[i];
    const yNorm = readRecordNumber(shelf, 'yNorm');
    if (yNorm == null) continue;
    const centerY = args.bottomY + clampUnit(yNorm) * args.totalHeight;
    const height = shelfThicknessForVariant(readValue(shelf, 'variant'), woodThick);
    const idRaw = readValue(shelf, 'id');
    pushBlocker(ranges, {
      minY: centerY - height / 2,
      maxY: centerY + height / 2,
      kind: 'shelf',
      source: 'sketch',
      index: i,
      id: idRaw != null && idRaw !== '' ? String(idRaw) : `sketch_shelf_${i}`,
    });
  }
  return ranges;
}

function hasBaseStorageBarrier(cfgRef: RecordMap | null): boolean {
  if (!cfgRef) return false;
  if (readValue(cfgRef, 'isCustom') === true) {
    return readValue(readCustomData(cfgRef), 'storage') === true;
  }
  const layout = readValue(cfgRef, 'layout');
  return layout === 'storage' || layout === 'storage_shelf';
}

function buildBaseStorageBlockers(args: RangeContext): ManualLayoutVerticalContentBlocker[] {
  if (!hasBaseStorageBarrier(args.cfgRef ?? null)) return [];
  const height = INTERIOR_FITTINGS_DIMENSIONS.storage.barrierHeightM;
  const ranges: ManualLayoutVerticalContentBlocker[] = [];
  pushBlocker(ranges, {
    minY: args.bottomY,
    maxY: args.bottomY + height,
    kind: 'storage',
    source: 'base',
    id: 'base_storage',
  });
  return ranges;
}

function clampGridIndex(value: number, divisions: number): number {
  const rounded = Math.round(value);
  if (rounded < 1) return 1;
  if (rounded > divisions) return divisions;
  return rounded;
}

function deriveRodGridIndex(rodOp: RecordMap, divisions: number): number | null {
  const rawGridIndex = readRecordNumber(rodOp, 'gridIndex');
  if (rawGridIndex != null) return clampGridIndex(rawGridIndex, divisions);

  const yFactor = readRecordNumber(rodOp, 'yFactor');
  if (yFactor == null) return null;
  return clampGridIndex(
    (yFactor * divisions) / INTERIOR_FITTINGS_DIMENSIONS.storage.gridDivisionsDefault,
    divisions
  );
}

function pushRodBlocker(
  ranges: ManualLayoutVerticalContentBlocker[],
  args: {
    centerY: number;
    source: ManualLayoutVerticalContentBlocker['source'];
    index?: number;
    id?: string | null;
  }
): void {
  const radius = INTERIOR_FITTINGS_DIMENSIONS.rods.radiusM;
  pushBlocker(ranges, {
    minY: args.centerY - radius,
    maxY: args.centerY + radius,
    kind: 'rod',
    source: args.source,
    index: args.index,
    id: args.id,
  });
}

function buildCustomBaseRodBlockers(
  args: RangeContext & {
    cfgRef: RecordMap;
    customData: RecordMap | null;
    divisions: number;
  }
): ManualLayoutVerticalContentBlocker[] {
  const customData = args.customData;
  if (!customData) return [];

  const step = args.totalHeight / args.divisions;
  if (!(step > 0)) return [];

  const rodOps = readRecordArray(customData, 'rodOps');
  const rawRods = readValue(customData, 'rods');
  const rods = Array.isArray(rawRods) ? rawRods : [];
  const coveredGridIndexes = new Set<number>();
  const ranges: ManualLayoutVerticalContentBlocker[] = [];

  for (let i = 0; i < rodOps.length; i += 1) {
    const rodOp = rodOps[i];
    const yFactor = readRecordNumber(rodOp, 'yFactor');
    if (yFactor == null) continue;
    const gridIndex = deriveRodGridIndex(rodOp, args.divisions);
    if (gridIndex != null) coveredGridIndexes.add(gridIndex);
    const yAdd = readRecordNumber(rodOp, 'yAdd') ?? 0;
    pushRodBlocker(ranges, {
      centerY: args.bottomY + yFactor * step + yAdd,
      source: 'base',
      index: gridIndex ?? undefined,
      id: gridIndex != null ? `base_rod_${gridIndex}` : `base_rod_op_${i}`,
    });
  }

  for (let index = 1; index <= args.divisions; index += 1) {
    if (coveredGridIndexes.has(index) || !rods[index - 1]) continue;
    pushRodBlocker(ranges, {
      centerY: args.bottomY + index * step + INTERIOR_FITTINGS_DIMENSIONS.rods.defaultYOffsetM,
      source: 'base',
      index,
      id: `base_rod_${index}`,
    });
  }

  return ranges;
}

function buildPresetBaseRodBlockers(
  args: RangeContext & {
    cfgRef: RecordMap;
    divisions: number;
  }
): ManualLayoutVerticalContentBlocker[] {
  const layout = readValue(args.cfgRef, 'layout');
  if (layout == null || layout === '') return [];

  const step = args.totalHeight / args.divisions;
  if (!(step > 0)) return [];

  const seeded = buildPresetBackedCustomData(layout, args.divisions);
  const rodOps = Array.isArray(seeded.rodOps) ? seeded.rodOps.filter(isRecord) : [];
  if (!rodOps.length) return [];

  const ranges: ManualLayoutVerticalContentBlocker[] = [];
  for (let i = 0; i < rodOps.length; i += 1) {
    const rodOp = rodOps[i];
    const yFactor = readRecordNumber(rodOp, 'yFactor');
    if (yFactor == null) continue;
    const yAdd = readRecordNumber(rodOp, 'yAdd') ?? 0;
    const gridIndex = deriveRodGridIndex(rodOp, args.divisions);
    pushRodBlocker(ranges, {
      centerY: args.bottomY + yFactor * step + yAdd,
      source: 'base',
      index: gridIndex ?? undefined,
      id: gridIndex != null ? `base_rod_${gridIndex}` : `base_rod_op_${i}`,
    });
  }
  return ranges;
}

function buildBaseRodBlockers(args: RangeContext): ManualLayoutVerticalContentBlocker[] {
  const cfgRef = args.cfgRef ?? null;
  if (!cfgRef) return [];

  const divisions = resolveGridDivisions(cfgRef, args.info ?? null);
  if (!(divisions > 0)) return [];

  if (readValue(cfgRef, 'isCustom') === true) {
    return buildCustomBaseRodBlockers({
      ...args,
      cfgRef,
      customData: readCustomData(cfgRef),
      divisions,
    });
  }

  return buildPresetBaseRodBlockers({ ...args, cfgRef, divisions });
}

function buildSketchRodBlockers(args: RangeContext): ManualLayoutVerticalContentBlocker[] {
  const extra = readSketchExtras(args.cfgRef ?? null);
  const rods = Array.isArray(args.rods) ? args.rods : readRecordArray(extra, 'rods');
  if (!rods.length) return [];

  const ranges: ManualLayoutVerticalContentBlocker[] = [];
  for (let i = 0; i < rods.length; i += 1) {
    const rod = rods[i];
    const yNorm = readRecordNumber(rod, 'yNorm');
    if (yNorm == null) continue;
    const idRaw = readValue(rod, 'id');
    pushRodBlocker(ranges, {
      centerY: args.bottomY + clampUnit(yNorm) * args.totalHeight,
      source: 'sketch',
      index: i,
      id: idRaw != null && idRaw !== '' ? String(idRaw) : `sketch_rod_${i}`,
    });
  }
  return ranges;
}

function normalizeStorageHeight(heightRaw: unknown, spanH: number, woodThick: number): number | null {
  const storageDims = INTERIOR_FITTINGS_DIMENSIONS.storage;
  const parsed = readNumber(heightRaw);
  if (parsed == null) return null;
  const minHeight = woodThick * storageDims.minHeightWoodMultiplier + storageDims.minHeightExtraM;
  const maxHeight = Math.max(minHeight, spanH);
  return Math.max(minHeight, Math.min(parsed, maxHeight));
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

function buildSketchStorageBlockers(args: RangeContext): ManualLayoutVerticalContentBlocker[] {
  const extra = readSketchExtras(args.cfgRef ?? null);
  const storageBarriers = Array.isArray(args.storageBarriers)
    ? args.storageBarriers
    : readRecordArray(extra, 'storageBarriers');
  if (!storageBarriers.length) return [];

  const woodThick = resolveWoodThick(args.woodThick);
  const pad = resolvePad(args.pad, woodThick);
  const ranges: ManualLayoutVerticalContentBlocker[] = [];
  for (let i = 0; i < storageBarriers.length; i += 1) {
    const barrier = storageBarriers[i];
    const yNorm = readRecordNumber(barrier, 'yNorm');
    if (yNorm == null) continue;
    const heightM = normalizeStorageHeight(
      readValue(barrier, 'heightM') ?? readValue(barrier, 'hM'),
      args.totalHeight,
      woodThick
    );
    if (heightM == null) continue;
    const centerY = clampStorageCenter({
      bottomY: args.bottomY,
      topY: args.topY,
      pad,
      heightM,
      centerY: args.bottomY + clampUnit(yNorm) * args.totalHeight,
    });
    const idRaw = readValue(barrier, 'id');
    pushBlocker(ranges, {
      minY: centerY - heightM / 2,
      maxY: centerY + heightM / 2,
      kind: 'storage',
      source: 'sketch',
      index: i,
      id: idRaw != null && idRaw !== '' ? String(idRaw) : `sketch_storage_${i}`,
    });
  }
  return ranges;
}

function resolveWoodThick(value: unknown): number {
  const parsed = readNumber(value);
  return parsed != null && parsed > 0 ? parsed : MATERIAL_DIMENSIONS.wood.thicknessM;
}

function resolvePad(value: unknown, woodThick: number): number {
  const parsed = readNumber(value);
  if (parsed != null && parsed >= 0) return parsed;
  const storageDims = INTERIOR_FITTINGS_DIMENSIONS.storage;
  return Math.min(
    storageDims.clampPadMaxM,
    Math.max(storageDims.clampPadMinM, woodThick * storageDims.clampPadWoodRatio)
  );
}

export function buildManualLayoutVerticalContentBlockers(
  args: RangeContext
): ManualLayoutVerticalContentBlocker[] {
  if (!(args.totalHeight > 0) || !(args.topY > args.bottomY)) return [];
  return [
    ...buildBaseShelfBlockers(args),
    ...buildSketchShelfBlockers(args),
    ...buildBaseStorageBlockers(args),
    ...buildSketchStorageBlockers(args),
    ...buildBaseRodBlockers(args),
    ...buildSketchRodBlockers(args),
  ].sort((a, b) => a.minY - b.minY);
}
