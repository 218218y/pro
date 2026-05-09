import { readTextMap } from './hinged_doors_shared.js';
import type {
  HingedDoorIterationState,
  HingedDoorModuleOpsContext,
} from './hinged_doors_module_ops_contracts.js';

export function partIdForSegment(
  state: HingedDoorIterationState,
  segCount: number,
  segIndexFromBottom: number
): string {
  if (segCount === 2) return segIndexFromBottom === 0 ? state.botKey : state.topKey;
  if (segCount === 3) {
    return segIndexFromBottom === 0 ? state.botKey : segIndexFromBottom === 1 ? state.midKey : state.topKey;
  }
  if (segIndexFromBottom === 0) return state.botKey;
  if (segIndexFromBottom === segCount - 1) return state.topKey;
  return `d${state.currentDoorId}_mid${segIndexFromBottom}`;
}

export function grooveForPart(
  ctx: HingedDoorModuleOpsContext,
  partId: string,
  defaultValue = false
): boolean {
  try {
    const grooveMap = readTextMap(ctx.cfg && ctx.cfg.groovesMap);
    if (!grooveMap) return !!defaultValue;
    const key = String(partId || '');
    return !!(grooveMap[`groove_${key}`] || grooveMap[key] || defaultValue);
  } catch {
    return !!defaultValue;
  }
}
