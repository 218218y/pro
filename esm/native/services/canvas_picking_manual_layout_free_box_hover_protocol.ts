import type { SketchFreePlacementHostLike } from './canvas_picking_sketch_free_commit.js';
import {
  type BraceShelvesFreeBoxPlan,
  type ManualLayoutFreeBoxShelfGridPlan,
  normalizeShelfVariant,
  type PresetLayoutFreeBoxPlan,
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

export type FreeBoxCommand =
  ShelfGridFreeBoxCommand | PresetLayoutFreeBoxCommand | BraceShelvesFreeBoxCommand;

export const FREE_BOX_COMMAND_PROTOCOL_VERSION = 1 as const;
export const FREE_BOX_COMMAND_ENVELOPE_KEY = 'freeBoxCommand' as const;

export type FreeBoxCommandEnvelope = {
  version: typeof FREE_BOX_COMMAND_PROTOCOL_VERSION;
  command: FreeBoxCommand;
};

export type FreeBoxDecodeFailure =
  'missing-envelope' | 'unsupported-version' | 'invalid-command' | 'route-mismatch';

export type FreeBoxDecodeResult<T extends FreeBoxCommand = FreeBoxCommand> =
  { ok: true; value: T } | { ok: false; reason: FreeBoxDecodeFailure };

const SHELF_VARIANTS = new Set(['regular', 'double', 'glass', 'brace']);

function isRecord(value: unknown): value is RecordMap {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(record: RecordMap, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function readRequiredString(record: RecordMap, key: string): string | null {
  if (!hasOwn(record, key)) return null;
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readNullableString(record: RecordMap, key: string): string | null | undefined {
  if (!hasOwn(record, key)) return undefined;
  const value = record[key];
  if (value === null) return null;
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readFiniteNumber(record: RecordMap, key: string): number | null {
  if (!hasOwn(record, key)) return null;
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readNullablePositiveNumber(record: RecordMap, key: string): number | null | undefined {
  if (!hasOwn(record, key)) return undefined;
  const value = record[key];
  if (value === null) return null;
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

function readNullableUnitNumber(record: RecordMap, key: string): number | null | undefined {
  if (!hasOwn(record, key)) return undefined;
  const value = record[key];
  if (value === null) return null;
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1 ? value : undefined;
}

function readUnitNumber(record: RecordMap, key: string): number | null {
  const value = readFiniteNumber(record, key);
  return value != null && value >= 0 && value <= 1 ? value : null;
}

function readUnitNumberArray(record: RecordMap, key: string): number[] | null {
  if (!hasOwn(record, key) || !Array.isArray(record[key])) return null;
  const values = record[key] as unknown[];
  if (
    !values.every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1)
  ) {
    return null;
  }
  return values.slice() as number[];
}

function readCellRange(command: RecordMap): FreeBoxCellRange | null {
  const cellXNormMin = readUnitNumber(command, 'cellXNormMin');
  const cellXNormMax = readUnitNumber(command, 'cellXNormMax');
  const cellYNormMin = readUnitNumber(command, 'cellYNormMin');
  const cellYNormMax = readUnitNumber(command, 'cellYNormMax');
  const contentXNorm = readUnitNumber(command, 'contentXNorm');
  if (
    cellXNormMin == null ||
    cellXNormMax == null ||
    cellYNormMin == null ||
    cellYNormMax == null ||
    contentXNorm == null ||
    cellXNormMin > cellXNormMax ||
    cellYNormMin > cellYNormMax ||
    contentXNorm < cellXNormMin ||
    contentXNorm > cellXNormMax
  ) {
    return null;
  }
  return { cellXNormMin, cellXNormMax, cellYNormMin, cellYNormMax, contentXNorm };
}

function readVariant(record: RecordMap): ShelfGridFreeBoxCommand['variant'] | null {
  const variant = readRequiredString(record, 'variant');
  return variant && SHELF_VARIANTS.has(variant) ? (variant as ShelfGridFreeBoxCommand['variant']) : null;
}

function unitValuesStayInsideRange(values: readonly number[], min: number, max: number): boolean {
  return values.every(value => value >= min && value <= max);
}

function decodeShelfGridCommand(command: RecordMap): ShelfGridFreeBoxCommand | null {
  const boxId = readRequiredString(command, 'boxId');
  const shelfYNorms = readUnitNumberArray(command, 'shelfYNorms');
  const variant = readVariant(command);
  const depthM = readNullablePositiveNumber(command, 'depthM');
  const blockedReason = readNullableString(command, 'blockedReason');
  const cellRange = readCellRange(command);
  if (
    command.kind !== 'shelf-grid' ||
    !boxId ||
    !shelfYNorms ||
    !variant ||
    depthM === undefined ||
    blockedReason === undefined ||
    !cellRange ||
    (!blockedReason && shelfYNorms.length === 0) ||
    !unitValuesStayInsideRange(shelfYNorms, cellRange.cellYNormMin, cellRange.cellYNormMax)
  ) {
    return null;
  }
  return { kind: 'shelf-grid', boxId, shelfYNorms, variant, depthM, blockedReason, ...cellRange };
}

function decodePresetLayoutCommand(command: RecordMap): PresetLayoutFreeBoxCommand | null {
  const boxId = readRequiredString(command, 'boxId');
  const shelfYNorms = readUnitNumberArray(command, 'shelfYNorms');
  const rodYNorms = readUnitNumberArray(command, 'rodYNorms');
  const storageYNorm = readNullableUnitNumber(command, 'storageYNorm');
  const storageHeightM = readNullablePositiveNumber(command, 'storageHeightM');
  const variant = readVariant(command);
  const depthM = readNullablePositiveNumber(command, 'depthM');
  const blockedReason = readNullableString(command, 'blockedReason');
  const cellRange = readCellRange(command);
  if (
    command.kind !== 'preset-layout' ||
    !boxId ||
    !shelfYNorms ||
    !rodYNorms ||
    storageYNorm === undefined ||
    storageHeightM === undefined ||
    !variant ||
    depthM === undefined ||
    blockedReason === undefined ||
    !cellRange ||
    (!blockedReason && shelfYNorms.length === 0 && rodYNorms.length === 0 && storageYNorm === null) ||
    !unitValuesStayInsideRange(shelfYNorms, cellRange.cellYNormMin, cellRange.cellYNormMax) ||
    !unitValuesStayInsideRange(rodYNorms, cellRange.cellYNormMin, cellRange.cellYNormMax) ||
    (storageYNorm != null &&
      (storageYNorm < cellRange.cellYNormMin || storageYNorm > cellRange.cellYNormMax)) ||
    (storageYNorm === null) !== (storageHeightM === null)
  ) {
    return null;
  }
  return {
    kind: 'preset-layout',
    boxId,
    shelfYNorms,
    rodYNorms,
    storageYNorm,
    storageHeightM,
    variant,
    depthM,
    blockedReason,
    ...cellRange,
  };
}

function decodeBraceShelvesCommand(command: RecordMap): BraceShelvesFreeBoxCommand | null {
  const boxId = readRequiredString(command, 'boxId');
  const shelfId = readNullableString(command, 'shelfId');
  const shelfIdxValue = hasOwn(command, 'shelfIdx') ? command.shelfIdx : undefined;
  const shelfIdx =
    shelfIdxValue === null
      ? null
      : typeof shelfIdxValue === 'number' &&
          Number.isFinite(shelfIdxValue) &&
          Number.isInteger(shelfIdxValue) &&
          shelfIdxValue >= 0
        ? shelfIdxValue
        : undefined;
  const depthM = readNullablePositiveNumber(command, 'depthM');
  if (
    command.kind !== 'brace-shelf' ||
    !boxId ||
    shelfId === undefined ||
    shelfIdx === undefined ||
    (!shelfId && shelfIdx == null) ||
    (command.variant !== 'regular' && command.variant !== 'brace') ||
    depthM === undefined
  ) {
    return null;
  }
  return {
    kind: 'brace-shelf',
    boxId,
    shelfId,
    shelfIdx,
    variant: command.variant,
    depthM,
  };
}

function routeMatchesCommand(hoverRec: RecordMap, command: FreeBoxCommand): boolean {
  if (hoverRec.freePlacement !== true || hoverRec.op !== 'add' || hoverRec.boxId !== command.boxId)
    return false;
  if (command.kind === 'shelf-grid') {
    return (
      hoverRec.tool === 'shelf' &&
      hoverRec.kind === 'box_content_grid' &&
      hoverRec.contentKind === 'shelf_grid'
    );
  }
  if (command.kind === 'preset-layout') {
    return (
      hoverRec.tool === 'layout_preset' &&
      hoverRec.kind === 'box_content_preset' &&
      hoverRec.contentKind === 'layout_preset'
    );
  }
  return (
    hoverRec.tool === 'brace_shelves' &&
    hoverRec.kind === 'box_content_brace_shelf' &&
    hoverRec.contentKind === 'brace_shelf'
  );
}

function makeEnvelope(command: FreeBoxCommand): FreeBoxCommandEnvelope {
  return { version: FREE_BOX_COMMAND_PROTOCOL_VERSION, command };
}

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

export function decodeFreeBoxCommand(hoverRec: RecordMap): FreeBoxDecodeResult {
  const envelope = hoverRec[FREE_BOX_COMMAND_ENVELOPE_KEY];
  if (!isRecord(envelope)) return { ok: false, reason: 'missing-envelope' };
  if (envelope.version !== FREE_BOX_COMMAND_PROTOCOL_VERSION) {
    return { ok: false, reason: 'unsupported-version' };
  }
  if (!isRecord(envelope.command)) return { ok: false, reason: 'invalid-command' };

  let command: FreeBoxCommand | null = null;
  if (envelope.command.kind === 'shelf-grid') command = decodeShelfGridCommand(envelope.command);
  else if (envelope.command.kind === 'preset-layout') command = decodePresetLayoutCommand(envelope.command);
  else if (envelope.command.kind === 'brace-shelf') command = decodeBraceShelvesCommand(envelope.command);
  if (!command) return { ok: false, reason: 'invalid-command' };
  if (!routeMatchesCommand(hoverRec, command)) return { ok: false, reason: 'route-mismatch' };
  return { ok: true, value: command };
}

export function createShelfGridHoverRecord(args: {
  host: SketchFreePlacementHostLike;
  boxId: string;
  plan: ManualLayoutFreeBoxShelfGridPlan;
  shelfVariant: string;
}): RecordMap {
  const command: ShelfGridFreeBoxCommand = {
    kind: 'shelf-grid',
    boxId: args.boxId,
    shelfYNorms: args.plan.shelfYNorms.slice(),
    cellXNormMin: args.plan.cellXNormMin,
    cellXNormMax: args.plan.cellXNormMax,
    cellYNormMin: args.plan.cellYNormMin,
    cellYNormMax: args.plan.cellYNormMax,
    contentXNorm: args.plan.contentXNorm,
    variant: normalizeShelfVariant(args.shelfVariant),
    depthM: args.plan.depthM,
    blockedReason: args.plan.blockedReason,
  };
  return {
    ...createHoverBase({
      host: args.host,
      tool: 'shelf',
      kind: 'box_content_grid',
      contentKind: 'shelf_grid',
      boxId: args.boxId,
    }),
    shelfYNorms: command.shelfYNorms,
    cellXNormMin: command.cellXNormMin,
    cellXNormMax: command.cellXNormMax,
    cellYNormMin: command.cellYNormMin,
    cellYNormMax: command.cellYNormMax,
    contentXNorm: command.contentXNorm,
    variant: command.variant,
    depthM: command.depthM,
    __wpBlockedReason: command.blockedReason ?? undefined,
    [FREE_BOX_COMMAND_ENVELOPE_KEY]: makeEnvelope(command),
  };
}

export function readShelfGridFreeBoxCommand(hoverRec: RecordMap): ShelfGridFreeBoxCommand | null {
  const result = decodeFreeBoxCommand(hoverRec);
  return result.ok && result.value.kind === 'shelf-grid' ? result.value : null;
}

export function createPresetLayoutHoverRecord(args: {
  host: SketchFreePlacementHostLike;
  boxId: string;
  plan: PresetLayoutFreeBoxPlan;
}): RecordMap {
  const command: PresetLayoutFreeBoxCommand = {
    kind: 'preset-layout',
    boxId: args.boxId,
    shelfYNorms: args.plan.shelfYNorms.slice(),
    rodYNorms: args.plan.rodYNorms.slice(),
    storageYNorm: args.plan.storageYNorm,
    storageHeightM: args.plan.storageBarrier?.h ?? null,
    cellXNormMin: args.plan.cellXNormMin,
    cellXNormMax: args.plan.cellXNormMax,
    cellYNormMin: args.plan.cellYNormMin,
    cellYNormMax: args.plan.cellYNormMax,
    contentXNorm: args.plan.contentXNorm,
    variant: 'regular',
    depthM: args.plan.shelfDepthM,
    blockedReason: args.plan.blockedReason,
  };
  return {
    ...createHoverBase({
      host: args.host,
      tool: 'layout_preset',
      kind: 'box_content_preset',
      contentKind: 'layout_preset',
      boxId: args.boxId,
    }),
    layoutType: args.plan.layoutType,
    shelfYNorms: command.shelfYNorms,
    rodYNorms: command.rodYNorms,
    storageYNorm: command.storageYNorm ?? undefined,
    storageHeightM: command.storageHeightM ?? undefined,
    cellXNormMin: command.cellXNormMin,
    cellXNormMax: command.cellXNormMax,
    cellYNormMin: command.cellYNormMin,
    cellYNormMax: command.cellYNormMax,
    contentXNorm: command.contentXNorm,
    variant: command.variant,
    depthM: command.depthM,
    __wpBlockedReason: command.blockedReason ?? undefined,
    [FREE_BOX_COMMAND_ENVELOPE_KEY]: makeEnvelope(command),
  };
}

export function readPresetLayoutFreeBoxCommand(hoverRec: RecordMap): PresetLayoutFreeBoxCommand | null {
  const result = decodeFreeBoxCommand(hoverRec);
  return result.ok && result.value.kind === 'preset-layout' ? result.value : null;
}

export function createBraceShelvesHoverRecord(args: {
  host: SketchFreePlacementHostLike;
  boxId: string;
  plan: BraceShelvesFreeBoxPlan;
}): RecordMap {
  const command: BraceShelvesFreeBoxCommand = {
    kind: 'brace-shelf',
    boxId: args.boxId,
    shelfId: args.plan.shelfId,
    shelfIdx: args.plan.shelfIdx,
    variant: args.plan.nextVariant,
    depthM: args.plan.nextDepthM,
  };
  return {
    ...createHoverBase({
      host: args.host,
      tool: 'brace_shelves',
      kind: 'box_content_brace_shelf',
      contentKind: 'brace_shelf',
      boxId: args.boxId,
    }),
    shelfId: command.shelfId ?? undefined,
    shelfIdx: command.shelfIdx,
    boxYNorm: args.plan.shelfYNorm,
    contentXNorm: args.plan.contentXNorm,
    variant: command.variant,
    depthM: command.depthM,
    [FREE_BOX_COMMAND_ENVELOPE_KEY]: makeEnvelope(command),
  };
}

export function readBraceShelvesFreeBoxCommand(hoverRec: RecordMap): BraceShelvesFreeBoxCommand | null {
  const result = decodeFreeBoxCommand(hoverRec);
  return result.ok && result.value.kind === 'brace-shelf' ? result.value : null;
}
