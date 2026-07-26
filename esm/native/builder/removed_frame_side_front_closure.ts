import { toCanonicalRemovedDoorPartId } from '../../shared/removed_doors_map_keys_shared.js';
import { getExposedShelfSideForRemovedFrameSide } from './removed_frame_side_brace_shelves.js';

import type { UnknownRecord } from '../../../types/index.js';
import type { ModuleLoopRuntime } from './module_loop_pipeline_runtime.js';
import type { ResolvedModuleFrame } from './module_loop_pipeline_module_frame.js';

export type RemovedFrameSideFrontClosureSide = 'left' | 'right' | 'both';

export interface RemovedFrameSideFrontClosurePlan {
  side: RemovedFrameSideFrontClosureSide;
  partId: string;
  startDoorId: number;
  moduleDoors: number;
}

export interface ResolveRemovedFrameSideFrontClosurePlanArgs {
  cfg?: unknown;
  moduleIndex?: unknown;
  modulesLength?: unknown;
  frameSidePartIdPrefix?: unknown;
  startDoorId?: unknown;
  moduleDoors?: unknown;
}

const HINGED_DOOR_PART_ID_RE = /^(lower_)?d(\d+)(?:_(?:full|top|bot|mid\d*))?$/i;

function readRecord(value: unknown): UnknownRecord | null {
  return !!value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function readPositiveRuntimeInteger(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const normalized = Math.trunc(value);
  return normalized > 0 ? normalized : null;
}

function readRuntimeIndex(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const normalized = Math.trunc(value);
  return normalized >= 0 ? normalized : null;
}

function hasRemovedDoorInModuleRange(
  cfg: unknown,
  startDoorId: number,
  moduleDoors: number,
  frameSidePartIdPrefix: unknown
): boolean {
  const removedDoorsMap = readRecord(readRecord(cfg)?.removedDoorsMap);
  if (!removedDoorsMap) return false;

  const endDoorId = startDoorId + moduleDoors - 1;
  const isLowerStack = frameSidePartIdPrefix === 'lower_';
  for (const [rawKey, value] of Object.entries(removedDoorsMap)) {
    if (value !== true) continue;
    const canonicalPartId = toCanonicalRemovedDoorPartId(rawKey);
    const match = HINGED_DOOR_PART_ID_RE.exec(canonicalPartId);
    if (!match) continue;
    if (!isLowerStack && match[1]) continue;
    const doorId = Number(match[2]);
    if (Number.isInteger(doorId) && doorId >= startDoorId && doorId <= endDoorId) return true;
  }
  return false;
}

function resolveClosurePartId(
  side: RemovedFrameSideFrontClosureSide,
  frameSidePartIdPrefix: unknown
): string {
  const prefix = frameSidePartIdPrefix === 'lower_' ? 'lower_' : '';
  return `${prefix}body_front_closure_${side}`;
}

export function resolveRemovedFrameSideFrontClosurePlan(
  args: ResolveRemovedFrameSideFrontClosurePlanArgs
): RemovedFrameSideFrontClosurePlan | null {
  const cfg = readRecord(args.cfg);
  if (!cfg || cfg.wardrobeType !== 'hinged') return null;

  const moduleIndex = readRuntimeIndex(args.moduleIndex);
  const modulesLength = readPositiveRuntimeInteger(args.modulesLength);
  const startDoorId = readPositiveRuntimeInteger(args.startDoorId);
  const moduleDoors = readPositiveRuntimeInteger(args.moduleDoors);
  if (moduleIndex == null || modulesLength == null || startDoorId == null || moduleDoors == null) {
    return null;
  }

  const side = getExposedShelfSideForRemovedFrameSide({
    cfg,
    moduleIndex,
    modulesLength,
    frameSidePartIdPrefix: args.frameSidePartIdPrefix,
  });
  if (!side) return null;

  // Explicit door removal is the user's stronger instruction. The fixed closure only
  // replaces an otherwise intact hinged-door set next to a removed outer frame side.
  if (hasRemovedDoorInModuleRange(cfg, startDoorId, moduleDoors, args.frameSidePartIdPrefix)) {
    return null;
  }

  return {
    side,
    partId: resolveClosurePartId(side, args.frameSidePartIdPrefix),
    startDoorId,
    moduleDoors,
  };
}

function resolveFrontClosureMaterial(runtime: ModuleLoopRuntime, partId: string): unknown {
  const hasSpecificColor =
    runtime.cfg.isMultiColorMode === true &&
    typeof runtime.getPartColorValue === 'function' &&
    !!runtime.getPartColorValue(partId);
  if (!hasSpecificColor) return runtime.bodyMat;
  return runtime.getPartMaterial(partId) || runtime.bodyMat;
}

function requireFinitePositive(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(`[builder/removed_frame_side_front_closure] Invalid ${label}`);
  }
  return value;
}

function requireFinite(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`[builder/removed_frame_side_front_closure] Invalid ${label}`);
  }
  return value;
}

export function renderRemovedFrameSideFrontClosure(args: {
  runtime: ModuleLoopRuntime;
  frame: ResolvedModuleFrame;
  plan: RemovedFrameSideFrontClosurePlan;
}): unknown {
  const { runtime, frame, plan } = args;
  if (!runtime || typeof runtime.createBoard !== 'function') {
    throw new Error('[builder/removed_frame_side_front_closure] createBoard missing');
  }

  const width = requireFinitePositive(frame.modWidth, 'module width');
  const woodThick = requireFinitePositive(runtime.woodThick, 'wood thickness');
  const cabinetBodyHeight = requireFinitePositive(frame.moduleCabinetBodyHeight, 'cabinet body height');
  const height = cabinetBodyHeight - 2 * woodThick;
  if (!(height > 0)) {
    throw new Error('[builder/removed_frame_side_front_closure] Front closure height is not positive');
  }

  const centerX = requireFinite(frame.moduleCenterX, 'module center X');
  const startY = requireFinite(runtime.startY, 'start Y');
  const internalDepth = requireFinitePositive(frame.moduleInternalDepth, 'module internal depth');
  const internalZ = requireFinite(frame.moduleInternalZ, 'module internal Z');
  const closureCenterZ = internalZ + internalDepth / 2 + woodThick / 2;

  return runtime.createBoard(
    width,
    height,
    woodThick,
    centerX,
    startY + cabinetBodyHeight / 2,
    closureCenterZ,
    resolveFrontClosureMaterial(runtime, plan.partId),
    plan.partId
  );
}

export function advanceDoorCounterPastFrontClosure(plan: RemovedFrameSideFrontClosurePlan): number {
  return plan.startDoorId + plan.moduleDoors;
}
