import type { UnknownRecord } from '../../../types';
import { readModulesConfigurationListFromConfigSnapshot } from '../features/modules_configuration/modules_config_api.js';
import { getActiveOverrideCm, getSpecialDims } from '../features/special_dims/index.js';
import {
  captureHexCellDraftComparisonSnapshot,
  hasHexCellDraftSnapshotChange,
} from '../features/hex_cell/index.js';
import { __wp_identityString } from './canvas_picking_core_support_numbers.js';
import type { ModuleKey } from './canvas_picking_hover_preview_modes_shared.js';

export type CellDimsFreeBoxStackKey = 'top' | 'bottom';

export type CellDimsFreeBoxDimensionSnapshot = Readonly<{
  activeCm: number | null;
  baseCm: number | null;
}>;

export type CellDimsFreeBoxHexSnapshot = Readonly<{
  enabled: boolean;
  protrusionCm: number | null;
  doorWidthCm: number | null;
}>;

export type CellDimsFreeBoxState = Readonly<{
  id: string;
  centerX: number;
  centerY: number;
  widthM: number | null;
  heightM: number;
  depthM: number | null;
  width: CellDimsFreeBoxDimensionSnapshot;
  height: CellDimsFreeBoxDimensionSnapshot;
  depth: CellDimsFreeBoxDimensionSnapshot;
  hexCell: CellDimsFreeBoxHexSnapshot;
}>;

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function positiveNumber(value: unknown): number | null {
  const number = finiteNumber(value);
  return number != null && number > 0 ? number : null;
}

function readDimensionSnapshot(
  specialDims: ReturnType<typeof getSpecialDims>,
  key: 'widthCm' | 'heightCm' | 'depthCm',
  baseKey: 'baseWidthCm' | 'baseHeightCm' | 'baseDepthCm'
): CellDimsFreeBoxDimensionSnapshot {
  const base = positiveNumber(specialDims?.[baseKey]);
  return Object.freeze({
    activeCm: getActiveOverrideCm(specialDims, key, baseKey),
    baseCm: base,
  });
}

function readHexSnapshot(box: UnknownRecord): CellDimsFreeBoxHexSnapshot {
  return captureHexCellDraftComparisonSnapshot(box);
}

function readFreePlacementBoxes(moduleConfig: unknown): UnknownRecord[] {
  const boxes = asRecord(asRecord(moduleConfig)?.sketchExtras)?.boxes;
  if (!Array.isArray(boxes)) return [];
  return boxes
    .map(item => asRecord(item))
    .filter((item): item is UnknownRecord => !!item && item.freePlacement === true);
}

function findFreePlacementBoxById(boxes: readonly UnknownRecord[], boxId: string): UnknownRecord | null {
  for (const [index, box] of boxes.entries()) {
    const id = __wp_identityString(box.id) || __wp_identityString(index);
    if (id === boxId) return box;
  }
  return null;
}

function readModuleConfig(
  configSnapshot: unknown,
  moduleKey: ModuleKey,
  stackKey: CellDimsFreeBoxStackKey
): unknown {
  if (typeof moduleKey !== 'number') return null;
  const bucket = stackKey === 'bottom' ? 'stackSplitLowerModulesConfiguration' : 'modulesConfiguration';
  const list = readModulesConfigurationListFromConfigSnapshot(configSnapshot, bucket);
  return list[Math.max(0, Math.floor(moduleKey))] ?? null;
}

export function captureCellDimsFreeBoxState(args: {
  configSnapshot: unknown;
  moduleKey: ModuleKey;
  stackKey: CellDimsFreeBoxStackKey;
  boxId: string;
}): CellDimsFreeBoxState | null {
  try {
    const moduleConfig = readModuleConfig(args.configSnapshot, args.moduleKey, args.stackKey);
    const box = findFreePlacementBoxById(readFreePlacementBoxes(moduleConfig), args.boxId);
    if (!box) return null;

    const centerX = finiteNumber(box.absX);
    const centerY = finiteNumber(box.absY);
    const heightM = positiveNumber(box.heightM) ?? positiveNumber(box.hM);
    if (centerX == null || centerY == null || heightM == null) return null;

    const specialDims = getSpecialDims(box);
    return Object.freeze({
      id: args.boxId,
      centerX,
      centerY,
      widthM: positiveNumber(box.widthM) ?? positiveNumber(box.wM),
      heightM,
      depthM: positiveNumber(box.depthM) ?? positiveNumber(box.dM),
      width: readDimensionSnapshot(specialDims, 'widthCm', 'baseWidthCm'),
      height: readDimensionSnapshot(specialDims, 'heightCm', 'baseHeightCm'),
      depth: readDimensionSnapshot(specialDims, 'depthCm', 'baseDepthCm'),
      hexCell: readHexSnapshot(box),
    });
  } catch {
    return null;
  }
}

export function hasCellDimsFreeBoxHexDraftChange(args: {
  state: CellDimsFreeBoxState;
  protrusionCm?: number | null;
  doorWidthCm?: number | null;
  moduleWidthCm: number;
  toleranceCm: number;
}): boolean {
  return hasHexCellDraftSnapshotChange({
    snapshot: args.state.hexCell,
    ...(args.protrusionCm !== undefined ? { protrusionCm: args.protrusionCm } : {}),
    ...(args.doorWidthCm !== undefined ? { doorWidthCm: args.doorWidthCm } : {}),
    moduleWidthCm: args.moduleWidthCm,
    toleranceCm: args.toleranceCm,
  });
}

function isNullableFiniteNumber(value: unknown): boolean {
  return value == null || finiteNumber(value) != null;
}

function isDimensionSnapshot(value: unknown): boolean {
  const record = asRecord(value);
  return !!record && isNullableFiniteNumber(record.activeCm) && isNullableFiniteNumber(record.baseCm);
}

function isHexSnapshot(value: unknown): boolean {
  const record = asRecord(value);
  return (
    !!record &&
    typeof record.enabled === 'boolean' &&
    isNullableFiniteNumber(record.protrusionCm) &&
    isNullableFiniteNumber(record.doorWidthCm)
  );
}

export function isCellDimsFreeBoxState(value: unknown): value is CellDimsFreeBoxState {
  const record = asRecord(value);
  if (!record) return false;
  return (
    typeof record.id === 'string' &&
    finiteNumber(record.centerX) != null &&
    finiteNumber(record.centerY) != null &&
    (record.widthM == null || positiveNumber(record.widthM) != null) &&
    positiveNumber(record.heightM) != null &&
    (record.depthM == null || positiveNumber(record.depthM) != null) &&
    isDimensionSnapshot(record.width) &&
    isDimensionSnapshot(record.height) &&
    isDimensionSnapshot(record.depth) &&
    isHexSnapshot(record.hexCell)
  );
}
