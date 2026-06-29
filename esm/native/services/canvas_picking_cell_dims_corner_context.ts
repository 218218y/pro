import {
  CM_PER_METER,
  CORNER_WING_DIMENSIONS,
  WARDROBE_DEFAULTS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { AppContainer, UnknownRecord } from '../../../types';
import type { CanvasCornerCellDimsArgs } from './canvas_picking_cell_dims_contracts.js';
import { __wp_reportPickingIssue, __asInt } from './canvas_picking_core_helpers.js';
import { readCornerConfigurationSnapshotForStack } from '../features/modules_configuration/corner_cells_api.js';
import { readModulesConfigurationListFromConfigSnapshot } from '../features/modules_configuration/modules_config_api.js';
import { cloneSpecialDims, getActiveOverrideCm } from '../features/special_dims/index.js';
import type { SpecialDimsRecord } from '../features/special_dims/index.js';
import {
  readCanonicalIntOr,
  readCanonicalNumberOr,
  readCanonicalPositiveNumberOr,
} from './canvas_picking_cell_dims_numbers.js';
import type {
  CornerCellDimsContext,
  CornerConfigShape,
} from './canvas_picking_cell_dims_corner_contracts.js';

export function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function asRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

export function asCornerConfig(value: unknown): CornerConfigShape {
  return asRecord(value) || {};
}

export function readCornerSpecialDims(cfg: unknown): SpecialDimsRecord | null {
  const rec = asRecord(cfg);
  const dims = rec ? asRecord(rec.specialDims) : null;
  return dims || null;
}

export function readConnectorSpecialDims(cfg: unknown): SpecialDimsRecord | null {
  const rec = asRecord(cfg);
  const dims = rec ? asRecord(rec.connectorSpecialDims) : null;
  return dims || null;
}

function readPositiveSpecialDimCm(sd: unknown, key: string): number | null {
  const rec = asRecord(sd);
  if (!rec) return null;
  const n = readCanonicalPositiveNumberOr(rec[key], NaN);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function readCornerDoorsCount(ui: UnknownRecord, raw: UnknownRecord): number {
  const doors = readCanonicalIntOr(
    ui.cornerDoors,
    readCanonicalIntOr(raw.cornerDoors, WARDROBE_DEFAULTS.corner.doorsCount)
  );
  return Number.isFinite(doors) && doors > 0 ? doors : WARDROBE_DEFAULTS.corner.doorsCount;
}

function resolveAutoCornerWidthForDoors(ui: UnknownRecord, raw: UnknownRecord): number {
  const doors = readCornerDoorsCount(ui, raw);
  const perDoor = WARDROBE_DEFAULTS.byType.hinged.perDoorWidthCm;
  return Math.max(perDoor, doors * perDoor);
}

function readRootCornerConfiguration(cfg: unknown): UnknownRecord | null {
  const root = asRecord(cfg);
  if (!root) return null;
  const nested = asRecord(root.cornerConfiguration);
  return nested || root;
}

function hasTopCornerWidthSpecialDims(cfg: unknown): boolean {
  const corner = readRootCornerConfiguration(cfg);
  const sd = corner ? asRecord(corner.specialDims) : null;
  if (!sd) return false;
  return (
    readPositiveSpecialDimCm(sd, 'widthCm') != null || readPositiveSpecialDimCm(sd, 'baseWidthCm') != null
  );
}

function resolveBottomCornerWidthBase(args: {
  ui: UnknownRecord;
  raw: UnknownRecord;
  cfg: UnknownRecord;
  topCornerWidthBase: number;
}): number {
  if (hasTopCornerWidthSpecialDims(args.cfg)) return resolveAutoCornerWidthForDoors(args.ui, args.raw);
  return args.topCornerWidthBase;
}

export function readCornerModules(cfg: unknown): UnknownRecord[] {
  return readModulesConfigurationListFromConfigSnapshot(cfg, 'modulesConfiguration').map(
    item => asRecord(item) || {}
  );
}

export function cloneRecord(value: unknown): UnknownRecord {
  return { ...(asRecord(value) || {}) };
}

export function reportCornerDimsIssue(
  App: AppContainer,
  error: unknown,
  op: string,
  throttleMs = 500,
  extra?: UnknownRecord
): void {
  __wp_reportPickingIssue(
    App,
    error,
    {
      where: 'canvasPicking',
      op,
      throttleMs,
    },
    extra
  );
}

export function readStoredWidthCm(cfgCell: UnknownRecord, App: AppContainer, op: string): number | null {
  try {
    const sd0 = readCornerSpecialDims(cfgCell);
    const v = sd0 ? readCanonicalPositiveNumberOr(sd0.widthCm, NaN) : NaN;
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch (_e) {
    reportCornerDimsIssue(App, _e, op, 1000);
    return null;
  }
}

export function buildCornerCellDimsContext(args: CanvasCornerCellDimsArgs): CornerCellDimsContext {
  const {
    App,
    ui,
    cfg,
    raw,
    applyW,
    applyH,
    applyD,
    hexCellMode,
    hexCellProtrusionCm,
    hexCellDoorWidthCm,
    foundModuleIndex,
    foundPartId,
    ensureCornerCellConfigRef,
  } = args;

  const isBottomStack = args.isBottomStack === true;
  const stackKey = isBottomStack ? 'bottom' : 'top';
  const topCornerWidthBase = readCanonicalNumberOr(
    ui.cornerWidth,
    CORNER_WING_DIMENSIONS.wing.defaultWidthCm
  );
  const topCornerHeightBase = readCanonicalNumberOr(
    ui.cornerHeight,
    readCanonicalNumberOr(raw.height, WARDROBE_DEFAULTS.heightCm)
  );
  const topCornerDepthBase = readCanonicalNumberOr(
    ui.cornerDepth,
    readCanonicalNumberOr(raw.depth, WARDROBE_DEFAULTS.byType.hinged.depthCm)
  );
  const lowerCornerWidthBase = resolveBottomCornerWidthBase({
    ui,
    raw,
    cfg,
    topCornerWidthBase,
  });
  const cornerWBase = isBottomStack ? lowerCornerWidthBase : topCornerWidthBase;
  const cornerHBase = isBottomStack
    ? readCanonicalNumberOr(raw.stackSplitLowerHeight, topCornerHeightBase)
    : topCornerHeightBase;
  const cornerDBase = isBottomStack
    ? readCanonicalNumberOr(raw.stackSplitLowerDepth, topCornerDepthBase)
    : topCornerDepthBase;
  const wallLenBase = readCanonicalNumberOr(
    ui.cornerCabinetWallLenCm,
    readCanonicalNumberOr(
      ui.cornerCabinetWallLen,
      CORNER_WING_DIMENSIONS.connector.defaultWallLengthM * CM_PER_METER
    )
  );

  const cornerCfg0 = asCornerConfig(readCornerConfigurationSnapshotForStack(cfg, stackKey));
  const nextCornerCfg: CornerConfigShape = cloneRecord(cornerCfg0);
  const sd = cloneSpecialDims(readCornerSpecialDims(nextCornerCfg));
  const connSd = cloneSpecialDims(readConnectorSpecialDims(nextCornerCfg));

  const curWingW =
    readPositiveSpecialDimCm(sd, 'widthCm') ??
    getActiveOverrideCm(sd, 'widthCm', 'baseWidthCm') ??
    cornerWBase;
  const curH = getActiveOverrideCm(sd, 'heightCm', 'baseHeightCm') ?? cornerHBase;
  const curD = getActiveOverrideCm(sd, 'depthCm', 'baseDepthCm') ?? cornerDBase;
  const curWallL = getActiveOverrideCm(connSd, 'widthCm', 'baseWidthCm') ?? wallLenBase;

  const pid = typeof foundPartId === 'string' ? foundPartId : '';
  const isConnectorHit = pid === 'corner_pentagon' || pid.startsWith('corner_pent');
  const isCellKey = typeof foundModuleIndex === 'string' && foundModuleIndex.startsWith('corner:');
  const cellIdx = isCellKey ? __asInt(foundModuleIndex.slice('corner:'.length), -1) : -1;
  const isPerCellWing = isCellKey && cellIdx >= 0 && !isConnectorHit;

  return {
    App,
    stackKey,
    isBottomStack,
    ui,
    cfg,
    raw,
    applyW,
    applyH,
    applyD,
    hexCellMode,
    hexCellProtrusionCm,
    hexCellDoorWidthCm,
    foundModuleIndex,
    foundPartId,
    ensureCornerCellConfigRef,
    nextCornerCfg,
    sd,
    connSd,
    cornerWBase,
    cornerHBase,
    cornerDBase,
    wallLenBase,
    curWingW,
    curH,
    curD,
    curWallL,
    isConnectorHit,
    cellIdx,
    isPerCellWing,
  };
}
