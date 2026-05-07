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
import {
  buildStackAwareVerticalClearanceMeasurementEntries,
  type HoverClearanceMeasurementEntry,
  type VerticalClearanceNeighborRange,
} from './canvas_picking_hover_clearance_measurements.js';
import type { PickSketchBoxSegmentArgs } from './canvas_picking_manual_layout_sketch_contracts.js';
import type { SketchBoxSegmentState } from './canvas_picking_sketch_box_dividers.js';
import type { RecordMap } from './canvas_picking_sketch_module_stack_preview_contracts.js';

type SegmentLike = SketchBoxSegmentState;

type RangeBuildContext = {
  bottomY: number;
  topY: number;
  totalHeight: number;
  pad: number;
  woodThick: number;
};

function isRecord(value: unknown): value is RecordMap {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readValue(record: unknown, key: string): unknown {
  return isRecord(record) ? record[key] : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readRecordNumber(record: unknown, key: string): number | null {
  return readNumber(readValue(record, key));
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function pushRange(
  ranges: VerticalClearanceNeighborRange[],
  minY: number,
  maxY: number,
  kind: VerticalClearanceNeighborRange['kind']
): void {
  if (!Number.isFinite(minY) || !Number.isFinite(maxY)) return;
  const lo = Math.min(minY, maxY);
  const hi = Math.max(minY, maxY);
  if (!(hi > lo)) return;
  ranges.push({ minY: lo, maxY: hi, kind });
}

function shelfThicknessForVariant(variant: unknown, woodThick: number): number {
  const kind = variant != null && variant !== '' ? String(variant) : 'regular';
  if (kind === 'glass') return MATERIAL_DIMENSIONS.glassShelf.thicknessM;
  if (kind === 'double' || kind === '') return Math.max(woodThick, woodThick * 2);
  return woodThick;
}

function readLayoutShelfState(
  cfgRef: RecordMap | null,
  info: RecordMap | null
): {
  divisions: number;
  existsAt: (index: number) => boolean;
  variantAt: (index: number) => string;
} | null {
  if (!cfgRef) return null;
  const divisionsRaw =
    readRecordNumber(info, 'gridDivisions') ??
    readRecordNumber(cfgRef, 'gridDivisions') ??
    INTERIOR_FITTINGS_DIMENSIONS.storage.gridDivisionsDefault;
  const divisions =
    Number.isFinite(divisionsRaw) && divisionsRaw > 1
      ? Math.floor(divisionsRaw)
      : INTERIOR_FITTINGS_DIMENSIONS.storage.gridDivisionsDefault;
  if (!(divisions > 1)) return null;

  const isCustom = !!readValue(cfgRef, 'isCustom');
  if (isCustom) {
    const customData = isRecord(readValue(cfgRef, 'customData')) ? readValue(cfgRef, 'customData') : null;
    const shelves = isRecord(customData) && Array.isArray(customData.shelves) ? customData.shelves : [];
    return {
      divisions,
      existsAt: index => !!shelves[index - 1],
      variantAt: () => 'double',
    };
  }

  const layoutRaw = readValue(cfgRef, 'layout');
  if (layoutRaw == null || layoutRaw === '') return null;
  const layout = String(layoutRaw);
  const braceShelvesRaw = readValue(cfgRef, 'braceShelves');
  const braceShelves = Array.isArray(braceShelvesRaw)
    ? new Set(braceShelvesRaw.map(value => Number(value)).filter(Number.isFinite))
    : new Set<number>();
  return {
    divisions,
    existsAt: index => {
      switch (layout) {
        case 'shelves':
        case 'mixed':
          return true;
        case 'hanging':
        case 'hanging_top2':
        case 'storage':
        case 'storage_shelf':
          return index === 4 || index === 5;
        case 'hanging_split':
          return index === 1 || index === 5;
        default:
          return false;
      }
    },
    variantAt: index => (braceShelves.has(index) ? 'brace' : 'double'),
  };
}

function buildModuleBaseShelfRanges(
  args: RangeBuildContext & { cfgRef: RecordMap | null; info: RecordMap | null }
): VerticalClearanceNeighborRange[] {
  const state = readLayoutShelfState(args.cfgRef, args.info);
  if (!state) return [];
  const step = args.totalHeight / state.divisions;
  const ranges: VerticalClearanceNeighborRange[] = [];
  for (let index = 1; index < state.divisions; index++) {
    if (!state.existsAt(index)) continue;
    const centerY = args.bottomY + index * step;
    const h = shelfThicknessForVariant(state.variantAt(index), args.woodThick);
    pushRange(ranges, centerY - h / 2, centerY + h / 2, 'shelf');
  }
  return ranges;
}

function buildSketchShelfRanges(
  args: RangeBuildContext & { shelves?: RecordMap[] | null }
): VerticalClearanceNeighborRange[] {
  const ranges: VerticalClearanceNeighborRange[] = [];
  const shelves = Array.isArray(args.shelves) ? args.shelves : [];
  for (const shelf of shelves) {
    const yNorm = readRecordNumber(shelf, 'yNorm');
    if (yNorm == null) continue;
    const centerY = args.bottomY + clampUnit(yNorm) * args.totalHeight;
    const h = shelfThicknessForVariant(readValue(shelf, 'variant'), args.woodThick);
    pushRange(ranges, centerY - h / 2, centerY + h / 2, 'shelf');
  }
  return ranges;
}

function buildModuleDrawerRanges(
  args: RangeBuildContext & { drawers?: RecordMap[] | null; extDrawers?: RecordMap[] | null }
): VerticalClearanceNeighborRange[] {
  const readCenterY = createManualLayoutSketchNormalizedCenterReader({
    bottomY: args.bottomY,
    totalHeight: args.totalHeight,
  });
  const ranges: VerticalClearanceNeighborRange[] = [];
  for (const range of buildManualLayoutSketchInternalDrawerBlockers({
    drawers: Array.isArray(args.drawers) ? args.drawers : [],
    bottomY: args.bottomY,
    topY: args.topY,
    pad: args.pad,
    readCenterY,
  })) {
    pushRange(ranges, range.minY, range.maxY, 'drawer');
  }
  for (const range of buildManualLayoutSketchExternalDrawerBlockers({
    extDrawers: Array.isArray(args.extDrawers) ? args.extDrawers : [],
    bottomY: args.bottomY,
    topY: args.topY,
    pad: args.pad,
    readCenterY,
  })) {
    pushRange(ranges, range.minY, range.maxY, 'drawer');
  }
  return ranges;
}

function buildStandardDrawerRanges(
  args: RangeBuildContext & { cfgRef: RecordMap | null }
): VerticalClearanceNeighborRange[] {
  if (!args.cfgRef) return [];
  const drawerDims = DRAWER_DIMENSIONS.sketch;
  const divsRaw =
    readRecordNumber(args.cfgRef, 'gridDivisions') ?? drawerDims.internalPreviewGridDivisionsFallback;
  const divisions =
    Number.isFinite(divsRaw) &&
    divsRaw >= drawerDims.internalPreviewGridDivisionsMin &&
    divsRaw <= drawerDims.internalPreviewGridDivisionsMax
      ? Math.floor(divsRaw)
      : drawerDims.internalPreviewGridDivisionsFallback;
  const gridStep = args.totalHeight / divisions;
  const targetSingleDrawerH =
    (Math.min(
      DRAWER_DIMENSIONS.internal.maxSingleDrawerHeightM,
      gridStep - drawerDims.internalPreviewSingleDrawerGapM
    ) -
      drawerDims.internalPreviewSingleDrawerGapM) /
    drawerDims.internalStackCount;
  const drawerH =
    Number.isFinite(targetSingleDrawerH) && targetSingleDrawerH > 0
      ? targetSingleDrawerH
      : drawerDims.internalPreviewDefaultSingleHeightM;
  const stackH = drawerH * drawerDims.internalStackCount + drawerDims.internalPreviewSingleDrawerGapM;
  const slots: number[] = [];
  const list = readValue(args.cfgRef, 'intDrawersList');
  if (Array.isArray(list)) {
    for (const value of list) {
      const n = Number(value);
      if (Number.isFinite(n)) slots.push(Math.floor(n));
    }
  }
  const singleSlot = readRecordNumber(args.cfgRef, 'intDrawersSlot');
  if (singleSlot != null) slots.push(Math.floor(singleSlot));
  const ranges: VerticalClearanceNeighborRange[] = [];
  const seen = new Set<number>();
  for (const slot of slots) {
    if (!Number.isFinite(slot) || slot < 1 || seen.has(slot)) continue;
    seen.add(slot);
    const baseGridY = args.bottomY + (slot - 1) * gridStep;
    const lo = args.bottomY + args.pad + stackH / 2;
    const hi = args.topY - args.pad - stackH / 2;
    const centerY =
      hi > lo
        ? Math.max(lo, Math.min(hi, baseGridY + drawerH + drawerDims.internalPreviewSingleDrawerGapM))
        : baseGridY + drawerH + drawerDims.internalPreviewSingleDrawerGapM;
    pushRange(ranges, centerY - stackH / 2, centerY + stackH / 2, 'drawer');
  }
  return ranges;
}

function buildModuleNeighborRanges(
  args: RangeBuildContext & {
    cfgRef?: RecordMap | null;
    info?: RecordMap | null;
    shelves?: RecordMap[] | null;
    drawers?: RecordMap[] | null;
    extDrawers?: RecordMap[] | null;
  }
): VerticalClearanceNeighborRange[] {
  return [
    ...buildModuleBaseShelfRanges({ ...args, cfgRef: args.cfgRef ?? null, info: args.info ?? null }),
    ...buildSketchShelfRanges(args),
    ...buildModuleDrawerRanges(args),
    ...buildStandardDrawerRanges({ ...args, cfgRef: args.cfgRef ?? null }),
  ];
}

function itemSegmentForXNorm(args: {
  item: RecordMap;
  boxSegments: SegmentLike[];
  targetGeo: { centerX: number; innerW: number };
  pickSegment: (args: PickSketchBoxSegmentArgs) => SegmentLike | null;
}): SegmentLike | null {
  const xNorm = readRecordNumber(args.item, 'xNorm');
  if (xNorm == null || !args.boxSegments.length) return null;
  return args.pickSegment({
    segments: args.boxSegments,
    boxCenterX: args.targetGeo.centerX,
    innerW: args.targetGeo.innerW,
    xNorm,
  });
}

function itemBelongsToSegment(args: {
  item: RecordMap;
  activeSegment: SegmentLike | null;
  boxSegments: SegmentLike[];
  targetGeo: { centerX: number; innerW: number };
  pickSegment: (args: PickSketchBoxSegmentArgs) => SegmentLike | null;
}): boolean {
  if (!args.activeSegment) return true;
  const itemSegment = itemSegmentForXNorm(args);
  if (!itemSegment) return true;
  return itemSegment.index === args.activeSegment.index;
}

function readRecordArray(record: unknown, key: string): RecordMap[] {
  const value = readValue(record, key);
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function buildBoxShelfRanges(
  args: RangeBuildContext & {
    targetBox: unknown;
    activeSegment: SegmentLike | null;
    boxSegments: SegmentLike[];
    targetGeo: { centerX: number; innerW: number };
    pickSegment: (args: PickSketchBoxSegmentArgs) => SegmentLike | null;
  }
): VerticalClearanceNeighborRange[] {
  const ranges: VerticalClearanceNeighborRange[] = [];
  for (const shelf of readRecordArray(args.targetBox, 'shelves')) {
    if (
      !itemBelongsToSegment({
        item: shelf,
        activeSegment: args.activeSegment,
        boxSegments: args.boxSegments,
        targetGeo: args.targetGeo,
        pickSegment: args.pickSegment,
      })
    )
      continue;
    const yNorm = readRecordNumber(shelf, 'yNorm');
    if (yNorm == null) continue;
    const centerY = args.bottomY + clampUnit(yNorm) * args.totalHeight;
    const h = shelfThicknessForVariant(readValue(shelf, 'variant'), args.woodThick);
    pushRange(ranges, centerY - h / 2, centerY + h / 2, 'shelf');
  }
  return ranges;
}

function buildBoxDrawerRanges(
  args: RangeBuildContext & {
    targetBox: unknown;
    activeSegment: SegmentLike | null;
    boxSegments: SegmentLike[];
    targetGeo: { centerX: number; innerW: number };
    pickSegment: (args: PickSketchBoxSegmentArgs) => SegmentLike | null;
  }
): VerticalClearanceNeighborRange[] {
  const readCenterY = createManualLayoutSketchNormalizedCenterReader({
    bottomY: args.bottomY,
    totalHeight: args.totalHeight,
  });
  const drawers = readRecordArray(args.targetBox, 'drawers').filter(item =>
    itemBelongsToSegment({
      item,
      activeSegment: args.activeSegment,
      boxSegments: args.boxSegments,
      targetGeo: args.targetGeo,
      pickSegment: args.pickSegment,
    })
  );
  const extDrawers = readRecordArray(args.targetBox, 'extDrawers').filter(item =>
    itemBelongsToSegment({
      item,
      activeSegment: args.activeSegment,
      boxSegments: args.boxSegments,
      targetGeo: args.targetGeo,
      pickSegment: args.pickSegment,
    })
  );
  const ranges: VerticalClearanceNeighborRange[] = [];
  for (const range of buildManualLayoutSketchInternalDrawerBlockers({
    drawers,
    bottomY: args.bottomY,
    topY: args.topY,
    pad: args.pad,
    readCenterY,
  })) {
    pushRange(ranges, range.minY, range.maxY, 'drawer');
  }
  for (const range of buildManualLayoutSketchExternalDrawerBlockers({
    extDrawers,
    bottomY: args.bottomY,
    topY: args.topY,
    pad: args.pad,
    readCenterY,
  })) {
    pushRange(ranges, range.minY, range.maxY, 'drawer');
  }
  return ranges;
}

export function buildSketchModuleStackAwareMeasurementEntries(
  args: RangeBuildContext & {
    cfgRef?: RecordMap | null;
    info?: RecordMap | null;
    shelves?: RecordMap[] | null;
    drawers?: RecordMap[] | null;
    extDrawers?: RecordMap[] | null;
    targetCenterX: number;
    targetCenterY: number;
    targetWidth: number;
    targetHeight: number;
    z?: number;
    styleKey?: 'default' | 'cell';
    textScale?: number;
  }
): HoverClearanceMeasurementEntry[] {
  return buildStackAwareVerticalClearanceMeasurementEntries({
    containerMinY: args.bottomY,
    containerMaxY: args.topY,
    targetCenterX: args.targetCenterX,
    targetCenterY: args.targetCenterY,
    targetWidth: args.targetWidth,
    targetHeight: args.targetHeight,
    neighbors: buildModuleNeighborRanges(args),
    z: args.z,
    styleKey: args.styleKey,
    textScale: args.textScale,
  });
}

export function buildSketchBoxStackAwareMeasurementEntries(
  args: RangeBuildContext & {
    neighborBottomY?: number;
    neighborTopY?: number;
    neighborTotalHeight?: number;
    neighborPad?: number;
    targetBox: unknown;
    targetGeo: { centerX: number; innerW: number };
    activeSegment: SegmentLike | null;
    boxSegments: SegmentLike[];
    pickSegment: (args: PickSketchBoxSegmentArgs) => SegmentLike | null;
    targetCenterX: number;
    targetCenterY: number;
    targetWidth: number;
    targetHeight: number;
    z?: number;
    styleKey?: 'default' | 'cell';
    textScale?: number;
  }
): HoverClearanceMeasurementEntry[] {
  const neighborContext = {
    ...args,
    bottomY: args.neighborBottomY ?? args.bottomY,
    topY: args.neighborTopY ?? args.topY,
    totalHeight: args.neighborTotalHeight ?? args.totalHeight,
    pad: args.neighborPad ?? args.pad,
  };
  return buildStackAwareVerticalClearanceMeasurementEntries({
    containerMinY: args.bottomY,
    containerMaxY: args.topY,
    targetCenterX: args.targetCenterX,
    targetCenterY: args.targetCenterY,
    targetWidth: args.targetWidth,
    targetHeight: args.targetHeight,
    neighbors: [...buildBoxShelfRanges(neighborContext), ...buildBoxDrawerRanges(neighborContext)],
    z: args.z,
    styleKey: args.styleKey,
    textScale: args.textScale,
  });
}
