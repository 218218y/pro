import type { SketchFreePlacementHostLike } from './canvas_picking_sketch_free_commit.js';
import {
  type BraceShelvesFreeBoxPlan,
  clampUnit,
  type ManualLayoutFreeBoxShelfGridPlan,
  normalizeBetween,
  normalizeShelfVariant,
  type PresetLayoutFreeBoxPlan,
  readRecordNumber,
  readRecordNumberArray,
  readRecordValue,
  readString,
  type RecordMap,
} from './canvas_picking_manual_layout_free_box_contracts.js';

type FreeBoxCellRange = {
  cellXNormMin: number;
  cellXNormMax: number;
  cellYNormMin: number;
  cellYNormMax: number;
  contentXNorm: number;
};

export type ShelfGridFreeBoxCommand = FreeBoxCellRange & {
  kind: 'shelf-grid';
  boxId: string;
  shelfYNorms: number[];
  variant: 'regular' | 'double' | 'glass' | 'brace';
  depthM: number | null;
  blockedReason: string | null;
};

export type PresetLayoutFreeBoxCommand = FreeBoxCellRange & {
  kind: 'preset-layout';
  boxId: string;
  shelfYNorms: number[];
  rodYNorms: number[];
  storageYNorm: number | null;
  storageHeightM: number | null;
  variant: 'regular' | 'double' | 'glass' | 'brace';
  depthM: number | null;
  blockedReason: string | null;
};

export type BraceShelvesFreeBoxCommand = {
  kind: 'brace-shelf';
  boxId: string;
  shelfId: string | null;
  shelfIdx: number | null;
  variant: 'regular' | 'brace';
  depthM: number | null;
};

function createHoverBase(args: {
  host: SketchFreePlacementHostLike;
  tool: string;
  kind: string;
  contentKind: string;
  boxId: string;
}): RecordMap {
  return {
    ts: Date.now(),
    tool: args.tool,
    moduleKey: args.host.moduleKey,
    isBottom: args.host.isBottom,
    hostModuleKey: args.host.moduleKey,
    hostIsBottom: args.host.isBottom,
    kind: args.kind,
    contentKind: args.contentKind,
    op: 'add',
    freePlacement: true,
    boxId: args.boxId,
  };
}

function readCellRange(hoverRec: RecordMap): FreeBoxCellRange {
  return {
    cellXNormMin: normalizeBetween(readRecordValue(hoverRec, 'cellXNormMin'), 0, 1, 0),
    cellXNormMax: normalizeBetween(readRecordValue(hoverRec, 'cellXNormMax'), 0, 1, 1),
    cellYNormMin: normalizeBetween(readRecordValue(hoverRec, 'cellYNormMin'), 0, 1, 0),
    cellYNormMax: normalizeBetween(readRecordValue(hoverRec, 'cellYNormMax'), 0, 1, 1),
    contentXNorm: clampUnit(readRecordNumber(hoverRec, 'contentXNorm') ?? 0.5),
  };
}

export function createShelfGridHoverRecord(args: {
  host: SketchFreePlacementHostLike;
  boxId: string;
  plan: ManualLayoutFreeBoxShelfGridPlan;
  shelfVariant: string;
}): RecordMap {
  return {
    ...createHoverBase({
      host: args.host,
      tool: 'shelf',
      kind: 'box_content_grid',
      contentKind: 'shelf_grid',
      boxId: args.boxId,
    }),
    shelfYNorms: args.plan.shelfYNorms,
    cellXNormMin: args.plan.cellXNormMin,
    cellXNormMax: args.plan.cellXNormMax,
    cellYNormMin: args.plan.cellYNormMin,
    cellYNormMax: args.plan.cellYNormMax,
    contentXNorm: args.plan.contentXNorm,
    variant: normalizeShelfVariant(args.shelfVariant),
    depthM: args.plan.depthM,
    __wpBlockedReason: args.plan.blockedReason ?? undefined,
  };
}

export function readShelfGridFreeBoxCommand(hoverRec: RecordMap): ShelfGridFreeBoxCommand | null {
  const boxId = readString(readRecordValue(hoverRec, 'boxId'));
  if (!boxId) return null;
  return {
    kind: 'shelf-grid',
    boxId,
    shelfYNorms: readRecordNumberArray(hoverRec, 'shelfYNorms').map(clampUnit),
    variant: normalizeShelfVariant(readRecordValue(hoverRec, 'variant')),
    depthM: readRecordNumber(hoverRec, 'depthM'),
    blockedReason: readString(readRecordValue(hoverRec, '__wpBlockedReason')),
    ...readCellRange(hoverRec),
  };
}

export function createPresetLayoutHoverRecord(args: {
  host: SketchFreePlacementHostLike;
  boxId: string;
  plan: PresetLayoutFreeBoxPlan;
}): RecordMap {
  return {
    ...createHoverBase({
      host: args.host,
      tool: 'layout_preset',
      kind: 'box_content_preset',
      contentKind: 'layout_preset',
      boxId: args.boxId,
    }),
    layoutType: args.plan.layoutType,
    shelfYNorms: args.plan.shelfYNorms,
    rodYNorms: args.plan.rodYNorms,
    storageYNorm: args.plan.storageYNorm ?? undefined,
    storageHeightM: args.plan.storageBarrier?.h ?? undefined,
    cellXNormMin: args.plan.cellXNormMin,
    cellXNormMax: args.plan.cellXNormMax,
    cellYNormMin: args.plan.cellYNormMin,
    cellYNormMax: args.plan.cellYNormMax,
    contentXNorm: args.plan.contentXNorm,
    variant: 'regular',
    depthM: args.plan.shelfDepthM,
    __wpBlockedReason: args.plan.blockedReason ?? undefined,
  };
}

export function readPresetLayoutFreeBoxCommand(hoverRec: RecordMap): PresetLayoutFreeBoxCommand | null {
  const boxId = readString(readRecordValue(hoverRec, 'boxId'));
  if (!boxId) return null;
  return {
    kind: 'preset-layout',
    boxId,
    shelfYNorms: readRecordNumberArray(hoverRec, 'shelfYNorms').map(clampUnit),
    rodYNorms: readRecordNumberArray(hoverRec, 'rodYNorms').map(clampUnit),
    storageYNorm: readRecordNumber(hoverRec, 'storageYNorm'),
    storageHeightM: readRecordNumber(hoverRec, 'storageHeightM'),
    variant: normalizeShelfVariant(readRecordValue(hoverRec, 'variant')),
    depthM: readRecordNumber(hoverRec, 'depthM'),
    blockedReason: readString(readRecordValue(hoverRec, '__wpBlockedReason')),
    ...readCellRange(hoverRec),
  };
}

export function createBraceShelvesHoverRecord(args: {
  host: SketchFreePlacementHostLike;
  boxId: string;
  plan: BraceShelvesFreeBoxPlan;
}): RecordMap {
  return {
    ...createHoverBase({
      host: args.host,
      tool: 'brace_shelves',
      kind: 'box_content_brace_shelf',
      contentKind: 'brace_shelf',
      boxId: args.boxId,
    }),
    shelfId: args.plan.shelfId ?? undefined,
    shelfIdx: args.plan.shelfIdx,
    boxYNorm: args.plan.shelfYNorm,
    contentXNorm: args.plan.contentXNorm,
    variant: args.plan.nextVariant,
    depthM: args.plan.nextDepthM,
  };
}

export function readBraceShelvesFreeBoxCommand(hoverRec: RecordMap): BraceShelvesFreeBoxCommand | null {
  const boxId = readString(readRecordValue(hoverRec, 'boxId'));
  if (!boxId) return null;
  const variant = normalizeShelfVariant(readRecordValue(hoverRec, 'variant'));
  return {
    kind: 'brace-shelf',
    boxId,
    shelfId: readString(readRecordValue(hoverRec, 'shelfId')),
    shelfIdx: readRecordNumber(hoverRec, 'shelfIdx'),
    variant: variant === 'brace' ? 'brace' : 'regular',
    depthM: readRecordNumber(hoverRec, 'depthM'),
  };
}
