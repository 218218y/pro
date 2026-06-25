import type { AppContainer, ModuleConfigLike, UnknownRecord } from '../../../types';

import { SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  assignHexCellToConfig,
  clearHexCellFromConfig,
  hasHexCellDraftConfigChange,
  moduleHasHexCell,
  resolveHexCellUpdateConfig,
  HEX_CELL_WITH_DRAWERS_BLOCKED_MESSAGE,
  shouldBlockHexCellApplyOverDrawers,
} from '../features/hex_cell/index.js';
import {
  applyOverrideToSpecialDims,
  assignSpecialDimsToConfig,
  cloneSpecialDims,
  getActiveOverrideCm,
  type SpecialDimsBaseKey,
  type SpecialDimsKey,
} from '../features/special_dims/index.js';
import {
  BASE_LEG_STAGE_SPECIAL_DIMS_APPLY_BLOCKED_MESSAGE,
  isBaseLegStageUiState,
  willHeightDepthTargetCreateActiveSpecialOverride,
} from '../features/base_leg_stage_special_dims_guard.js';
import { getModulesActions } from '../runtime/actions_access_domains.js';
import {
  ensureSketchModuleBoxes,
  findSketchModuleBoxById,
} from './canvas_picking_sketch_box_content_commit.js';
import { __wp_toModuleKey, __wp_toast } from './canvas_picking_core_helpers.js';
import { readCellDimsFreeBoxIdFromPartId } from './canvas_picking_cell_dims_free_box_identity.js';
import { readToastFn } from './canvas_picking_cell_dims_linear_shared.js';
import { createCanvasPickingModulesStructuralPatchMeta } from './canvas_picking_modules_patch_meta.js';

export type CanvasFreeBoxCellDimsArgs = {
  App: AppContainer;
  foundModuleIndex: string | number;
  foundPartId: string | null;
  isBottomStack?: boolean;
  hitUserData?: UnknownRecord | null;
  ui?: UnknownRecord | null;
  applyW: number | null;
  applyH: number | null;
  applyD: number | null;
  hexCellMode?: boolean;
  hexCellProtrusionCm?: number | null;
  hexCellDoorWidthCm?: number | null;
};

type SketchBoxLike = UnknownRecord;

type DimSpec = {
  label: 'width' | 'height' | 'depth';
  valueKey: 'widthM' | 'heightM' | 'depthM';
  alternateKey?: 'wM' | 'hM' | 'dM';
  specialKey: SpecialDimsKey;
  baseKey: SpecialDimsBaseKey;
  applyValueCm: number | null;
};

const EPS_CM = 1e-6;
const EPS_M = 1e-6;

function readString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function readPositiveM(record: UnknownRecord, key: string): number | null {
  const value = record[key];
  const n = typeof value === 'number' ? value : value != null ? Number(value) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

function readDimensionCm(box: SketchBoxLike, spec: DimSpec): number | null {
  const direct = readPositiveM(box, spec.valueKey);
  if (direct != null) return direct * 100;
  const alternate = spec.alternateKey ? readPositiveM(box, spec.alternateKey) : null;
  return alternate != null ? alternate * 100 : null;
}

function writeDimensionCm(box: SketchBoxLike, spec: DimSpec, valueCm: number): void {
  if (!Number.isFinite(valueCm) || valueCm <= 0) return;
  box[spec.valueKey] = Math.round((valueCm / 100) * 10000) / 10000;
}

function readNumberValue(value: unknown): number | null {
  const n = typeof value === 'number' ? value : value != null ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

function readDimensionM(box: SketchBoxLike, spec: DimSpec): number | null {
  const direct = readPositiveM(box, spec.valueKey);
  if (direct != null) return direct;
  return spec.alternateKey ? readPositiveM(box, spec.alternateKey) : null;
}

function resolveFreeBoxWorkspacePad(boxHeightM: number): number {
  const dims = SKETCH_BOX_DIMENSIONS.freePlacement;
  return Math.min(
    dims.workspaceClampPadMaxM,
    Math.max(dims.workspaceClampPadMinM, boxHeightM * dims.workspaceClampPadHeightRatio)
  );
}

function clampFreeBoxAboveRoomFloorAfterHeightChange(args: {
  box: SketchBoxLike;
  heightSpec: DimSpec;
  oldHeightM: number | null;
}): boolean {
  const { box, heightSpec, oldHeightM } = args;
  const centerY = readNumberValue(box.absY);
  const newHeightM = readDimensionM(box, heightSpec);
  if (centerY == null || newHeightM == null || !(newHeightM > 0)) return false;

  const roomFloorY = SKETCH_BOX_DIMENSIONS.freePlacement.roomFloorY;
  const newPad = resolveFreeBoxWorkspacePad(newHeightM);
  const newFloorCenterY = roomFloorY + newPad + newHeightM / 2;
  const oldPad = oldHeightM != null && oldHeightM > 0 ? resolveFreeBoxWorkspacePad(oldHeightM) : newPad;
  const oldBottomY = oldHeightM != null && oldHeightM > 0 ? centerY - oldHeightM / 2 : null;
  const wasFloorAligned = oldBottomY != null && oldBottomY <= roomFloorY + oldPad + EPS_M;
  const newBottomY = centerY - newHeightM / 2;

  if (!wasFloorAligned && newBottomY >= roomFloorY + newPad - EPS_M) return false;

  const nextCenterY = newFloorCenterY;
  if (Math.abs(nextCenterY - centerY) <= EPS_M) return false;
  box.absY = Math.round(nextCenterY * 10000) / 10000;
  return true;
}

function shiftStoredDividerFrontZ(value: unknown, deltaDepthM: number): unknown {
  const frontZ = readNumberValue(value);
  if (frontZ == null) return value;
  return Math.round((frontZ + deltaDepthM) * 10000) / 10000;
}

function shiftStoredFreeBoxDividerFronts(box: SketchBoxLike, deltaDepthM: number): boolean {
  if (!Number.isFinite(deltaDepthM) || Math.abs(deltaDepthM) <= EPS_M) return false;
  let changed = false;
  for (const key of ['dividers', 'horizontalDividers']) {
    const items = box[key];
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const rec = item as UnknownRecord;
      if (rec.frontZ == null) continue;
      const nextFrontZ = shiftStoredDividerFrontZ(rec.frontZ, deltaDepthM);
      if (nextFrontZ !== rec.frontZ) {
        rec.frontZ = nextFrontZ;
        changed = true;
      }
    }
  }
  return changed;
}

function readHitBoxId(args: CanvasFreeBoxCellDimsArgs): string | null {
  const fromUserData = readString(args.hitUserData?.__wpSketchBoxId);
  if (fromUserData) return fromUserData;

  const partId = readString(args.foundPartId);
  if (!partId || !partId.startsWith('sketch_box_free_')) return null;

  const moduleKey = resolveModuleKey(args);
  return readCellDimsFreeBoxIdFromPartId(partId, moduleKey);
}

function isFreeBoxHit(args: CanvasFreeBoxCellDimsArgs): boolean {
  if (args.hitUserData?.__wpSketchFreePlacement === true) return true;
  const partId = readString(args.foundPartId);
  return !!partId && partId.startsWith('sketch_box_free_');
}

function wouldBoxDimensionCreateActiveSpecialOverride(box: SketchBoxLike, spec: DimSpec): boolean {
  const target = spec.applyValueCm;
  if (target == null || !Number.isFinite(target) || target <= 0) return false;

  const current = readDimensionCm(box, spec);
  if (current == null || !Number.isFinite(current) || current <= 0) return false;

  const sd = cloneSpecialDims(box.specialDims);
  const active = getActiveOverrideCm(sd, spec.specialKey, spec.baseKey);
  const toggledBack = active != null && Math.abs(target - active) <= EPS_CM;
  const baseValue = readPositiveSpecialBaseCm(sd, spec.baseKey) ?? current;

  return willHeightDepthTargetCreateActiveSpecialOverride({
    targetCm: target,
    baseCm: baseValue,
    toggledBack,
  });
}

function readPositiveSpecialBaseCm(sd: unknown, key: SpecialDimsBaseKey): number | null {
  const value = sd && typeof sd === 'object' && !Array.isArray(sd) ? (sd as UnknownRecord)[key] : undefined;
  const n = typeof value === 'number' ? value : value != null ? Number(value) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

function shouldBlockFreeBoxHeightDepthByBaseLegStage(args: {
  ui: unknown;
  box: SketchBoxLike;
  heightSpec: DimSpec;
  depthSpec: DimSpec;
}): boolean {
  if (!isBaseLegStageUiState(args.ui)) return false;
  return (
    wouldBoxDimensionCreateActiveSpecialOverride(args.box, args.heightSpec) ||
    wouldBoxDimensionCreateActiveSpecialOverride(args.box, args.depthSpec)
  );
}

function applyBoxDimension(box: SketchBoxLike, spec: DimSpec): boolean {
  const target = spec.applyValueCm;
  if (target == null || !Number.isFinite(target) || target <= 0) return false;

  const current = readDimensionCm(box, spec);
  if (current == null || !Number.isFinite(current) || current <= 0) return false;

  const sd = cloneSpecialDims(box.specialDims);
  const active = getActiveOverrideCm(sd, spec.specialKey, spec.baseKey);
  const toggledBack = active != null && Math.abs(target - active) <= EPS_CM;
  const nextValue = toggledBack ? Number(sd[spec.baseKey]) || current : target;

  applyOverrideToSpecialDims({
    sd,
    key: spec.specialKey,
    baseKey: spec.baseKey,
    baseValueCm: current,
    targetValueCm: target,
    toggledBack,
  });
  assignSpecialDimsToConfig(box, sd);
  writeDimensionCm(box, spec, nextValue);
  return Math.abs(nextValue - current) > EPS_CM || toggledBack || target !== current;
}

function hasDimensionDraftChange(args: { box: SketchBoxLike; specs: DimSpec[] }): boolean {
  for (const spec of args.specs) {
    const target = spec.applyValueCm;
    if (target == null || !Number.isFinite(target) || target <= 0) continue;
    const current = readDimensionCm(args.box, spec);
    if (current == null || Math.abs(target - current) > EPS_CM) return true;
    const active = getActiveOverrideCm(args.box.specialDims, spec.specialKey, spec.baseKey);
    if (active != null && Math.abs(target - active) <= EPS_CM) return true;
  }
  return false;
}

function resolveModuleKey(args: CanvasFreeBoxCellDimsArgs): number | 'corner' | `corner:${number}` | null {
  const fromUserData = args.hitUserData?.__wpSketchModuleKey ?? args.hitUserData?.moduleIndex;
  const userKey = __wp_toModuleKey(fromUserData as never);
  if (userKey != null) return userKey;
  return __wp_toModuleKey(args.foundModuleIndex as never);
}

function emitToast(App: AppContainer, message: string): void {
  const fn = readToastFn(App);
  if (typeof fn === 'function') fn(message, true);
}

function updateFreeBox(args: {
  cfg: ModuleConfigLike | UnknownRecord;
  boxId: string;
  clickArgs: CanvasFreeBoxCellDimsArgs;
}): { changed: boolean; removedHex: boolean; appliedHex: boolean } {
  const boxes = ensureSketchModuleBoxes(args.cfg as UnknownRecord);
  const box = findSketchModuleBoxById(boxes, args.boxId, { freePlacement: true }) as SketchBoxLike | null;
  if (!box) return { changed: false, removedHex: false, appliedHex: false };

  const specs: DimSpec[] = [
    {
      label: 'width',
      valueKey: 'widthM',
      alternateKey: 'wM',
      specialKey: 'widthCm',
      baseKey: 'baseWidthCm',
      applyValueCm: args.clickArgs.applyW,
    },
    {
      label: 'height',
      valueKey: 'heightM',
      alternateKey: 'hM',
      specialKey: 'heightCm',
      baseKey: 'baseHeightCm',
      applyValueCm: args.clickArgs.applyH,
    },
    {
      label: 'depth',
      valueKey: 'depthM',
      alternateKey: 'dM',
      specialKey: 'depthCm',
      baseKey: 'baseDepthCm',
      applyValueCm: args.clickArgs.applyD,
    },
  ];
  const heightSpec = specs[1];
  const depthSpec = specs[2];
  const oldHeightM = readDimensionM(box, heightSpec);
  const oldDepthM = readDimensionM(box, depthSpec);

  if (
    shouldBlockFreeBoxHeightDepthByBaseLegStage({
      ui: args.clickArgs.ui,
      box,
      heightSpec,
      depthSpec,
    })
  ) {
    __wp_toast(args.clickArgs.App, BASE_LEG_STAGE_SPECIAL_DIMS_APPLY_BLOCKED_MESSAGE, 'error');
    return { changed: false, removedHex: false, appliedHex: false };
  }

  const hasDimChange = hasDimensionDraftChange({ box, specs });
  let changed = false;
  let removedHex = false;
  let appliedHex = false;

  if (args.clickArgs.hexCellMode) {
    const moduleWidthCm = args.clickArgs.applyW ?? readDimensionCm(box, specs[0]) ?? 0;
    const removeHex =
      moduleHasHexCell(box) &&
      !hasDimChange &&
      !hasHexCellDraftConfigChange({
        cfgMod: box,
        protrusionCm: args.clickArgs.hexCellProtrusionCm,
        doorWidthCm: args.clickArgs.hexCellDoorWidthCm,
        moduleWidthCm,
        toleranceCm: EPS_CM,
      });

    if (!removeHex && shouldBlockHexCellApplyOverDrawers(box)) {
      __wp_toast(args.clickArgs.App, HEX_CELL_WITH_DRAWERS_BLOCKED_MESSAGE, 'error');
      return { changed: false, removedHex: false, appliedHex: false };
    }

    for (const spec of specs) changed = applyBoxDimension(box, spec) || changed;
    changed = clampFreeBoxAboveRoomFloorAfterHeightChange({ box, heightSpec, oldHeightM }) || changed;
    const newDepthM = readDimensionM(box, depthSpec);
    if (oldDepthM != null && newDepthM != null) {
      changed = shiftStoredFreeBoxDividerFronts(box, newDepthM - oldDepthM) || changed;
    }

    if (removeHex) {
      clearHexCellFromConfig(box);
      removedHex = true;
      changed = true;
    } else {
      assignHexCellToConfig(
        box,
        resolveHexCellUpdateConfig({
          cfgMod: box,
          protrusionCm: args.clickArgs.hexCellProtrusionCm,
          doorWidthCm: args.clickArgs.hexCellDoorWidthCm,
          moduleWidthCm: args.clickArgs.applyW ?? readDimensionCm(box, specs[0]) ?? moduleWidthCm,
        })
      );
      appliedHex = true;
      changed = true;
    }
    return { changed, removedHex, appliedHex };
  }

  for (const spec of specs) changed = applyBoxDimension(box, spec) || changed;
  changed = clampFreeBoxAboveRoomFloorAfterHeightChange({ box, heightSpec, oldHeightM }) || changed;
  const newDepthM = readDimensionM(box, depthSpec);
  if (oldDepthM != null && newDepthM != null) {
    changed = shiftStoredFreeBoxDividerFronts(box, newDepthM - oldDepthM) || changed;
  }
  return { changed, removedHex, appliedHex };
}

export function tryHandleCanvasFreeBoxCellDimsClick(args: CanvasFreeBoxCellDimsArgs): boolean {
  if (!isFreeBoxHit(args)) return false;

  const boxId = readHitBoxId(args);
  const moduleKey = resolveModuleKey(args);
  if (!boxId || moduleKey == null) return false;

  const mods = getModulesActions(args.App);
  if (!mods || typeof mods.patchForStack !== 'function') return false;

  let outcome: { changed: boolean; removedHex: boolean; appliedHex: boolean } = {
    changed: false,
    removedHex: false,
    appliedHex: false,
  };
  const source = args.hexCellMode ? 'cellDims.freeBox.hex.apply' : 'cellDims.freeBox.apply';
  mods.patchForStack(
    args.isBottomStack ? 'bottom' : 'top',
    moduleKey,
    (cfg: ModuleConfigLike) => {
      outcome = updateFreeBox({ cfg, boxId, clickArgs: args });
    },
    createCanvasPickingModulesStructuralPatchMeta(source)
  );

  if (!outcome.changed) return true;

  if (outcome.removedHex) emitToast(args.App, 'הקופסא חזרה לתא רגיל');
  else if (outcome.appliedHex) emitToast(args.App, 'הקופסא הוגדרה כתא משושה');
  else emitToast(args.App, 'הוחלו מידות מיוחדות על הקופסא');
  return true;
}
