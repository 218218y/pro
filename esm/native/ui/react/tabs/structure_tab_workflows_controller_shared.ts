import type {
  LibraryPresetEnsureArgs,
  LibraryPresetToggleArgs,
} from '../../../features/library_preset/library_preset.js';
import {
  assignSpecialDimsToConfig,
  clearOverrideKeys,
  cloneSpecialDims,
} from '../../../features/special_dims/special_dims.js';
import { resolveAutoWidthForDoors } from '../../../services/api.js';
import type {
  CreateStructureTabWorkflowControllerArgs,
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

function readModuleSpecialDims(config: ModuleConfigLike): UnknownRecord | null {
  return asRecord(asRecord(config)?.specialDims);
}

export function emitStructureWorkflowToast(
  fb: UiFeedbackNamespaceLike | null | undefined,
  message: string,
  kind: StructureWorkflowToastKind
): void {
  if (fb && typeof fb.toast === 'function') fb.toast(message, kind);
}

export function reportStructureWorkflowNonFatal(
  args: CreateStructureTabWorkflowControllerArgs,
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
    const specialDims = readModuleSpecialDims(nextConfig);
    if (specialDims) {
      const nextSpecialDims = cloneSpecialDims(specialDims);
      clearOverrideKeys(nextSpecialDims, [
        'widthCm',
        'baseWidthCm',
        'heightCm',
        'baseHeightCm',
        'depthCm',
        'baseDepthCm',
      ]);
      assignSpecialDimsToConfig(nextConfig, nextSpecialDims);
    }
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
