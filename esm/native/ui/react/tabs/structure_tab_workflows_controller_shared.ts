import type {
  LibraryPresetEnsureArgs,
  LibraryPresetToggleArgs,
} from '../../../features/library_preset/library_preset.js';
import {
  assignSpecialDimsToConfig,
  clearOverrideKeys,
  cloneSpecialDims,
} from '../../../features/special_dims/index.js';
import { clearHexCellFromConfig } from '../../../features/hex_cell/index.js';
import { resolveAutoWidthForDoors } from '../../../services/api.js';
import type {
  CreateStructureTabWorkflowControllerArgs,
  StructureWorkflowOps,
  StructureWorkflowState,
  StructureWorkflowToastKind,
} from './structure_tab_workflows_controller_contracts.js';
import type { ModuleConfigLike, UnknownRecord, UiFeedbackNamespaceLike } from '../../../../../types';

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

function clearCellDimsFromRecordInPlace(config: UnknownRecord): void {
  const specialDims = asRecord(config.specialDims);
  clearHexCellFromConfig(config);
  if (!specialDims) return;

  const nextSpecialDims = cloneSpecialDims(specialDims);
  clearOverrideKeys(nextSpecialDims, [
    'widthCm',
    'baseWidthCm',
    'heightCm',
    'baseHeightCm',
    'depthCm',
    'baseDepthCm',
  ]);
  assignSpecialDimsToConfig(config, nextSpecialDims);
}

function clearFreeBoxCellDimsOverridesInPlace(config: UnknownRecord): void {
  const extra = asRecord(config.sketchExtras);
  const boxes = Array.isArray(extra?.boxes) ? extra.boxes : [];
  if (!extra || !boxes.length) return;

  let changed = false;
  const nextBoxes = boxes.map(item => {
    const box = asRecord(item);
    if (!box || box.freePlacement !== true) return item;
    const nextBox: UnknownRecord = { ...box };
    clearCellDimsFromRecordInPlace(nextBox);
    changed = true;
    return nextBox;
  });

  if (changed) config.sketchExtras = { ...extra, boxes: nextBoxes };
}

export function emitStructureWorkflowToast(
  fb: UiFeedbackNamespaceLike | null | undefined,
  message: string,
  kind: StructureWorkflowToastKind
): void {
  if (fb && typeof fb.toast === 'function') fb.toast(message, kind);
}

export function reportStructureWorkflowNonFatal(
  args:
    | Pick<CreateStructureTabWorkflowControllerArgs, 'ops'>
    | { ops: Pick<StructureWorkflowOps, 'reportNonFatal'> },
  op: string,
  err: unknown
): void {
  try {
    args.ops.reportNonFatal?.(op, err);
  } catch {
    // ignore reporter errors
  }
}

export function clearStructureCellDimsOverrides(list: ModuleConfigLike[]): ModuleConfigLike[] {
  return list.map((moduleConfig: ModuleConfigLike) => {
    if (!moduleConfig || typeof moduleConfig !== 'object') return moduleConfig;
    const nextConfig: ModuleConfigLike = Object.assign({}, moduleConfig);
    clearCellDimsFromRecordInPlace(nextConfig);
    clearFreeBoxCellDimsOverridesInPlace(nextConfig);
    return nextConfig;
  });
}

export function buildStructureLibraryToggleArgs(state: StructureWorkflowState): LibraryPresetToggleArgs {
  return {
    isLibraryMode: state.isLibraryMode,
    wardrobeType: state.wardrobeType,
    width: state.width,
    height: state.height,
    depth: state.depth,
    doors: state.doors,
    stackSplitEnabled: state.stackSplitEnabled,
    stackSplitLowerHeight: state.stackSplitLowerHeight,
    stackSplitLowerDepth: state.stackSplitLowerDepth,
    stackSplitLowerWidth: state.stackSplitLowerWidth,
    stackSplitLowerDoors: state.stackSplitLowerDoors,
    stackSplitLowerDepthManual: state.stackSplitLowerDepthManual,
    stackSplitLowerWidthManual: state.stackSplitLowerWidthManual,
    stackSplitLowerDoorsManual: state.stackSplitLowerDoorsManual,
    modulesCount: state.modulesCount,
  };
}

export function buildStructureLibraryInvariantArgs(state: StructureWorkflowState): LibraryPresetEnsureArgs {
  return {
    isLibraryMode: state.isLibraryMode,
    wardrobeType: state.wardrobeType,
    doors: state.doors,
    stackSplitLowerDoors: state.stackSplitLowerDoors,
    modulesCount: state.modulesCount,
  };
}

export function computeStructureAutoWidth(wardrobeType: string, doors: number): number {
  return resolveAutoWidthForDoors(wardrobeType, doors);
}
