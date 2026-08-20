import {
  isRemovedFrameSideOn,
  isRoundedFrameSideShelvesOn,
  type RemovableFrameSidePartIdPrefix,
} from '../features/part_identity/api.js';
import { hasRemovedHingedDoorInRange } from './doors_state_utils.js';

import type { UnknownRecord } from '../../../types/index.js';

export type RemovedFrameSideConstructionSide = 'left' | 'right';
export type RemovedFrameSideShelfExposure = RemovedFrameSideConstructionSide | 'both';
export type RemovedFrameSideShelfRounding = RemovedFrameSideShelfExposure;

export type RemovedFrameSideConstructionEdgePlan = Readonly<{
  removed: boolean;
  roundedShelves: boolean;
}>;

export type RemovedFrameSideConstructionPlan = Readonly<{
  frameSidePartIdPrefix: RemovableFrameSidePartIdPrefix;
  left: RemovedFrameSideConstructionEdgePlan;
  right: RemovedFrameSideConstructionEdgePlan;
  hasRemovedSide: boolean;
}>;

export type RemovedFrameSideDoorDisposition =
  'unchanged' | 'fixed-front-closure' | 'respect-explicit-door-removal';

export interface RemovedFrameSideFrontClosurePlan {
  side: RemovedFrameSideShelfExposure;
  partId: string;
  startDoorId: number;
  moduleDoors: number;
}

export type RemovedFrameSideBackPanelPlan = Readonly<{
  partId: 'body_back_left_open' | 'body_back_right_open' | 'body_back_open' | null;
  insetLeftByFrameSide: boolean;
  insetRightByFrameSide: boolean;
}>;

export type RemovedFrameSideModuleConstructionPlan = Readonly<{
  exposedShelfSide: RemovedFrameSideShelfExposure | null;
  roundedShelfSide: RemovedFrameSideShelfRounding | null;
  forceBraceShelves: boolean;
  backPanel: RemovedFrameSideBackPanelPlan;
  doorDisposition: RemovedFrameSideDoorDisposition;
  frontClosure: RemovedFrameSideFrontClosurePlan | null;
}>;

export interface ResolveRemovedFrameSideConstructionPlanArgs {
  cfg?: unknown;
  frameSidePartIdPrefix?: unknown;
}

export interface ResolveRemovedFrameSideModuleConstructionPlanArgs extends ResolveRemovedFrameSideConstructionPlanArgs {
  constructionPlan?: RemovedFrameSideConstructionPlan;
  moduleIndex?: unknown;
  modulesLength?: unknown;
  startDoorId?: unknown;
  moduleDoors?: unknown;
}

function readRecord(value: unknown): UnknownRecord | null {
  return !!value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function normalizeFrameSidePartIdPrefix(value: unknown): RemovableFrameSidePartIdPrefix {
  return value === 'lower_' ? 'lower_' : '';
}

function readRuntimeIndex(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const normalized = Math.trunc(value);
  return normalized >= 0 ? normalized : null;
}

function readPositiveRuntimeInteger(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const normalized = Math.trunc(value);
  return normalized > 0 ? normalized : null;
}

function resolveEdgePlan(
  cfg: unknown,
  side: RemovedFrameSideConstructionSide,
  frameSidePartIdPrefix: RemovableFrameSidePartIdPrefix
): RemovedFrameSideConstructionEdgePlan {
  const removed = isRemovedFrameSideOn(cfg, side, frameSidePartIdPrefix);
  return Object.freeze({
    removed,
    roundedShelves: removed && isRoundedFrameSideShelvesOn(cfg, side, frameSidePartIdPrefix),
  });
}

export function resolveRemovedFrameSideConstructionPlan(
  args: ResolveRemovedFrameSideConstructionPlanArgs
): RemovedFrameSideConstructionPlan {
  const frameSidePartIdPrefix = normalizeFrameSidePartIdPrefix(args.frameSidePartIdPrefix);
  const left = resolveEdgePlan(args.cfg, 'left', frameSidePartIdPrefix);
  const right = resolveEdgePlan(args.cfg, 'right', frameSidePartIdPrefix);
  return Object.freeze({
    frameSidePartIdPrefix,
    left,
    right,
    hasRemovedSide: left.removed || right.removed,
  });
}

function resolveModuleExposure(
  constructionPlan: RemovedFrameSideConstructionPlan,
  moduleIndex: number | null,
  modulesLength: number | null
): RemovedFrameSideShelfExposure | null {
  if (moduleIndex == null || modulesLength == null || moduleIndex >= modulesLength) return null;

  const left = moduleIndex === 0 && constructionPlan.left.removed;
  const right = moduleIndex === modulesLength - 1 && constructionPlan.right.removed;
  if (left && right) return 'both';
  if (left) return 'left';
  if (right) return 'right';
  return null;
}

function resolveRoundedShelfSide(
  constructionPlan: RemovedFrameSideConstructionPlan,
  moduleIndex: number | null,
  modulesLength: number | null
): RemovedFrameSideShelfRounding | null {
  if (moduleIndex == null || modulesLength == null || moduleIndex >= modulesLength) return null;

  const left = moduleIndex === 0 && constructionPlan.left.roundedShelves;
  const right = moduleIndex === modulesLength - 1 && constructionPlan.right.roundedShelves;
  if (left && right) return 'both';
  if (left) return 'left';
  if (right) return 'right';
  return null;
}

function resolveBackPanelPlan(
  exposedSide: RemovedFrameSideShelfExposure | null
): RemovedFrameSideBackPanelPlan {
  if (exposedSide === 'both') {
    return Object.freeze({
      partId: 'body_back_open',
      insetLeftByFrameSide: true,
      insetRightByFrameSide: true,
    });
  }
  if (exposedSide === 'left') {
    return Object.freeze({
      partId: 'body_back_left_open',
      insetLeftByFrameSide: true,
      insetRightByFrameSide: false,
    });
  }
  if (exposedSide === 'right') {
    return Object.freeze({
      partId: 'body_back_right_open',
      insetLeftByFrameSide: false,
      insetRightByFrameSide: true,
    });
  }
  return Object.freeze({
    partId: null,
    insetLeftByFrameSide: false,
    insetRightByFrameSide: false,
  });
}

function resolveFrontClosurePolicy(args: {
  cfg: unknown;
  constructionPlan: RemovedFrameSideConstructionPlan;
  exposedShelfSide: RemovedFrameSideShelfExposure | null;
  startDoorId: number | null;
  moduleDoors: number | null;
}): Pick<RemovedFrameSideModuleConstructionPlan, 'doorDisposition' | 'frontClosure'> {
  const cfg = readRecord(args.cfg);
  if (!args.exposedShelfSide || !cfg || cfg.wardrobeType !== 'hinged') {
    return { doorDisposition: 'unchanged', frontClosure: null };
  }
  if (args.startDoorId == null || args.moduleDoors == null) {
    return { doorDisposition: 'unchanged', frontClosure: null };
  }

  if (
    hasRemovedHingedDoorInRange({
      cfg,
      startDoorId: args.startDoorId,
      moduleDoors: args.moduleDoors,
      frameSidePartIdPrefix: args.constructionPlan.frameSidePartIdPrefix,
    })
  ) {
    return { doorDisposition: 'respect-explicit-door-removal', frontClosure: null };
  }

  return {
    doorDisposition: 'fixed-front-closure',
    frontClosure: Object.freeze({
      side: args.exposedShelfSide,
      partId: `${args.constructionPlan.frameSidePartIdPrefix}body_front_closure_${args.exposedShelfSide}`,
      startDoorId: args.startDoorId,
      moduleDoors: args.moduleDoors,
    }),
  };
}

export function resolveRemovedFrameSideModuleConstructionPlan(
  args: ResolveRemovedFrameSideModuleConstructionPlanArgs
): RemovedFrameSideModuleConstructionPlan {
  const constructionPlan =
    args.constructionPlan ??
    resolveRemovedFrameSideConstructionPlan({
      cfg: args.cfg,
      frameSidePartIdPrefix: args.frameSidePartIdPrefix,
    });
  const moduleIndex = readRuntimeIndex(args.moduleIndex);
  const modulesLength = readPositiveRuntimeInteger(args.modulesLength);
  const exposedShelfSide = resolveModuleExposure(constructionPlan, moduleIndex, modulesLength);
  const roundedShelfSide = resolveRoundedShelfSide(constructionPlan, moduleIndex, modulesLength);
  const front = resolveFrontClosurePolicy({
    cfg: args.cfg,
    constructionPlan,
    exposedShelfSide,
    startDoorId: readPositiveRuntimeInteger(args.startDoorId),
    moduleDoors: readPositiveRuntimeInteger(args.moduleDoors),
  });

  return Object.freeze({
    exposedShelfSide,
    roundedShelfSide,
    forceBraceShelves: exposedShelfSide != null,
    backPanel: resolveBackPanelPlan(exposedShelfSide),
    doorDisposition: front.doorDisposition,
    frontClosure: front.frontClosure,
  });
}

export function resolveRemovedFrameSideOuterBounds(args: {
  constructionPlan: RemovedFrameSideConstructionPlan;
  totalW: number;
  woodThick: number;
}): { left: number; right: number } {
  return {
    left: -args.totalW / 2 + (args.constructionPlan.left.removed ? args.woodThick : 0),
    right: args.totalW / 2 - (args.constructionPlan.right.removed ? args.woodThick : 0),
  };
}
